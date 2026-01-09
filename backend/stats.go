package main

import (
	"encoding/json"
	"log"
	"net/http"
)

// GetUserStorageStats returns accurate storage statistics
func GetUserStorageStats(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")

	var stats struct {
		UserID             string `json:"user_id"`
		TotalFiles         int    `json:"total_files"`
		TotalStorageBytes  int64  `json:"total_storage_bytes"`
		StorageLimitBytes  int64  `json:"storage_limit_bytes"`
		StorageUsedPercent int    `json:"storage_used_percent"`
	}

	stats.UserID = userID

	// 1. Count files
	err := db.QueryRow(
		`SELECT COUNT(*) FROM files WHERE user_id = $1`,
		userID,
	).Scan(&stats.TotalFiles)

	if err != nil {
		log.Printf("âŒ Count error: %v", err)
	}

	// 2. Calculate storage - FIXED QUERY
	err = db.QueryRow(
		`SELECT COALESCE(SUM(DISTINCT b.size_bytes), 0)
		 FROM files f
		 INNER JOIN blobs b ON f.blob_hash = b.hash
		 WHERE f.user_id = $1`,
		userID,
	).Scan(&stats.TotalStorageBytes)

	if err != nil {
		log.Printf("âŒ Storage calc error: %v", err)
		stats.TotalStorageBytes = 0
	}

	// 3. Get quota
	err = db.QueryRow(
		`SELECT storage_quota_bytes FROM users WHERE id = $1`,
		userID,
	).Scan(&stats.StorageLimitBytes)

	if err != nil {
		stats.StorageLimitBytes = 10 * 1024 * 1024
	}

	// 4. Calculate percentage
	if stats.StorageLimitBytes > 0 {
		stats.StorageUsedPercent = int((stats.TotalStorageBytes * 100) / stats.StorageLimitBytes)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)

	log.Printf("âœ… Stats: %d files, %d bytes (%.2f MB), %d%% used",
		stats.TotalFiles,
		stats.TotalStorageBytes,
		float64(stats.TotalStorageBytes)/(1024*1024),
		stats.StorageUsedPercent)
}
// GetGlobalStats returns global statistics across all users
func GetGlobalStats(w http.ResponseWriter, r *http.Request) {
	var stats struct {
		TotalUsers       int   `json:"total_users"`
		TotalFiles       int   `json:"total_files"`
		TotalStorageUsed int64 `json:"total_storage_used"`
	}

	// Count users
	_ = db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&stats.TotalUsers)

	// Count files
	_ = db.QueryRow(`SELECT COUNT(*) FROM files`).Scan(&stats.TotalFiles)

	// Sum all storage
	_ = db.QueryRow(`SELECT COALESCE(SUM(size_bytes), 0) FROM blobs`).Scan(&stats.TotalStorageUsed)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)

	log.Printf("âœ… Global stats: %d users, %d files, %d bytes",
		stats.TotalUsers, stats.TotalFiles, stats.TotalStorageUsed)
}
