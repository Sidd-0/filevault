// share.go - FIXED version
package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type ShareRequest struct {
	ShareType string `json:"share_type"`
}

func ShareFile(w http.ResponseWriter, r *http.Request) {
	fileID := chi.URLParam(r, "fileId")
	userID := r.Header.Get("X-User-ID")

	var ownerID string
	err := db.QueryRow(
		`SELECT user_id FROM files WHERE id = $1`,
		fileID,
	).Scan(&ownerID)

	if err != nil {
		log.Printf("âŒ File not found: %v", err)
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	if ownerID != userID {
		http.Error(w, "Unauthorized: Only file owner can share", http.StatusForbidden)
		return
	}

	var req ShareRequest
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ShareType != "public" && req.ShareType != "private" {
		http.Error(w, "Invalid share_type", http.StatusBadRequest)
		return
	}

	// Generate share_link only for public, NULL for private
	var shareLink sql.NullString  // â† Use sql.NullString
	if req.ShareType == "public" {
		shareLink = sql.NullString{String: uuid.New().String()[:8], Valid: true}
	} else {
		shareLink = sql.NullString{Valid: false}  // â† NULL for private
	}

	_, err = db.Exec(
		`INSERT INTO file_shares (file_id, user_id, share_type, share_link)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (file_id, share_type) DO UPDATE
        SET share_link = $4, updated_at = CURRENT_TIMESTAMP`,
		fileID, userID, req.ShareType, shareLink,
	)

	if err != nil {
		log.Printf("âŒ Error sharing file: %v", err)
		http.Error(w, "Failed to share file", http.StatusInternalServerError)
		return
	}

	isPublic := req.ShareType == "public"
	_, err = db.Exec(
		`UPDATE files SET is_public = $1 WHERE id = $2`,
		isPublic, fileID,
	)

	_, err = db.Exec(
		`INSERT INTO audit_logs (user_id, file_id, action, details)
        VALUES ($1, $2, 'share', jsonb_build_object('share_type', $3))`,
		userID, fileID, req.ShareType,
	)

	// Return share_link only if public
	shareLinkStr := ""
	if shareLink.Valid {
		shareLinkStr = shareLink.String
	}

	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{
       "file_id": "%s",
       "share_type": "%s",
       "is_public": %v,
       "share_link": "%s",
       "message": "File shared as %s"
    }`, fileID, req.ShareType, isPublic, shareLinkStr, req.ShareType)

	log.Printf("âœ… File %s shared as %s", fileID, req.ShareType)
}
// share.go - ADD at the end (after ShareFile function):

func ListPublicFiles(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(
		`SELECT f.id, f.filename, f.size_bytes, f.mime_type, f.download_count, f.created_at
        FROM files f
        WHERE f.is_public = true
        ORDER BY f.created_at DESC`,
	)

	if err != nil {
		log.Printf("âŒ Error listing public files: %v", err)
		http.Error(w, "Failed to fetch files", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var files []map[string]interface{}
	for rows.Next() {
		var id int
		var name, mimeType, createdAt string
		var size int64
		var downloads int

		err := rows.Scan(&id, &name, &size, &mimeType, &downloads, &createdAt)
		if err != nil {
			continue
		}

		files = append(files, map[string]interface{}{
			"id":             id,
			"filename":       name,
			"size_bytes":     size,
			"mime_type":      mimeType,
			"download_count": downloads,
			"created_at":     createdAt,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
	log.Printf("âœ… Listed %d public files", len(files))
}
