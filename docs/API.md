# File Vault API Documentation

## Base URL
```
http://localhost:8080/api
```

## Authentication
Currently uses `X-User-ID` header for development purposes.

**Production**: Should be replaced with JWT or session-based authentication.

## Common Headers
```
X-User-ID: {user_id}
Content-Type: application/json (for JSON requests)
```

---

## Endpoints

### 1. Health Check
Check if the API is running.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "ok"
}
```

---

### 2. List Users
Get all users in the system (admin only).

**Endpoint**: `GET /api/users`

**Headers**:
```
X-User-ID: admin
```

**Response**:
```json
[
  {
    "id": 1,
    "username": "testuser",
    "storage_quota_bytes": 10485760,
    "storage_used_bytes": 2048000,
    "created_at": "2026-01-01T10:00:00Z"
  }
]
```

---

### 3. Upload Files
Upload one or more files with deduplication.

**Endpoint**: `POST /api/files?user_id={user_id}`

**Headers**:
```
X-User-ID: {user_id}
Content-Type: multipart/form-data
```

**Body** (multipart/form-data):
```
files: <file1>
files: <file2>
...
```

**Example (cURL)**:
```bash
curl -X POST "http://localhost:8080/api/files?user_id=1" \
  -H "X-User-ID: 1" \
  -F "files=@document.pdf" \
  -F "files=@image.png"
```

**Success Response** (200):
```json
[
  {
    "id": 1,
    "filename": "document.pdf",
    "hash": "a1b2c3d4...",
    "size_bytes": 1024000,
    "message": "Upload successful"
  },
  {
    "id": 2,
    "filename": "image.png",
    "hash": "e5f6g7h8...",
    "size_bytes": 512000,
    "message": "Upload successful"
  }
]
```

**Error Responses**:
- `400 Bad Request`: No files provided or user_id missing
- `413 Payload Too Large`: File exceeds size limit
- `507 Insufficient Storage`: User quota exceeded

---

### 4. List Files
Get all files for a specific user.

**Endpoint**: `GET /api/files?user_id={user_id}`

**Headers**:
```
X-User-ID: {user_id}
```

**Example**:
```bash
curl "http://localhost:8080/api/files?user_id=1" \
  -H "X-User-ID: 1"
```

**Response** (200):
```json
[
  {
    "id": 1,
    "filename": "document.pdf",
    "blob_hash": "a1b2c3d4...",
    "size_bytes": 1024000,
    "mime_type": "application/pdf",
    "is_public": false,
    "download_count": 5,
    "created_at": "2026-01-08T10:00:00Z"
  },
  {
    "id": 2,
    "filename": "image.png",
    "blob_hash": "e5f6g7h8...",
    "size_bytes": 512000,
    "mime_type": "image/png",
    "is_public": true,
    "download_count": 12,
    "created_at": "2026-01-08T11:30:00Z"
  }
]
```

---

### 5. Download File
Download a file by ID (increments download counter).

**Endpoint**: `GET /api/files/{fileId}/download`

**Headers**:
```
X-User-ID: {user_id}
```

**Example**:
```bash
curl "http://localhost:8080/api/files/1/download" \
  -H "X-User-ID: 1" \
  -O -J
```

**Response**:
- Binary file content
- Headers:
  - `Content-Type`: MIME type of file
  - `Content-Length`: Size in bytes
  - `Content-Disposition`: `attachment; filename="document.pdf"`

**Error Responses**:
- `404 Not Found`: File doesn't exist or not accessible
- `403 Forbidden`: No permission to download

---

### 6. Get File Info
Get metadata about a file without downloading.

**Endpoint**: `GET /api/files/{fileId}/info`

**Headers**:
```
X-User-ID: {user_id}
```

**Example**:
```bash
curl "http://localhost:8080/api/files/1/info" \
  -H "X-User-ID: 1"
```

**Response** (200):
```json
{
  "id": 1,
  "filename": "document.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 1024000,
  "created_at": "2026-01-08T10:00:00Z",
  "updated_at": "2026-01-08T10:00:00Z",
  "download_count": 5,
  "is_public": false,
  "blob_hash": "a1b2c3d4..."
}
```

---

### 7. Delete File
Delete a file (only owner can delete).

**Endpoint**: `DELETE /api/files/{fileId}`

**Headers**:
```
X-User-ID: {user_id}
```

**Example**:
```bash
curl -X DELETE "http://localhost:8080/api/files/1" \
  -H "X-User-ID: 1"
