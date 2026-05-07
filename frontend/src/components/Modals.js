import React from "react";
import Modal from "react-modal";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Eye,
  FileText,
  Globe,
  Lock,
  Hash,
  Calendar,
  HardDrive,
  Layers,
} from "lucide-react";
import { formatBytes, formatDate, canPreviewFile } from "../api";

const contentVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

export const PreviewModal = ({ isOpen, file, previewUrl, onClose }) => (
  <Modal
    isOpen={isOpen}
    onRequestClose={onClose}
    className="modal"
    overlayClassName="modal-overlay"
    closeTimeoutMS={200}
  >
    <AnimatePresence>
      {file && (
        <motion.div
          className="modal-shell glass"
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <div className="modal-header">
            <h2>
              <FileText size={18} />
              {file.filename}
            </h2>
            <button onClick={onClose} className="icon-btn">
              <X size={16} />
            </button>
          </div>
          <div className="modal-body">
            {file.mime_type?.startsWith("image/") && (
              <img
                src={previewUrl}
                alt={file.filename}
                className="preview-image"
              />
            )}
            {file.mime_type === "application/pdf" && (
              <iframe
                src={previewUrl}
                title={file.filename}
                className="preview-pdf"
              />
            )}
            {file.mime_type?.startsWith("text/") && (
              <iframe
                src={previewUrl}
                title={file.filename}
                className="preview-text"
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </Modal>
);

export const DetailsModal = ({ isOpen, file, onClose, onDownload, onPreview }) => (
  <Modal
    isOpen={isOpen}
    onRequestClose={onClose}
    className="modal"
    overlayClassName="modal-overlay"
    closeTimeoutMS={200}
  >
    <AnimatePresence>
      {file && (
        <motion.div
          className="modal-shell glass details"
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <div className="modal-header">
            <h2>
              <Layers size={18} />
              File Details
            </h2>
            <button onClick={onClose} className="icon-btn">
              <X size={16} />
            </button>
          </div>
          <div className="modal-body">
            <div className="details-list">
              <DetailRow
                icon={<FileText size={14} />}
                label="Filename"
                value={file.filename}
              />
              <DetailRow
                icon={<HardDrive size={14} />}
                label="Size"
                value={formatBytes(file.size_bytes)}
              />
              <DetailRow
                icon={<Layers size={14} />}
                label="Type"
                value={file.mime_type}
              />
              <DetailRow
                icon={<Calendar size={14} />}
                label="Uploaded"
                value={formatDate(file.created_at)}
              />
              <DetailRow
                icon={<Download size={14} />}
                label="Downloads"
                value={file.download_count || 0}
              />
              <DetailRow
                icon={file.is_public ? <Globe size={14} /> : <Lock size={14} />}
                label="Visibility"
                value={file.is_public ? "Public" : "Private"}
              />
              <DetailRow
                icon={<Hash size={14} />}
                label="File ID"
                value={file.id}
              />
              <DetailRow
                icon={<Hash size={14} />}
                label="Hash"
                value={
                  file.blob_hash
                    ? `${file.blob_hash.substring(0, 24)}…`
                    : "—"
                }
                mono
              />
            </div>
            <div className="modal-actions">
              <motion.button
                className="btn btn-primary"
                onClick={() => onDownload(file)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Download size={14} /> Download
              </motion.button>
              {canPreviewFile(file.mime_type) && (
                <motion.button
                  className="btn btn-secondary"
                  onClick={() => {
                    onClose();
                    onPreview(file);
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Eye size={14} /> Preview
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </Modal>
);

const DetailRow = ({ icon, label, value, mono }) => (
  <div className="detail-row">
    <span className="detail-label">
      {icon}
      {label}
    </span>
    <span className={`detail-value ${mono ? "mono" : ""}`}>{value}</span>
  </div>
);
