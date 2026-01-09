import React, { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Modal from "react-modal";
import "./App.css";
import {
  formatBytes,
  formatDate,
  getFileIcon,
  canPreviewFile,
  uploadMultipleFiles,
  listFiles,
  deleteFile,
  downloadFile,
  shareFile,
  searchFiles,
  getUserStats,
  getFilePreview,
  subscribeToUpdates,
} from "./api";

// Set app element for accessibility
Modal.setAppElement("#root");

function App() {
  // State management
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  
  // Upload state
  const [uploadProgress, setUploadProgress] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    mimeType: "",
    minSize: "",
    maxSize: "",
    dateFrom: "",
    dateTo: "",
  });

  // Preview modal state
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    file: null,
    previewUrl: null,
  });

  // File details modal state
  const [detailsModal, setDetailsModal] = useState({
    isOpen: false,
    file: null,
  });

  // Real-time updates
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  // Load files and stats on mount
  useEffect(() => {
    loadFiles();
    loadStats();
  }, []);

  // Real-time updates subscription
  useEffect(() => {
    if (!realTimeEnabled) return;

    const unsubscribe = subscribeToUpdates(({ files: newFiles, stats: newStats }) => {
      setFiles(newFiles || []);
      setStats(newStats);
    }, 10000); // Every 10 seconds

    return () => unsubscribe();
  }, [realTimeEnabled]);

  const loadFiles = async () => {
    try {
      const data = await listFiles();
      setFiles(data || []);
    } catch (error) {
      showMessage("Error loading files: " + error.message, "error");
    }
  };

  const loadStats = async () => {
    try {
      const data = await getUserStats();
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const showMessage = (text, type = "info") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  // Drag & Drop handlers
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress({});

    try {
      const { results, errors } = await uploadMultipleFiles(
        acceptedFiles,
        (progressData) => {
          setUploadProgress((prev) => ({
            ...prev,
            [progressData.fileName]: progressData.progress,
          }));
        }
      );

      if (results.length > 0) {
        showMessage(`✅ Successfully uploaded ${results.length} file(s)`, "success");
        loadFiles();
        loadStats();
      }

      if (errors.length > 0) {
        showMessage(`⚠️ ${errors.length} file(s) failed to upload`, "warning");
      }
    } catch (error) {
      showMessage("Upload failed: " + error.message, "error");
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  // Handle traditional file upload
  const handleFileUpload = async (e) => {
    const fileList = Array.from(e.target.files);
    if (fileList.length === 0) return;

    await onDrop(fileList);
    e.target.value = ""; // Reset input
  };

  // Handle delete
  const handleDelete = async (fileId, fileName) => {
    if (!window.confirm(`Delete "${fileName}"?`)) return;

    setLoading(true);
    try {
      await deleteFile(fileId);
      showMessage(`✅ Deleted "${fileName}"`, "success");
      loadFiles();
      loadStats();
    } catch (error) {
      showMessage("Delete failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle download
  const handleDownload = async (fileId, fileName) => {
    try {
      await downloadFile(fileId, fileName);
      showMessage(`⬇️ Downloaded "${fileName}"`, "success");
      // Refresh to update download count
      setTimeout(loadFiles, 1000);
    } catch (error) {
      showMessage("Download failed: " + error.message, "error");
    }
  };

  // Handle share toggle
  const handleShare = async (fileId, currentIsPublic, fileName) => {
    const newShareType = currentIsPublic ? "private" : "public";
    setLoading(true);

    try {
      await shareFile(fileId, newShareType);
      showMessage(`✅ "${fileName}" is now ${newShareType}`, "success");
      loadFiles();
    } catch (error) {
      showMessage("Share failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle file preview
  const handlePreview = async (file) => {
    if (!canPreviewFile(file.mime_type)) {
      showMessage("Preview not available for this file type", "warning");
      return;
    }

    try {
      const previewUrl = await getFilePreview(file.id);
      setPreviewModal({
        isOpen: true,
        file,
        previewUrl,
      });
    } catch (error) {
      showMessage("Preview failed: " + error.message, "error");
    }
  };

  // Handle file details
  const handleDetails = (file) => {
    setDetailsModal({
      isOpen: true,
      file,
    });
  };

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchQuery.trim() && !Object.values(filters).some((v) => v)) {
      loadFiles();
      return;
    }

    setLoading(true);
    try {
      const result = await searchFiles({
        query: searchQuery,
        ...filters,
      });
      setFiles(result.files || []);
      showMessage(`Found ${result.files?.length || 0} file(s)`, "info");
    } catch (error) {
      showMessage("Search failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery("");
    setFilters({
      mimeType: "",
      minSize: "",
      maxSize: "",
      dateFrom: "",
      dateTo: "",
    });
    loadFiles();
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1>🔐 File Vault</h1>
        <p>Secure file storage with deduplication & advanced features</p>
      </header>

      {/* Message Display */}
      {message.text && (
        <div className={`message message--${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Statistics Panel */}
      {stats && (
        <div className="stats-panel">
          <div className="stat-card">
            <div className="stat-label">Storage Used</div>
            <div className="stat-value">
              {formatBytes(stats.total_storage_bytes || 0)}
            </div>
            <div className="stat-progress">
              <progress
                value={stats.storage_used_percent || 0}
                max="100"
              ></progress>
              <span className="stat-percent">
                {Math.round(stats.storage_used_percent || 0)}%
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Files</div>
            <div className="stat-value">{stats.total_files || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Storage Limit</div>
            <div className="stat-value">
              {formatBytes(stats.storage_limit_bytes || 10485760)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Real-time Updates</div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={realTimeEnabled}
                onChange={(e) => setRealTimeEnabled(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div className="upload-section">
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? "dropzone--active" : ""} ${
            isUploading ? "dropzone--uploading" : ""
          }`}
        >
          <input {...getInputProps()} />
          {isUploading ? (
            <div className="upload-progress-container">
              <p>⏳ Uploading files...</p>
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="upload-progress-item">
                  <span className="upload-file-name">{fileName}</span>
                  <div className="upload-progress-bar">
                    <div
                      className="upload-progress-fill"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <span className="upload-progress-percent">{progress}%</span>
                </div>
              ))}
            </div>
          ) : isDragActive ? (
            <p>📥 Drop files here...</p>
          ) : (
            <div>
              <p>🎯 Drag & drop files here</p>
              <p>or</p>
              <label htmlFor="file-input" className="upload-button">
                📤 Choose Files
              </label>
              <input
                id="file-input"
                type="file"
                onChange={handleFileUpload}
                multiple
                style={{ display: "none" }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Search & Filter Section */}
      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="🔍 Search files by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" disabled={loading} className="search-btn">
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="filter-btn"
          >
            {showAdvancedFilters ? "🔽" : "🔼"} Filters
          </button>
          {(searchQuery || Object.values(filters).some((v) => v)) && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="clear-btn"
            >
              Clear
            </button>
          )}
        </form>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="advanced-filters">
            <div className="filter-row">
              <div className="filter-group">
                <label>File Type:</label>
                <select
                  value={filters.mimeType}
                  onChange={(e) =>
                    setFilters({ ...filters, mimeType: e.target.value })
                  }
                  className="filter-select"
                >
                  <option value="">All Types</option>
                  <option value="image/jpeg">Images (JPEG)</option>
                  <option value="image/png">Images (PNG)</option>
                  <option value="application/pdf">PDF</option>
                  <option value="text/plain">Text</option>
                  <option value="application/zip">ZIP</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Min Size:</label>
                <input
                  type="number"
                  placeholder="Bytes"
                  value={filters.minSize}
                  onChange={(e) =>
                    setFilters({ ...filters, minSize: e.target.value })
                  }
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label>Max Size:</label>
                <input
                  type="number"
                  placeholder="Bytes"
                  value={filters.maxSize}
                  onChange={(e) =>
                    setFilters({ ...filters, maxSize: e.target.value })
                  }
                  className="filter-input"
                />
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label>From Date:</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    setFilters({ ...filters, dateFrom: e.target.value })
                  }
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label>To Date:</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) =>
                    setFilters({ ...filters, dateTo: e.target.value })
                  }
                  className="filter-input"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Files Container */}
      <div className="files-container">
        <div className="files-header">
          <h2>📂 Your Files ({files.length})</h2>
        </div>

        {loading && <p className="loading">Loading...</p>}

        {files.length === 0 && !loading && (
          <div className="empty-state">
            <p>📭 No files found</p>
            <p>Upload some files to get started!</p>
          </div>
        )}

        {/* Files Table */}
        {files.length > 0 && (
          <div className="table-container">
            <table className="files-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Filename</th>
                  <th>Size</th>
                  <th>Type</th>
                  <th>Uploaded</th>
                  <th>Downloads</th>
                  <th>Share</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="file-row">
                    <td className="file-icon-cell">
                      {getFileIcon(file.mime_type)}
                    </td>
                    <td className="file-name">
                      <span
                        onClick={() => handleDetails(file)}
                        className="file-name-link"
                        title="Click for details"
                      >
                        {file.filename}
                      </span>
                    </td>
                    <td>{formatBytes(file.size_bytes || 0)}</td>
                    <td className="mime-type">{file.mime_type}</td>
                    <td className="file-date">{formatDate(file.created_at)}</td>
                    <td className="download-count">
                      📥 {file.download_count || 0}
                    </td>
                    <td>
                      <button
                        onClick={() =>
                          handleShare(file.id, file.is_public, file.filename)
                        }
                        className={`share-btn ${
                          file.is_public ? "public" : "private"
                        }`}
                        disabled={loading}
                      >
                        {file.is_public ? "🌐 Public" : "🔒 Private"}
                      </button>
                    </td>
                    <td className="actions">
                      {canPreviewFile(file.mime_type) && (
                        <button
                          onClick={() => handlePreview(file)}
                          className="action-btn preview-btn"
                          title="Preview file"
                        >
                          👁️
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(file.id, file.filename)}
                        className="action-btn download-btn"
                        title="Download file"
                      >
                        ⬇️
                        </button>
                      <button
                        onClick={() => handleDelete(file.id, file.filename)}
                        disabled={loading}
                        className="action-btn delete-btn"
                        title="Delete file"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={previewModal.isOpen}
        onRequestClose={() =>
          setPreviewModal({ isOpen: false, file: null, previewUrl: null })
        }
        className="modal"
        overlayClassName="modal-overlay"
      >
        {previewModal.file && (
          <div className="modal-content">
            <div className="modal-header">
              <h2>📄 {previewModal.file.filename}</h2>
              <button
                onClick={() =>
                  setPreviewModal({ isOpen: false, file: null, previewUrl: null })
                }
                className="modal-close"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {previewModal.file.mime_type.startsWith("image/") && (
                <img
                  src={previewModal.previewUrl}
                  alt={previewModal.file.filename}
                  className="preview-image"
                />
              )}
              {previewModal.file.mime_type === "application/pdf" && (
                <iframe
                  src={previewModal.previewUrl}
                  title={previewModal.file.filename}
                  className="preview-pdf"
                />
              )}
              {previewModal.file.mime_type.startsWith("text/") && (
                <iframe
                  src={previewModal.previewUrl}
                  title={previewModal.file.filename}
                  className="preview-text"
                />
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* File Details Modal */}
      <Modal
        isOpen={detailsModal.isOpen}
        onRequestClose={() => setDetailsModal({ isOpen: false, file: null })}
        className="modal"
        overlayClassName="modal-overlay"
      >
        {detailsModal.file && (
          <div className="modal-content">
            <div className="modal-header">
              <h2>📋 File Details</h2>
              <button
                onClick={() => setDetailsModal({ isOpen: false, file: null })}
                className="modal-close"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="file-details">
                <div className="detail-row">
                  <span className="detail-label">Filename:</span>
                  <span className="detail-value">{detailsModal.file.filename}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Size:</span>
                  <span className="detail-value">
                    {formatBytes(detailsModal.file.size_bytes)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">{detailsModal.file.mime_type}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Uploaded:</span>
                  <span className="detail-value">
                    {formatDate(detailsModal.file.created_at)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Downloads:</span>
                  <span className="detail-value">
                    {detailsModal.file.download_count || 0}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">
                    {detailsModal.file.is_public ? "🌐 Public" : "🔒 Private"}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">File ID:</span>
                  <span className="detail-value">{detailsModal.file.id}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Hash:</span>
                  <span className="detail-value hash">
                    {detailsModal.file.blob_hash?.substring(0, 16)}...
                  </span>
                </div>
              </div>
              <div className="modal-actions">
                <button
                  onClick={() => handleDownload(detailsModal.file.id, detailsModal.file.filename)}
                  className="btn btn--primary"
                >
                  ⬇️ Download
                </button>
                {canPreviewFile(detailsModal.file.mime_type) && (
                  <button
                    onClick={() => {
                      setDetailsModal({ isOpen: false, file: null });
                      handlePreview(detailsModal.file);
                    }}
                    className="btn btn--secondary"
                  >
                    👁️ Preview
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Footer */}
      <footer className="footer">
        <p>
          ✨ Features: Drag & Drop • Progress Bars • File Preview • Advanced Search
          • Real-time Updates • Deduplication
        </p>
      </footer>
    </div>
  );
}

export default App;