```

**Response** (200):
```json
{
  "message": "File deleted successfully"
}
```

**Behavior**:
- Deletes file record from database
- Decrements blob reference count
- If reference count reaches 0, deletes physical file

**Error Responses**:
- `404 Not Found`: File doesn't exist
- `403 Forbidden`: Not the owner

---

### 8. Search Files
Search files with multiple filters.

**Endpoint**: `GET /api/search`

**Query Parameters**:
- `user_id` (required): User ID
- `q` (optional): Search query (filename)
- `mime_type` (optional): Filter by MIME type
- `min_size` (optional): Minimum file size in bytes
- `max_size` (optional): Maximum file size in bytes
- `date_from` (optional): Filter from date (YYYY-MM-DD)
- `date_to` (optional): Filter to date (YYYY-MM-DD)

**Example**:
```bash
# Search for PDF files named "report"
curl "http://localhost:8080/api/search?user_id=1&q=report&mime_type=application/pdf" \
  -H "X-User-ID: 1"

# Search files between 1MB and 10MB
curl "http://localhost:8080/api/search?user_id=1&min_size=1048576&max_size=10485760" \
  -H "X-User-ID: 1"

# Search files uploaded in January 2026
curl "http://localhost:8080/api/search?user_id=1&date_from=2026-01-01&date_to=2026-01-31" \
  -H "X-User-ID: 1"
```

**Response** (200):
```json
{
  "files": [
    {
      "id": 1,
      "filename": "report.pdf",
      "blob_hash": "a1b2c3d4...",
      "size_bytes": 2048000,
      "mime_type": "application/pdf",
      "is_public": false,
      "download_count": 3,
      "created_at": "2026-01-05T14:00:00Z"
    }
  ],
  "total": 1
}
```

---

### 9. Share File
Share a file publicly or make it private.

**Endpoint**: `POST /api/files/{fileId}/share`

**Headers**:
```
X-User-ID: {user_id}
Content-Type: application/json
```

**Body**:
```json
{
  "share_type": "public"  // or "private"
}
```

**Example**:
```bash
# Make file public
curl -X POST "http://localhost:8080/api/files/1/share" \
  -H "X-User-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{"share_type":"public"}'

# Make file private
curl -X POST "http://localhost:8080/api/files/1/share" \
  -H "X-User-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{"share_type":"private"}'
```

**Response** (200):
```json
{
  "file_id": "1",
  "share_type": "public",
  "is_public": true,
  "share_link": "a1b2c3d4",
  "message": "File shared as public"
}
```

**Error Responses**:
- `403 Forbidden`: Not the file owner
- `404 Not Found`: File doesn't exist
- `400 Bad Request`: Invalid share_type

---

### 10. List Public Files
Get all publicly shared files.

**Endpoint**: `GET /api/files/public`

**Example**:
```bash
curl "http://localhost:8080/api/files/public"
```

**Response** (200):
```json
[
  {
    "id": 2,
    "filename": "public_document.pdf",
    "size_bytes": 1024000,
    "mime_type": "application/pdf",
    "download_count": 50,
    "created_at": "2026-01-01T10:00:00Z"
  }
]
```

---

### 11. Get User Statistics
Get storage and file statistics for a user.

**Endpoint**: `GET /api/stats`

**Headers**:
```
X-User-ID: {user_id}
```

**Example**:
```bash
curl "http://localhost:8080/api/stats" \
  -H "X-User-ID: 1"
```

**Response** (200):
```json
{
  "user_id": "1",
  "total_files": 15,
  "total_storage_bytes": 5242880,
  "storage_limit_bytes": 10485760,
  "storage_used_percent": 50
}
```

---

### 12. Get Global Statistics
Get global system statistics (admin only).

**Endpoint**: `GET /api/stats/global`

**Headers**:
```
X-User-ID: admin
```

**Example**:
```bash
curl "http://localhost:8080/api/stats/global" \
  -H "X-User-ID: admin"
