package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/rs/cors"
)

var db *sql.DB

func main() {
	// Get database URL from environment or use default
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://admin:password123@localhost:5432/filevault?sslmode=disable"
		log.Println("⚠️  Using default database URL")
	}

	// Connect to database
	var err error
	db, err = sql.Open("pgx", dsn)
	if err != nil {
		log.Fatal("❌ Failed to connect to database:", err)
	}
	defer db.Close()

	// Test connection
	if err := db.Ping(); err != nil {
		log.Fatal("❌ Failed to ping database:", err)
	}
	log.Println("✅ Connected to PostgreSQL")

	// Create uploads directory
	if err := os.MkdirAll("uploads", 0755); err != nil {
		log.Fatal("❌ Failed to create uploads directory:", err)
	}

	// Setup router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS configuration
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "DELETE", "PUT", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "X-User-ID"},
		ExposedHeaders:   []string{"Content-Disposition", "Content-Type"},
		AllowCredentials: false,
	})
	r.Use(corsHandler.Handler)

	// Routes
	r.Get("/health", healthHandler)
	r.Get("/api/users", listUsersHandler)
	r.Post("/api/files", UploadFilesHandler)
	r.Get("/api/files", ListFilesHandler)
	r.Delete("/api/files/{fileID}", DeleteFileHandler)
	r.Get("/api/files/{fileId}/download", DownloadFile)
	r.Get("/api/files/{fileId}/info", GetFileInfo)
	r.Post("/api/files/{fileId}/share", ShareFile)
	r.Get("/api/files/public", ListPublicFiles)
	r.Get("/api/search", SearchFilesHandler)
	r.Get("/api/stats", GetUserStorageStats)
	r.Get("/api/stats/global", GetGlobalStats)
	r.Get("/api/admin/stats", AdminStatsHandler)
	r.Get("/api/admin/files", AdminListFilesHandler)

	// Server configuration
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := ":" + port

	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		log.Printf("✅ Server running on http://localhost%s\n", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("❌ Server error:", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("🛑 Shutting down server...")
	srv.Close()
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func listUsersHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`
		SELECT id, username, email, storage_quota_bytes, storage_used_bytes, created_at 
		FROM users
	`)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type User struct {
		ID                int64   `json:"id"`
		Username          string  `json:"username"`
		Email             *string `json:"email"`
		StorageQuotaBytes int64   `json:"storage_quota_bytes"`
		StorageUsedBytes  int64   `json:"storage_used_bytes"`
		CreatedAt         string  `json:"created_at"`
	}

	var users []User
	for rows.Next() {
		var u User
		rows.Scan(&u.ID, &u.Username, &u.Email, &u.StorageQuotaBytes, &u.StorageUsedBytes, &u.CreatedAt)
		users = append(users, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}
