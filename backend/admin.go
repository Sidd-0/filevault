// admin.go - Admin panel endpoints
package main

import (
	"encoding/json"
	"log"
	"net/http"
)

type AdminStatsResponse struct {
	TotalUsers       int   `json:"total_users"`
	TotalFiles       int   `json:"total_files"`
	TotalStorage     int64 `json:"total_storage_bytes"`
	UniqueBlobs      int   `json:"unique_blobs"`
	TotalDownloads   int   `json:"total_downloads"`
	PublicFiles      int   `json:"public_files"`
}

type AdminFileListResponse struct {
	ID            int    `json:"id"`
	Filename      string `json:"filename"`
	UploaderID    string `json:"uploader_id"`
	UploaderName  string `json:"uploader_name"`
	SizeBytes     int64  `json:"size_bytes"`
	MimeType      string `json:"mime_type"`
	DownloadCount int    `json:"download_count"`
	IsPublic      bool   `json:"is_public"`
	CreatedAt     string `json:"created_at"`
}

// AdminStatsHandler - GET /api/admin/stats
func AdminStatsHandler(w http.ResponseWriter, r *http.Request) {
	// Check if user is admin (simplified - check X-User-ID = "admin")
	if r.Header.Get("X-User-ID") != "admin" {
		http.Error(w, "Unauthorized: Admin only", http.StatusForbidden)
		return
	}

	var stats AdminStatsResponse

	// Total users
	db.QueryRow("SELECT COUNT(*) FROM users").Scan(&stats.TotalUsers)

	// Total files
	db.QueryRow("SELECT COUNT(*) FROM files").Scan(&stats.TotalFiles)

	// Total storage (deduplicated)
	db.QueryRow("SELECT COALESCE(SUM(size_bytes), 0) FROM blobs").Scan(&stats.TotalStorage)

	// Unique blobs
	db.QueryRow("SELECT COUNT(*) FROM blobs").Scan(&stats.UniqueBlobs)

	// Total downloads
	db.QueryRow("SELECT COALESCE(SUM(download_count), 0) FROM files").Scan(&stats.TotalDownloads)

	// Public files
	db.QueryRow("SELECT COUNT(*) FROM files WHERE is_public = true").Scan(&stats.PublicFiles)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
	log.Printf("âœ… Admin stats retrieved")
}

// AdminListFilesHandler - GET /api/admin/files
func AdminListFilesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("X-User-ID") != "admin" {
		http.Error(w, "Unauthorized: Admin only", http.StatusForbidden)
		return
	}

	rows, err := db.Query(`
        SELECT f.id, f.filename, f.user_id, u.username, f.size_bytes, 
               f.mime_type, f.download_count, f.is_public, f.created_at
        FROM files f
        JOIN users u ON f.user_id = u.id
        ORDER BY f.created_at DESC
        LIMIT 100
    `)

	if err != nil {
		log.Printf("âŒ Admin list error: %v", err)
		http.Error(w, "Failed to list files", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var files []AdminFileListResponse
	for rows.Next() {
		var f AdminFileListResponse
		err := rows.Scan(&f.ID, &f.Filename, &f.UploaderID, &f.UploaderName,
			&f.SizeBytes, &f.MimeType, &f.DownloadCount,
			&f.IsPublic, &f.CreatedAt)
		if err != nil {
			continue
		}
		files = append(files, f)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
	log.Printf("âœ… Admin listed %d files", len(files))
}

