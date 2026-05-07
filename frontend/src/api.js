import axios from 'axios';

// API Base URL - works for both local and production
const APIBASE = process.env.REACT_APP_API_URL || "http://localhost:8080/api/";

// User ID from localStorage
const getUserId = () => {
  return localStorage.getItem("userId") || "1";
};

// Get JWT token (for future authentication)
const getAuthToken = () => {
  return localStorage.getItem("authToken") || null;
};

// Set auth token
export const setAuthToken = (token) => {
  localStorage.setItem("authToken", token);
};

// Axios instance with default config
const apiClient = axios.create({
  baseURL: APIBASE,
  headers: {
    'X-User-ID': getUserId(),
  }
});

// Add auth token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['X-User-ID'] = getUserId();
  return config;
});

// Helper: Format bytes to human readable
export const formatBytes = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

// Helper: Format date
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
};

// Helper: Get file icon based on MIME type
export const getFileIcon = (mimeType) => {
  if (!mimeType) return "📄";
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎥";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("pdf")) return "📕";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📘";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("zip") || mimeType.includes("rar")) return "🗜️";
  if (mimeType.includes("text")) return "📝";
  return "📄";
};

// Helper: Can preview file
export const canPreviewFile = (mimeType) => {
  if (!mimeType) return false;
  return (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf" ||
    mimeType.startsWith("text/")
  );
};

// Get user storage stats
export const getUserStats = async () => {
  try {
    const response = await apiClient.get('stats');
    return response.data;
  } catch (error) {
    console.error("Get stats error:", error);
    throw error;
  }
};

// List user's files
export const listFiles = async () => {
  try {
    const response = await apiClient.get(`files?user_id=${getUserId()}`);
    return response.data;
  } catch (error) {
    console.error("List files error:", error);
    throw error;
  }
};

// Upload file with progress tracking
export const uploadFile = async (file, onProgress) => {
  try {
    const formData = new FormData();
    formData.append("files", file);

    const response = await apiClient.post(
      `files?user_id=${getUserId()}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          if (onProgress) {
            onProgress(percentCompleted, file.name);
          }
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};

// Upload multiple files with progress
export const uploadMultipleFiles = async (files, onProgress) => {
  const results = [];
  const errors = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const result = await uploadFile(file, (percent, name) => {
        if (onProgress) {
          onProgress({
            fileIndex: i,
            totalFiles: files.length,
            fileName: name,
            progress: percent,
          });
        }
      });
      results.push(result);
    } catch (error) {
      errors.push({ file: file.name, error: error.message });
    }
  }

  return { results, errors };
};

// Download file
export const downloadFile = async (fileId, fileName) => {
  try {
    const response = await apiClient.get(`files/${fileId}/download`, {
      responseType: 'blob',
    });

    const disposition = response.headers['content-disposition'];
    let downloadFileName = fileName || 'download';

    if (disposition) {
      const filenameMatch = disposition.match(/filename\*=UTF-8''([^;\r\n]*)/);
      if (filenameMatch) {
        downloadFileName = decodeURIComponent(filenameMatch[1]);
      } else {
        const simpleMatch = disposition.match(/filename="([^"]+)"/);
        if (simpleMatch) {
          downloadFileName = simpleMatch[1];
        }
      }
    }

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', downloadFileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download error:", error);
    throw error;
  }
};

// Delete file
export const deleteFile = async (fileId) => {
  try {
    const response = await apiClient.delete(`files/${fileId}`);
    return response.data;
  } catch (error) {
    console.error("Delete error:", error);
    throw error;
  }
};

// Get file info
export const getFileInfo = async (fileId) => {
  try {
    const response = await apiClient.get(`files/${fileId}/info`);
    return response.data;
  } catch (error) {
    console.error("Get file info error:", error);
    throw error;
  }
};

// Get file preview/content
export const getFilePreview = async (fileId) => {
  try {
    const response = await apiClient.get(`files/${fileId}/download`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  } catch (error) {
    console.error("Get file preview error:", error);
    throw error;
  }
};

// Advanced search with filters
export const searchFiles = async (filters) => {
  try {
    const params = new URLSearchParams({
      user_id: getUserId(),
    });

    if (filters.query) params.append('q', filters.query);
    if (filters.mimeType) params.append('mime_type', filters.mimeType);
    if (filters.minSize) params.append('min_size', filters.minSize);
    if (filters.maxSize) params.append('max_size', filters.maxSize);
    if (filters.dateFrom) params.append('date_from', filters.dateFrom);
    if (filters.dateTo) params.append('date_to', filters.dateTo);

    const response = await apiClient.get(`search?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }
};

// Share file
export const shareFile = async (fileId, shareType) => {
  try {
    const response = await apiClient.post(`files/${fileId}/share`, {
      share_type: shareType
    });
    return response.data;
  } catch (error) {
    console.error("Share error:", error);
    throw error;
  }
};

// Audit logs (recent activity)
export const getAuditLogs = async (limit = 20) => {
  try {
    const response = await apiClient.get(
      `audit?user_id=${getUserId()}&limit=${limit}`
    );
    return response.data || [];
  } catch (error) {
    console.error("Audit logs error:", error);
    return [];
  }
};

// Real-time updates (polling)
export const subscribeToUpdates = (callback, interval = 5000) => {
  const pollUpdates = async () => {
    try {
      const files = await listFiles();
      const stats = await getUserStats();
      callback({ files, stats });
    } catch (error) {
      console.error("Poll updates error:", error);
    }
  };

  pollUpdates();
  const intervalId = setInterval(pollUpdates, interval);
  return () => clearInterval(intervalId);
};

const api = {
  getUserStats,
  listFiles,
  uploadFile,
  uploadMultipleFiles,
  downloadFile,
  deleteFile,
  getFileInfo,
  getFilePreview,
  searchFiles,
  shareFile,
  subscribeToUpdates,
  formatBytes,
  formatDate,
  getFileIcon,
  canPreviewFile,
  setAuthToken,
};

export default api;