```

**Response** (200):
```json
{
  "total_users": 50,
  "total_files": 1000,
  "total_storage_used": 524288000
}
```

---

### 13. Admin Statistics
Get comprehensive admin statistics.

**Endpoint**: `GET /api/admin/stats`

**Headers**:
```
X-User-ID: admin
```

**Example**:
```bash
curl "http://localhost:8080/api/admin/stats" \
  -H "X-User-ID: admin"
```

**Response** (200):
```json
{
  "total_users": 50,
  "total_files": 1000,
  "total_storage_bytes": 524288000,
  "unique_blobs": 800,
  "total_downloads": 5000,
  "public_files": 200
}
```

---

### 14. Admin List All Files
List all files in the system with uploader details.

**Endpoint**: `GET /api/admin/files`

**Headers**:
```
X-User-ID: admin
```

**Example**:
```bash
curl "http://localhost:8080/api/admin/files" \
  -H "X-User-ID: admin"
```

**Response** (200):
```json
[
  {
    "id": 1,
    "filename": "document.pdf",
    "uploader_id": "1",
    "uploader_name": "testuser",
    "size_bytes": 1024000,
    "mime_type": "application/pdf",
    "download_count": 5,
    "is_public": false,
    "created_at": "2026-01-08T10:00:00Z"
  }
]
```

---

## Error Codes

### Standard HTTP Status Codes
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: No permission
- `404 Not Found`: Resource not found
- `413 Payload Too Large`: File too big
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `507 Insufficient Storage`: Quota exceeded

### Error Response Format
```json
{
  "error": "Error message here"
}
```

---

## Rate Limiting

### Current Limits
- **2 requests per second** per user
- Applies to all API endpoints

### Headers
Responses include rate limit headers:
```
X-RateLimit-Limit: 2
X-RateLimit-Remaining: 1
```

### Rate Limit Response (429):
```json
{
  "error": "Rate limit exceeded"
}
```

---

## File Deduplication

### How It Works
1. Client uploads file
2. Server calculates SHA-256 hash
3. If hash exists in `blobs` table:
   - Increment reference count
   - Create file record pointing to existing blob
   - Don't save duplicate physical file
4. If hash doesn't exist:
   - Save physical file
   - Create blob record
   - Create file record

### Benefits
- Saves storage space
- Faster uploads for duplicates
- Efficient storage management

---

## MIME Type Validation

### Supported Types
- `text/plain` (.txt)
- `application/pdf` (.pdf)
- `image/jpeg` (.jpg, .jpeg)
- `image/png` (.png)
- `image/gif` (.gif)
- `application/msword` (.doc)
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
- `application/vnd.ms-excel` (.xls)
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (.xlsx)
- `application/zip` (.zip)
- `video/mp4` (.mp4)
- `audio/mpeg` (.mp3)

---

## Examples

### Complete Upload Flow
```bash
# 1. Upload file
RESPONSE=$(curl -s -X POST "http://localhost:8080/api/files?user_id=1" \
  -H "X-User-ID: 1" \
  -F "files=@test.pdf")

# 2. Extract file ID
FILE_ID=$(echo $RESPONSE | jq -r '.[0].id')

# 3. Get file info
curl "http://localhost:8080/api/files/$FILE_ID/info" \
  -H "X-User-ID: 1"

# 4. Share publicly
curl -X POST "http://localhost:8080/api/files/$FILE_ID/share" \
  -H "X-User-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{"share_type":"public"}'

# 5. Download file
curl "http://localhost:8080/api/files/$FILE_ID/download" \
  -H "X-User-ID: 1" \
  -O -J

# 6. Delete file
curl -X DELETE "http://localhost:8080/api/files/$FILE_ID" \
  -H "X-User-ID: 1"
```

---

## Postman Collection

Import this URL in Postman:
```
[Link to postman_collection.json]
```

Or use the collection file in `docs/postman_collection.json`

---

## GraphQL (Future)

This API is currently REST-based. GraphQL implementation is planned for v2.0.

---

## Changelog

### v1.0.0 (2026-01-08)
- Initial release
- File upload/download/delete
- Deduplication with SHA-256
- Public/private sharing
- Advanced search
- User statistics
- Admin panel


