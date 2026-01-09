package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// GetPublicFile serves a public shared file by share link
func GetPublicFile(w http.ResponseWriter, r *http.Request) {
	shareLink := chi.URLParam(r, "shareLink")

	var fileID int
	var fileName string
	var filePath string
	var mimeType string
	var fileSize int64

	err := db.QueryRow(
		`SELECT f.id, f.filename, f.file_path, f.mime_type, f.file_size
		 FROM files f
		 JOIN file_shares fs ON f.id = fs.file_id
		 WHERE fs.share_link = $1 AND fs.share_type = 'public'`,
		shareLink,
	).Scan(&fileID, &fileName, &filePath, &mimeType, &fileSize)

	if err != nil {
		log.Printf("âŒ Public file not found: %v", err)
		http.Error(w, "File not found or not public", http.StatusNotFound)
		return
	}

	// Update download count
	_, err = db.Exec(
		`UPDATE file_shares SET download_count = download_count + 1 
		 WHERE file_id = $1 AND share_type = 'public'`,
		fileID,
	)

	// Log the access
	_, err = db.Exec(
		`INSERT INTO audit_logs (user_id, file_id, action, details)
		 VALUES ($1, $2, 'public_download', jsonb_build_object('ip', $3, 'share_link', $4))`,
		"public", fileID, r.RemoteAddr, shareLink,
	)

	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", fileSize))
	w.Header().Set(
		"Content-Disposition",
		fmt.Sprintf("attachment; filename=\"%s\"", fileName),
	)

	http.ServeFile(w, r, filePath)
	log.Printf("âœ… Public file downloaded: %s via link %s", fileName, shareLink)
}
