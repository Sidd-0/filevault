package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
)

// AuditLogEntry is one row of the user-visible activity feed.
type AuditLogEntry struct {
	ID        int             `json:"id"`
	Action    string          `json:"action"`
	FileID    sql.NullInt64   `json:"-"`
	Filename  sql.NullString  `json:"-"`
	Details   json.RawMessage `json:"details"`
	CreatedAt string          `json:"created_at"`

	// Flat-projected fields the frontend renders directly.
	FileIDOut   *int64  `json:"file_id,omitempty"`
	FilenameOut *string `json:"filename,omitempty"`
}

// ListAuditLogs - GET /api/audit?user_id=<id>&limit=20
// Returns the most recent activity for a user joined to filenames where available.
func ListAuditLogs(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		userID = r.Header.Get("X-User-ID")
	}
	if userID == "" {
		http.Error(w, "user_id required", http.StatusBadRequest)
		return
	}

	limit := 20
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	rows, err := db.Query(
		`SELECT a.id, a.action, a.file_id, f.filename, a.details, a.created_at
		 FROM audit_logs a
		 LEFT JOIN files f ON f.id = a.file_id
		 WHERE a.user_id = $1
		 ORDER BY a.created_at DESC
		 LIMIT $2`,
		userID, limit,
	)
	if err != nil {
		log.Printf("audit list error: %v", err)
		http.Error(w, "Failed to load activity", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	out := make([]AuditLogEntry, 0, limit)
	for rows.Next() {
		var e AuditLogEntry
		var details []byte
		if err := rows.Scan(&e.ID, &e.Action, &e.FileID, &e.Filename, &details, &e.CreatedAt); err != nil {
			log.Printf("audit scan error: %v", err)
			continue
		}
		if len(details) > 0 {
			e.Details = json.RawMessage(details)
		} else {
			e.Details = json.RawMessage("null")
		}
		if e.FileID.Valid {
			v := e.FileID.Int64
			e.FileIDOut = &v
		}
		if e.Filename.Valid {
			v := e.Filename.String
			e.FilenameOut = &v
		}
		out = append(out, e)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}
