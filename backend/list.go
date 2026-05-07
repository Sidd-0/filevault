package main

import (
	"encoding/json"
	"log"
	"net/http"
)

// ListFilesHandler lists all files for a user
func ListFilesHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")

	if userID == "" {
		userID = r.Header.Get("X-User-ID")
	}

	if userID == "" {
		http.Error(w, "Missing user_id", http.StatusBadRequest)
		return
	}

	query := `
		SELECT
			f.id,
			f.filename,
			f.blob_hash,
			b.size_bytes,
			f.mime_type,
			f.is_public,
			f.created_at,
			f.download_count,
			b.reference_count
		FROM files f
		INNER JOIN blobs b ON f.blob_hash = b.hash
		WHERE f.user_id = $1
		ORDER BY f.created_at DESC
	`

	rows, err := db.Query(query, userID)
	if err != nil {
		log.Printf("âŒ List files error: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type FileResponse struct {
		ID            int    `json:"id"`
		Filename      string `json:"filename"`
		BlobHash      string `json:"blob_hash"`
		SizeBytes     int64  `json:"size_bytes"`
		MimeType      string `json:"mime_type"`
		IsPublic      bool   `json:"is_public"`
		CreatedAt     string `json:"created_at"`
		DownloadCount int    `json:"download_count"`
		RefCount      int    `json:"ref_count"`
	}

	var files []FileResponse
	for rows.Next() {
		var f FileResponse
		err := rows.Scan(
			&f.ID,
			&f.Filename,
			&f.BlobHash,
			&f.SizeBytes,
			&f.MimeType,
			&f.IsPublic,
			&f.CreatedAt,
			&f.DownloadCount,
			&f.RefCount,
		)
		if err != nil {
			log.Printf("âŒ Scan error: %v", err)
			continue
		}
		files = append(files, f)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
	log.Printf("âœ… Listed %d files for user %s", len(files), userID)
}
