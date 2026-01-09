// search.go - Advanced search with multiple filters
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
)

// File struct - matches database schema
type File struct {
	ID            int    `json:"id"`
	Filename      string `json:"filename"`
	BlobHash      string `json:"blob_hash"`
	SizeBytes     int64  `json:"size_bytes"`
	MimeType      string `json:"mime_type"`
	IsPublic      bool   `json:"is_public"`
	CreatedAt     string `json:"created_at"`
	DownloadCount int    `json:"download_count"`
}

type SearchResponse struct {
	Files []File `json:"files"`
	Total int    `json:"total"`
}



func SearchFilesHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "user_id required", http.StatusBadRequest)
		return
	}

	query := r.URL.Query().Get("q")
	mimeType := r.URL.Query().Get("mime_type")
	minSize := r.URL.Query().Get("min_size")
	maxSize := r.URL.Query().Get("max_size")
	dateFrom := r.URL.Query().Get("date_from")
	dateTo := r.URL.Query().Get("date_to")

	sqlQuery := `
        SELECT f.id, f.filename, f.blob_hash, f.size_bytes, f.mime_type, 
               f.is_public, f.created_at, f.download_count
        FROM files f
        WHERE f.user_id = $1
    `

	args := []interface{}{userID}
	argCount := 1

	if query != "" {
		argCount++
		sqlQuery += " AND f.filename ILIKE $" + strconv.Itoa(argCount)
		args = append(args, "%"+query+"%")
	}

	if mimeType != "" {
		argCount++
		sqlQuery += " AND f.mime_type = $" + strconv.Itoa(argCount)
		args = append(args, mimeType)
	}

	if minSize != "" {
		if size, err := strconv.ParseInt(minSize, 10, 64); err == nil {
			argCount++
			sqlQuery += " AND f.size_bytes >= $" + strconv.Itoa(argCount)
			args = append(args, size)
		}
	}

	if maxSize != "" {
		if size, err := strconv.ParseInt(maxSize, 10, 64); err == nil {
			argCount++
			sqlQuery += " AND f.size_bytes <= $" + strconv.Itoa(argCount)
			args = append(args, size)
		}
	}

	if dateFrom != "" {
		argCount++
		sqlQuery += " AND f.created_at >= $" + strconv.Itoa(argCount)
		args = append(args, dateFrom)
	}

	if dateTo != "" {
		argCount++
		sqlQuery += " AND f.created_at <= $" + strconv.Itoa(argCount)
		args = append(args, dateTo+" 23:59:59")
	}

	sqlQuery += " ORDER BY f.created_at DESC"

	rows, err := db.Query(sqlQuery, args...)
	if err != nil {
		log.Printf("âŒ Search error: %v", err)
		http.Error(w, "Search failed", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var files []File  // â† FIXED
	for rows.Next() {
		var f File  // â† FIXED
		err := rows.Scan(&f.ID, &f.Filename, &f.BlobHash, &f.SizeBytes,
			&f.MimeType, &f.IsPublic, &f.CreatedAt, &f.DownloadCount)
		if err != nil {
			log.Printf("âŒ Row scan error: %v", err)
			continue
		}
		files = append(files, f)
	}

	response := SearchResponse{
		Files: files,
		Total: len(files),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	log.Printf("âœ… Search completed: %d results", len(files))
}
