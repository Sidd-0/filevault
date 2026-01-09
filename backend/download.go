package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
)

// DownloadFile serves a file for download and increments counter
func DownloadFile(w http.ResponseWriter, r *http.Request) {
	fileID := chi.URLParam(r, "fileId")
	userID := r.Header.Get("X-User-ID")

	log.Printf("ðŸ”» Download attempt: fileID=%s, userID=%s", fileID, userID)

	// Step 1: Get file metadata
	var fileName string
	var blobHash string
	var mimeType string

	err := db.QueryRow(
		`SELECT filename, blob_hash, mime_type FROM files WHERE id = $1`,
		fileID,
	).Scan(&fileName, &blobHash, &mimeType)

	if err != nil {
		log.Printf("âŒ File not found: %v", err)
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// Step 2: Get blob info
	var fileSize int64
	var storagePath string

	err = db.QueryRow(
		`SELECT size_bytes, storage_path FROM blobs WHERE hash = $1`,
		blobHash,
	).Scan(&fileSize, &storagePath)

	if err != nil {
		log.Printf("âŒ Blob not found: %v", err)
		http.Error(w, "File content not found", http.StatusNotFound)
		return
	}

	// Step 3: Build file path
	var fullPath string
	if strings.HasPrefix(storagePath, "uploads/") {
		fullPath = storagePath
	} else {
		fullPath = filepath.Join("uploads", blobHash)
	}

	// Step 4: Check file exists
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		log.Printf("âŒ File not on disk: %s", fullPath)
		http.Error(w, "File not found on disk", http.StatusNotFound)
		return
	}

	// Step 5: INCREMENT COUNTER FIRST (BEFORE serving)
	result, err := db.Exec(
		`UPDATE files SET download_count = download_count + 1 WHERE id = $1`,
		fileID,
	)

	if err != nil {
		log.Printf("âŒ UPDATE ERROR: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("âŒ Error getting rows affected: %v", err)
	}

	if rowsAffected > 0 {
		log.Printf("âœ… DOWNLOAD COUNT INCREMENTED (rows affected: %d)", rowsAffected)
	} else {
		log.Printf("âš ï¸ No rows updated - file ID might be invalid")
	}

	// Step 6: Set response headers
	safeFileName := sanitizeFilename(fileName)
	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", fileSize))
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, safeFileName))

	// Step 7: Serve file
	http.ServeFile(w, r, fullPath)
	log.Printf("âœ… FILE SERVED: %s (%d bytes)", fileName, fileSize)
}

func sanitizeFilename(filename string) string {
	replacer := strings.NewReplacer(
		"\"", "",
		"\\", "",
		";", "",
	)
	return replacer.Replace(filename)
}
