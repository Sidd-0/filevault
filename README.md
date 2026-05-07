# 🗄️ FileVault

**Secure file storage with deduplication, sharing, and a polished animated UI.**

A full-stack web application built with **Go**, **React**, and **PostgreSQL**. Designed as a BalkanID-style file vault: SHA‑256 deduplication, per‑user quotas, rate limiting, public/private sharing with download counters, and a modern light/dark UI animated with Framer Motion.

> Status: working end‑to‑end. The login/logout flow on the UI is a client‑side mock (stored in `localStorage`); the backend currently identifies users via the `X-User-ID` header. Real JWT auth is the next step (tracked as an issue).

---

## ✨ Features

### Storage & Files
- **SHA‑256 deduplication** — identical content is stored once; references are counted, and the underlying blob is only deleted when the last reference is gone.
- **Multi‑file uploads** with drag & drop and per‑file progress bars.
- **MIME validation** against the file extension on upload.
- **Per‑user storage quota** (default 10 MB, configurable per user).
- **Per‑user rate limit** (default 2 req/sec, configurable).
- **Storage stats** — used vs. limit, percentage, dedup savings.

### Sharing & Discovery
- **Public / private toggle** per file with a shareable link.
- **Download counters** on public files.
- **Search & filters** — by filename, MIME type, size range, date range. Filters compose.
- **Real‑time updates** via 10 s polling (toggle in the UI).
- **File previews** for images, PDFs, and text.

### Admin
- `/api/admin/stats` — total users, files, storage, downloads, public files.
- `/api/admin/files` — every file with uploader info.

### UI / UX
- Two‑font typography: **Space Grotesk** (display) + **Inter** (body), JetBrains Mono for hashes.
- **Light & dark themes** — respects `prefers-color-scheme`, toggle persists in `localStorage`.
- **Framer Motion** animations: orb backgrounds, animated tab pill, file‑card hovers, modal entrances, upload spinner.
- **Lucide icons** throughout.
- **Glass‑morphism** card surfaces over a soft animated gradient.
- Toast notifications (`react-hot-toast`).

---

## 🧱 Tech Stack

