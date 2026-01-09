package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// GetFileInfo returns detailed information about a file
func GetFileInfo(w http.ResponseWriter, r *http.Request) {
	fileID := chi.URLParam(r, "fileId")
	userID := r.Header.Get("X-User-ID")

	var fileInfo struct {
		ID            int    `json:"id"`
		Filename      string `json:"filename"`
		MimeType      string `json:"mime_type"`
		SizeBytes     int64  `json:"size_bytes"`
		CreatedAt     string `json:"created_at"`
		UpdatedAt     string `json:"updated_at"`
		DownloadCount int    `json:"download_count"`
		IsPublic      bool   `json:"is_public"`
		BlobHash      string `json:"blob_hash"`
	}

	// Get file info and blob size
	err := db.QueryRow(
		`SELECT f.id, f.filename, f.mime_type, b.size_bytes, 
		        f.created_at, f.updated_at, f.download_count, f.is_public, f.blob_hash
		 FROM files f
		 INNER JOIN blobs b ON f.blob_hash = b.hash
		 WHERE f.id = $1`,
		fileID,
	).Scan(&fileInfo.ID, &fileInfo.Filename, &fileInfo.MimeType, &fileInfo.SizeBytes,
		&fileInfo.CreatedAt, &fileInfo.UpdatedAt, &fileInfo.DownloadCount,
		&fileInfo.IsPublic, &fileInfo.BlobHash)

	if err != nil {
		log.Printf("âŒ File info error: %v", err)
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// Check permissions
	var isOwner bool
	_ = db.QueryRow(
		`SELECT EXISTS(SELECT 1 FROM files WHERE id = $1 AND user_id = $2)`,
		fileID, userID,
	).Scan(&isOwner)

	if !isOwner && !fileInfo.IsPublic {
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(fileInfo)

	log.Printf("âœ… File info retrieved: %s", fileInfo.Filename)
}

