package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/go-chi/chi/v5"
)

// DeleteFileHandler - DELETE /api/files/{fileID}
func DeleteFileHandler(w http.ResponseWriter, r *http.Request) {
	// Step 1: Get file ID from URL
	fileIDStr := chi.URLParam(r, "fileID")
	fileID, err := strconv.Atoi(fileIDStr)
	if err != nil {
		http.Error(w, "Invalid file ID", http.StatusBadRequest)
		return
	}

	// Step 2: Get the file record to find blob hash
	var blobHash string
	var userID int
	err = db.QueryRow(`
		SELECT blob_hash, user_id FROM files WHERE id = $1
	`, fileID).Scan(&blobHash, &userID)

	if err == sql.ErrNoRows {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Println("Database error:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Step 3: Delete file record
	_, err = db.Exec("DELETE FROM files WHERE id = $1", fileID)
	if err != nil {
		log.Println("Error deleting file record:", err)
		http.Error(w, "Error deleting file", http.StatusInternalServerError)
		return
	}

	// Step 4: Decrement blob reference count
	_, err = db.Exec(`
		UPDATE blobs 
		SET reference_count = reference_count - 1 
		WHERE hash = $1
	`, blobHash)
	if err != nil {
		log.Println("Error updating blob:", err)
		http.Error(w, "Error updating blob", http.StatusInternalServerError)
		return
	}

	// Step 5: Check if blob reference count is now 0
	var refCount int
	err = db.QueryRow(`
		SELECT reference_count FROM blobs WHERE hash = $1
	`, blobHash).Scan(&refCount)

	if err != nil {
		log.Println("Error checking ref count:", err)
	}

	// Step 6: If reference count is 0, delete blob record and file from disk
	if refCount == 0 {
		// Delete blob record
		_, err = db.Exec("DELETE FROM blobs WHERE hash = $1", blobHash)
		if err != nil {
			log.Println("Error deleting blob record:", err)
		}

		// Delete physical file
		filePath := fmt.Sprintf("uploads/%s", blobHash)
		err = os.Remove(filePath)
		if err != nil {
			log.Println("Error deleting physical file:", err)
		} else {
			log.Printf("âœ… Deleted physical file: %s\n", blobHash[:16])
		}

		log.Printf("âœ… Deleted file ID %d (last reference, blob deleted)\n", fileID)
	} else {
		log.Printf("âœ… Deleted file ID %d (blob still has %d references)\n", fileID, refCount)
	}

	// Audit log
	_, _ = db.Exec(
		`INSERT INTO audit_logs (user_id, file_id, action, details, ip_address)
		 VALUES ($1, $2, 'delete', jsonb_build_object('blob_hash', $3::text, 'remaining_refs', $4::int), $5)`,
		userID, fileID, blobHash, refCount, r.RemoteAddr,
	)

	// Step 7: Return success
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprint(w, `{"message":"File deleted successfully"}`)
}

