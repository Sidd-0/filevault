## 🗄️ FileVault

**Secure file storage system with deduplication and advanced features**

A full-stack web application for secure file storage, built with Go (backend), React (frontend), and PostgreSQL (database). Features include file deduplication, advanced search, real-time updates, and public/private file sharing.

## 🌐 Live Deployment

- **Frontend**: [https://filevault.up.railway.app/](https://filevault.up.railway.app/)
- **Backend API**: [https://filevault-production-a0df.up.railway.app/](https://filevault-production-a0df.up.railway.app/)
- **Database**: PostgreSQL (Railway)

## ✨ Features

### Core Functionality
- 📤 **File Upload & Download** - Drag-and-drop interface with progress tracking
- 🔍 **Advanced Search** - Search by filename, file type, size, and date range
- 👁️ **File Preview** - In-browser preview for images, PDFs, and text files
- 🔒 **Privacy Controls** - Toggle files between public and private
- 📊 **Storage Analytics** - Real-time storage usage statistics
- 🔄 **Real-time Updates** - Live file list updates without page refresh

### Technical Features
- 🗜️ **File Deduplication** - Saves storage by detecting identical files using SHA-256 hashing
- 📈 **Upload Progress** - Real-time progress bars for file uploads
- 🎯 **User Management** - Multi-user support with per-user storage quotas
- 📝 **Audit Logging** - Complete activity tracking for compliance
- 🚀 **RESTful API** - Clean API design for easy integration
- 🐳 **Docker Ready** - Containerized deployment for easy scaling

## 🏗️ Architecture

```
┌─────────────────┐
│   React Frontend │ (Port 80)
│   (Nginx)        │
└────────┬────────┘
         │
         │ HTTPS/REST API
         │
┌────────▼────────┐
│   Go Backend    │ (Port 8080)
│   (Gin)         │
└────────┬────────┘
         │
         │ PostgreSQL
         │
┌────────▼────────┐
│   PostgreSQL    │ (Port 5432)
│   Database      │
└─────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Language**: Go 1.21+
- **Framework**: Gin Web Framework
- **Database**: PostgreSQL 17
- **Libraries**:
  - `github.com/lib/pq` - PostgreSQL driver
  - `crypto/sha256` - File hashing
  - `mime/multipart` - File handling

### Frontend
- **Framework**: React 18
- **Build Tool**: Create React App
- **UI Components**:
  - `react-dropzone` - Drag & drop uploads
  - `react-modal` - Modal dialogs
  - `axios` - HTTP client
- **Styling**: Custom CSS with responsive design

### Infrastructure
- **Hosting**: Railway
- **Container**: Docker with multi-stage builds
- **Web Server**: Nginx (frontend)
- **CI/CD**: GitHub integration with Railway

## 📁 Project Structure

```
filevault/
├── backend/              # Go backend application
│   ├── main.go          # Entry point
│   ├── handlers/        # HTTP handlers
│   ├── models/          # Data models
│   └── utils/           # Utility functions
├── frontend/            # React frontend application
│   ├── src/
│   │   ├── App.js      # Main component
│   │   ├── api.js      # API client
│   │   └── App.css     # Styles
│   ├── Dockerfile      # Frontend container
│   └── nginx.conf      # Nginx configuration
├── database/            # Database schemas
│   └── schema.sql      # PostgreSQL schema
├── docs/               # Documentation
├── uploads/            # Local file storage (dev)
└── docker-compose.yml  # Local development setup
```

## 🚀 Quick Start

### Prerequisites
- Go 1.21 or higher
- Node.js 18 or higher
- PostgreSQL 15+ (or Docker)
- Git

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/Sidd-0/filevault.git
cd filevault
```

2. **Set up the database**
```bash
# Create PostgreSQL database
createdb filevault

# Run schema
psql filevault < database/schema.sql
```

3. **Configure environment variables**
```bash
# Create .env file in root
cp .env.example .env

# Edit .env with your settings:
DATABASE_URL=postgresql://user:password@localhost:5432/filevault
PORT=8080
```

4. **Start the backend**
```bash
cd backend
go mod download
go run main.go
```

5. **Start the frontend**
```bash
cd frontend
npm install
npm start
```

6. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📊 Database Schema

### Tables

**users** - User accounts and storage quotas
```sql
- id (SERIAL PRIMARY KEY)
- username (VARCHAR UNIQUE)
- email (VARCHAR UNIQUE)
- password_hash (VARCHAR)
- role (VARCHAR) - 'user' or 'admin'
- storage_quota_bytes (BIGINT)
- storage_used_bytes (BIGINT)
```

**blobs** - Deduplicated file storage
```sql
- hash (VARCHAR PRIMARY KEY) - SHA-256 hash
- size_bytes (BIGINT)
- storage_path (VARCHAR)
- reference_count (INTEGER)
```

**files** - File metadata
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FK → users)
- blob_hash (VARCHAR FK → blobs)
- filename (VARCHAR)
- mime_type (VARCHAR)
- is_public (BOOLEAN)
- download_count (INTEGER)
```

**file_shares** - Sharing configuration
```sql
- id (SERIAL PRIMARY KEY)
- file_id (INTEGER FK → files)
- share_type (VARCHAR) - 'public' or 'private'
- share_link (VARCHAR UNIQUE)
```

**audit_logs** - Activity tracking
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FK → users)
- action (VARCHAR)
- details (JSONB)
- ip_address (VARCHAR)
```

## 🔌 API Endpoints

### Files
- `GET /api/files?user_id={id}` - List user's files
- `POST /api/files?user_id={id}` - Upload file(s)
- `GET /api/files/{id}/download` - Download file
- `DELETE /api/files/{id}` - Delete file
- `GET /api/files/{id}/info` - Get file metadata

### Search
- `GET /api/search?q={query}&user_id={id}` - Search files
  - Query params: `mime_type`, `min_size`, `max_size`, `date_from`, `date_to`

### Sharing
- `POST /api/files/{id}/share` - Update file sharing settings
  - Body: `{"share_type": "public"|"private"}`

### Statistics
- `GET /api/stats?user_id={id}` - Get user storage statistics

### Health
- `GET /health` - Health check endpoint

## 🎯 Key Features Explained

### File Deduplication
FileVault uses SHA-256 hashing to detect duplicate files. When a file is uploaded:
1. Calculate SHA-256 hash of the file content
2. Check if blob with this hash exists in database
3. If exists, create new file record pointing to existing blob
4. If new, store file and create new blob record
5. Track reference count for garbage collection

### Storage Quotas
Each user has a storage quota enforced by the system:
- Default: 10 MB for regular users
- Admin: 100 MB
- Tracks actual storage used (after deduplication)
- Prevents uploads exceeding quota

### Real-time Updates
Frontend polls the backend every 10 seconds for:
- New file uploads
- File deletions
- Storage statistics updates
- Can be toggled on/off by user

## 🔒 Security Features

- ✅ User authentication (X-User-ID header)
- ✅ File access control (public/private)
- ✅ CORS configuration for frontend
- ✅ Input validation and sanitization
- ✅ Secure file storage with hash-based naming
- ✅ Audit logging for all actions

## 🚢 Deployment

### Railway Deployment

This project is deployed on Railway with three services:

1. **Backend (Go)**
   - Environment: `DATABASE_URL`, `PORT`
   - Build: `go build -o main`
   - Start: `./main`

2. **Frontend (React + Nginx)**
   - Build arg: `REACT_APP_API_URL`
   - Multi-stage Docker build
   - Nginx serves static files

3. **PostgreSQL Database**
   - Persistent volume storage
   - Automatic backups

### Environment Variables

**Backend:**
```env
DATABASE_URL=postgresql://user:pass@host:port/db
PORT=8080
```

**Frontend:**
```env
REACT_APP_API_URL=https://your-backend.railway.app/api
```

## 📈 Performance

- **File Upload**: Streaming upload with progress tracking
- **Deduplication**: O(1) lookup using hash index
- **Search**: Optimized with database indexes on common fields
- **Caching**: Nginx caching for static assets (1 year)
- **Compression**: Gzip enabled for text files

## 🧪 Testing

```bash
# Backend tests
cd backend
go test ./...

# Frontend tests
cd frontend
npm test

# Integration tests
npm run test:e2e
```

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Siddhant Purohit** - [@Sidd-0](https://github.com/Sidd-0)

## 🙏 Acknowledgments

- Railway for hosting infrastructure
- Go community for excellent libraries
- React team for the frontend framework
- PostgreSQL for reliable database

## 📞 Support

For support, email siddhantpurohit001@gmail.com or open an issue on GitHub.

---

**Built with ❤️ using Go, React, and PostgreSQL**
