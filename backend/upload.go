package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// UploadResponse - What we send back after upload
type UploadResponse struct {
	ID           int    `json:"id"`
	Filename     string `json:"filename"`
	Hash         string `json:"hash"`
	Size         int64  `json:"size_bytes"`
	Deduplicated bool   `json:"deduplicated"`
	BytesSaved   int64  `json:"bytes_saved"`
	Message      string `json:"message"`
}

// UploadFilesHandler - POST /api/files
func UploadFilesHandler(w http.ResponseWriter, r *http.Request) {
	// Step 1: Get user ID from query parameter
	userIDStr := r.URL.Query().Get("user_id")
	if userIDStr == "" {
		http.Error(w, "user_id required", http.StatusBadRequest)
		return
	}
	userID, _ := strconv.Atoi(userIDStr)

	// Step 2: Parse multipart form (max 100MB)
	r.ParseMultipartForm(100 << 20)

	// Step 3: Get all files from form
	files := r.MultipartForm.File["files"]
	if len(files) == 0 {
		http.Error(w, "No files provided", http.StatusBadRequest)
		return
	}

	var results []UploadResponse

	// Step 4: Process each file
	for _, fileHeader := range files {
		// Open the uploaded file
		file, err := fileHeader.Open()
		if err != nil {
			log.Println("Error opening file:", err)
			continue
		}
		defer file.Close()

		// Step 5: Calculate SHA-256 hash of the file
		hash, fileSize, err := calculateFileHash(file)
		if err != nil {
			log.Println("Error calculating hash:", err)
			continue
		}

		// Step 6: Validate MIME type
		if !validateMIME(fileHeader.Filename, fileHeader.Header.Get("Content-Type")) {
			log.Printf("âŒ MIME mismatch: %s declared as %s", fileHeader.Filename, fileHeader.Header.Get("Content-Type"))
			continue // Skip this file
		}
		// Step 6: Reset file pointer to beginning (we just read it for hashing)
		file.Seek(0, 0)

		// Step 7: Check if blob already exists
		blobExists := checkBlobExists(hash)

		if !blobExists {
			// NEW FILE - save to disk
			savedSize, err := saveFileToDisk(file, hash)
			if err != nil {
				log.Println("Error saving file:", err)
				continue
			}

			// Insert into blobs table
			_, err = db.Exec(
				"INSERT INTO blobs (hash, size_bytes, storage_path, reference_count) VALUES ($1, $2, $3, 1)",
				hash, savedSize, fmt.Sprintf("uploads/%s", hash),
			)
			if err != nil {
				log.Println("Error inserting blob:", err)
				continue
			}
			log.Printf("âœ… Saved new blob: %s (%d bytes)\n", hash[:16], savedSize)

		} else {
			// DUPLICATE FILE - increment reference count
			_, err = db.Exec(
				"UPDATE blobs SET reference_count = reference_count + 1 WHERE hash = $1",
				hash,
			)
			if err != nil {
				log.Println("Error updating blob:", err)
				continue
			}
			log.Printf("âœ… Found duplicate blob: %s, incremented ref count\n", hash[:16])
		}

		// Step 8: Insert into files table (user's file reference)
		var fileID int
		err = db.QueryRow(
			"INSERT INTO files (user_id, blob_hash, filename, mime_type,size_bytes) VALUES ($1, $2, $3, $4,$5) RETURNING id",
			userID, hash, fileHeader.Filename, fileHeader.Header.Get("Content-Type"), fileSize,
		).Scan(&fileID)
		if err != nil {
			log.Println("Error inserting file:", err)
			continue
		}

		// Step 9: Add to results, with dedup info so the frontend can surface it
		var bytesSaved int64
		if blobExists {
			bytesSaved = fileSize
		}
		results = append(results, UploadResponse{
			ID:           fileID,
			Filename:     fileHeader.Filename,
			Hash:         hash,
			Size:         fileSize,
			Deduplicated: blobExists,
			BytesSaved:   bytesSaved,
			Message:      "Upload successful",
		})

		// Step 10: Audit log — fire and forget; failures here shouldn't fail the upload.
		_, _ = db.Exec(
			`INSERT INTO audit_logs (user_id, file_id, action, details, ip_address)
			 VALUES ($1, $2, 'upload', jsonb_build_object('filename', $3::text, 'size_bytes', $4::bigint, 'deduplicated', $5::boolean), $6)`,
			userID, fileID, fileHeader.Filename, fileSize, blobExists, r.RemoteAddr,
		)
	}

	// Step 10: Return results as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

// calculateFileHash - Read file and calculate SHA-256 hash
func calculateFileHash(file io.Reader) (string, int64, error) {
	hasher := sha256.New()
	size, err := io.Copy(hasher, file)
	if err != nil {
		return "", 0, err
	}
	hashBytes := hasher.Sum(nil)
	hashString := hex.EncodeToString(hashBytes)
	return hashString, size, nil
}

// checkBlobExists - Check if blob with this hash already exists
func checkBlobExists(hash string) bool {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM blobs WHERE hash = $1)", hash).Scan(&exists)
	if err != nil {
		log.Println("Error checking blob:", err)
		return false
	}
	return exists
}

// saveFileToDisk - Save file to disk and return size
func saveFileToDisk(src io.Reader, hash string) (int64, error) {
	// Create uploads directory if it doesn't exist
	os.MkdirAll("uploads", 0755)

	// Create destination file
	dst, err := os.Create(filepath.Join("uploads", hash))
	if err != nil {
		return 0, err
	}
	defer dst.Close()

	// Copy from source to destination, counting bytes
	size, err := io.Copy(dst, src)
	return size, err
}

// validateMIME checks if file extension matches declared MIME type
func validateMIME(filename, declaredMIME string) bool {
	ext := strings.ToLower(filepath.Ext(filename))

	// Map of valid MIME types per extension
	validMIMEs := map[string][]string{
		".txt":  {"text/plain"},
		".pdf":  {"application/pdf"},
		".jpg":  {"image/jpeg"},
		".jpeg": {"image/jpeg"},
		".png":  {"image/png"},
		".gif":  {"image/gif"},
		".doc":  {"application/msword"},
		".docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
		".xls":  {"application/vnd.ms-excel"},
		".xlsx": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
		".zip":  {"application/zip"},
		".mp4":  {"video/mp4"},
		".mp3":  {"audio/mpeg"},
	}

	allowedTypes, exists := validMIMEs[ext]
	if !exists {
		return true // Allow unknown extensions
	}

	for _, validType := range allowedTypes {
		if declaredMIME == validType {
			return true
		}
	}

	return false
}
