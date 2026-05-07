import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  FileType2,
  FileSpreadsheet,
  Archive,
  File as FileIcon,
  Eye,
  Download,
  Trash2,
  Globe,
  Lock,
  Inbox,
} from "lucide-react";
import { formatBytes, formatDate, canPreviewFile } from "../api";

const iconFor = (mime) => {
  if (!mime) return FileIcon;
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("video/")) return Video;
  if (mime.startsWith("audio/")) return Music;
  if (mime.includes("pdf")) return FileType2;
  if (mime.includes("sheet") || mime.includes("excel")) return FileSpreadsheet;
  if (mime.includes("zip") || mime.includes("rar")) return Archive;
  if (mime.includes("text") || mime.includes("word") || mime.includes("document"))
    return FileText;
  return FileIcon;
};

const accentFor = (mime) => {
  if (!mime) return "var(--accent-1)";
  if (mime.startsWith("image/")) return "var(--accent-3)";
  if (mime.startsWith("video/")) return "var(--accent-4)";
  if (mime.startsWith("audio/")) return "var(--accent-2)";
  if (mime.includes("pdf")) return "#ef4444";
  if (mime.includes("zip")) return "#f59e0b";
  return "var(--accent-1)";
};

const FileCard = ({
  file,
  onPreview,
  onDownload,
  onDelete,
  onShare,
  onDetails,
  loading,
}) => {
  const Icon = iconFor(file.mime_type);
  const accent = accentFor(file.mime_type);

  return (
    <motion.div
      layout
      className="file-card glass"
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
    >
      <div className="file-card-glow" style={{ background: accent }} />

      <div className="file-card-head">
        <motion.div
          className="file-card-icon"
          style={{ color: accent, background: `${accent}22` }}
          whileHover={{ rotate: 6, scale: 1.06 }}
        >
          <Icon size={22} />
        </motion.div>
        <button
          className={`share-pill ${file.is_public ? "public" : "private"}`}
          onClick={() => onShare(file)}
          disabled={loading}
        >
          {file.is_public ? <Globe size={12} /> : <Lock size={12} />}
          <span>{file.is_public ? "Public" : "Private"}</span>
        </button>
      </div>

      <button
        className="file-name-btn"
        onClick={() => onDetails(file)}
        title={file.filename}
      >
        {file.filename}
      </button>

      <div className="file-meta">
        <span>{formatBytes(file.size_bytes || 0)}</span>
        <span className="dot">·</span>
        <span>{formatDate(file.created_at)}</span>
      </div>

      <div className="file-meta-secondary">
        <span className="mime-tag">{file.mime_type || "unknown"}</span>
        <span className="dl-count">
          <Download size={11} /> {file.download_count || 0}
        </span>
      </div>

      <div className="file-actions">
        {canPreviewFile(file.mime_type) && (
          <motion.button
            className="icon-btn"
            onClick={() => onPreview(file)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Preview"
          >
            <Eye size={15} />
          </motion.button>
        )}
        <motion.button
          className="icon-btn"
          onClick={() => onDownload(file)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="Download"
        >
          <Download size={15} />
        </motion.button>
        <motion.button
          className="icon-btn danger"
          onClick={() => onDelete(file)}
          disabled={loading}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="Delete"
        >
          <Trash2 size={15} />
        </motion.button>
      </div>
    </motion.div>
  );
};

const FileGrid = ({ files, loading, ...handlers }) => {
  return (
    <motion.div
      className="files-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.25 }}
    >
      <div className="files-header">
        <h2>Your Files</h2>
        <span className="files-count">{files.length}</span>
      </div>

      {loading && files.length === 0 && (
        <div className="empty-state glass">
          <p>Loading…</p>
        </div>
      )}

      {!loading && files.length === 0 && (
        <motion.div
          className="empty-state glass"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          >
            <Inbox size={42} />
          </motion.div>
          <h3>No files yet</h3>
          <p>Drop a file above to get started</p>
        </motion.div>
      )}

      <div className="files-grid">
        <AnimatePresence>
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              loading={loading}
              {...handlers}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default FileGrid;