| Layer | Tech |
|---|---|
| Backend | Go 1.21, [chi](https://github.com/go-chi/chi) router, [pgx](https://github.com/jackc/pgx) driver, [rs/cors](https://github.com/rs/cors) |
| Frontend | React 18, Framer Motion, Lucide React, react‑dropzone, react‑hot‑toast, axios |
| Database | PostgreSQL 15 |
| Container | Docker, Docker Compose |

---

## 📁 Project Layout

```
filevault/
├── backend/                  # Go REST API
│   ├── main.go               # router, CORS, graceful shutdown
│   ├── upload.go             # SHA-256 dedup + multi-file upload
│   ├── list.go / search.go   # listing + composable filters
│   ├── share.go / public.go  # public/private + share links
│   ├── delete.go             # ref-count aware delete
│   ├── download.go           # streamed download + counter
│   ├── stats.go / admin.go   # user + global + admin stats
│   ├── ratelimit.go          # per-user token bucket
│   └── Dockerfile
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── App.js            # auth gate, theme + toast providers
│   │   ├── components/       # Login, Navbar, Dashboard, StatsPanel,
│   │   │                     # UploadZone, SearchBar, FileGrid, Modals
│   │   ├── contexts/         # AuthContext, ThemeContext
│   │   ├── api.js            # axios client
│   │   └── App.css / index.css
│   └── Dockerfile
├── database/
│   └── schema.sql            # users, blobs, files, file_shares, audit_logs
├── docs/
│   ├── API.md                # endpoint reference
│   └── ARCHITECTURE.md       # design writeup
├── docker-compose.yml
└── README.md
```

---

## 🚀 Run It

### Option A — Docker Compose (recommended)

```bash
git clone https://github.com/Shishir2405/filevault-fork.git
cd filevault-fork
docker-compose up --build
```

Then open:
- Frontend → <http://localhost:3000>
- Backend  → <http://localhost:8080>
- Postgres → `localhost:5432` (user `admin`, password `password123`, db `filevault`)

### Option B — Local dev (without Docker)

**Prereqs**: Go ≥ 1.21, Node ≥ 18, PostgreSQL ≥ 13.

```bash
# 1. Database
createdb filevault
psql filevault < database/schema.sql

# 2. Backend
cd backend
export DATABASE_URL="postgres://admin:password123@localhost:5432/filevault?sslmode=disable"
go run .                         # listens on :8080

# 3. Frontend (new terminal)
cd frontend
npm install
npm start                        # opens http://localhost:3000
```

The default seed includes two users: `testuser` (id 1) and `admin` (id 2). The frontend `AuthContext` uses a client‑side username/password registry stored in `localStorage`, so any username/password you sign up with works locally.

---

## 🗃️ Database Schema (high level)

```
users        ── id, username, email, role, storage_quota_bytes, storage_used_bytes
blobs        ── hash (PK), size_bytes, storage_path, reference_count
files        ── id, user_id → users, blob_hash → blobs, filename, mime_type,
                size_bytes, is_public, download_count
file_shares  ── id, file_id → files, share_type, share_link
audit_logs   ── id, user_id, file_id, action, details (jsonb), ip_address
```

Key idea: a **file** is a per‑user *reference* to a deduplicated **blob**. When a duplicate hash arrives, only the `reference_count` on the existing blob is bumped — no extra disk used. Deletes decrement the count and only purge the physical file when it hits zero.

---

## 🌐 API (REST)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/files?user_id=…` | Upload one or more files (multipart, field `files`) |
| GET  | `/api/files?user_id=…` | List a user's files |
| GET  | `/api/files/{id}/download` | Download (increments counter) |
| GET  | `/api/files/{id}/info` | File metadata + permission check |
| DELETE | `/api/files/{id}` | Delete (refcount aware) |
| POST | `/api/files/{id}/share` | Body `{"share_type":"public"\|"private"}` |
| GET  | `/api/files/public` | List all public files |
| GET  | `/api/search?user_id=…&q=…&mime_type=…&min_size=…&max_size=…&date_from=…&date_to=…` | Composed search |
| GET  | `/api/stats` | Per‑user storage stats |
| GET  | `/api/stats/global` | Global stats |
| GET  | `/api/admin/stats` | Admin dashboard (header `X-User-ID: admin`) |
| GET  | `/api/admin/files` | Admin file listing |
| GET  | `/api/users` | List users |
| GET  | `/health` | Liveness check |

Identity: every request that touches user‑scoped data sends `X-User-ID: <id>` in the header (or `?user_id=` for upload/list). The frontend pulls this from the logged‑in user in `AuthContext`.

---

## 🧠 Architecture Notes

```
┌───────────────────────┐  HTTPS   ┌─────────────────────┐  pgx  ┌──────────────┐
│  React SPA            │ ───────▶ │  Go (chi + cors)    │ ────▶ │  PostgreSQL  │
│  Framer Motion + UI   │          │  Rate limiter       │       │  schema.sql  │
└──────────┬────────────┘          │  SHA‑256 dedup      │       └──────────────┘
           │                       │  MIME validation    │
           │                       │  File serving       │
           │                       └──────────┬──────────┘
           │                                  │
           ▼                                  ▼
   localStorage (theme,                 ./uploads/<hash>
   auth profile, JWT‑ready)             (deduplicated blob store)
```

- **Stateless backend** — all state lives in Postgres + the on‑disk blob store; safe to scale horizontally if the blob store is moved to S3/GCS.
- **Polling for "real‑time"** — simple, robust, no socket plumbing. Easy upgrade path to SSE.
- **Refcount‑aware deletes** — the only correct way to mix dedup with per‑user delete semantics.
- **Frontend is a single page app** with React Context providers (`AuthProvider`, `ThemeProvider`) wrapping the app. Auth gate switches between `<Login/>` and `<Dashboard/>`.

More detail: see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🗺️ Roadmap (what would come next)

These are the spec items not yet shipped — tracked for the next iteration:

- **Real auth**: replace the `X-User-ID` header with JWT‑based login. Backend issue: see [Sidd-0/filevault#2](https://github.com/Sidd-0/filevault/issues/2).
- **Tags** + search by tag and by uploader name.
- **Folders** for organising files.
- **Share with specific users** (not just public/private).
- **MIME content sniffing** (reject mismatches via `http.DetectContentType`, not just extension).
- **Audit log writes** — the table exists; populate it from upload/download/delete/share.
- **GraphQL** layer alongside REST.
- **TypeScript** migration on the frontend.
- **Kubernetes manifests** in `k8s/` and a GitHub Actions CI pipeline.

---

## 🧪 Quick smoke test

```bash
# upload a file as user 1
curl -F files=@/path/to/file.png \
     "http://localhost:8080/api/files?user_id=1"

# list
curl -H "X-User-ID: 1" http://localhost:8080/api/files?user_id=1

# storage stats
curl -H "X-User-ID: 1" http://localhost:8080/api/stats
```

---

## 🪪 License

MIT — see [LICENSE](LICENSE).
