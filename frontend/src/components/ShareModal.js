import React, { useState } from "react";
import Modal from "react-modal";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Share2, X, Globe } from "lucide-react";
import toast from "react-hot-toast";
import { useTheme } from "../contexts/ThemeContext";

const buildShareUrl = (file) => {
  const apiBase =
    process.env.REACT_APP_API_URL?.replace(/\/$/, "") ||
    `${window.location.origin.replace(/:\d+$/, "")}:8080/api`;
  return `${apiBase}/files/${file.id}/download`;
};

const ShareModal = ({ isOpen, file, onClose }) => {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  if (!file) {
    return (
      <Modal
        isOpen={isOpen}
        onRequestClose={onClose}
        className="modal"
        overlayClassName="modal-overlay"
        closeTimeoutMS={200}
      />
    );
  }

  const shareUrl = buildShareUrl(file);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="modal"
      overlayClassName="modal-overlay"
      closeTimeoutMS={200}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="modal-shell glass share-modal"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
          >
            <div className="modal-header">
              <h2>
                <Share2 size={18} />
                Share publicly
              </h2>
              <button onClick={onClose} className="icon-btn">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body share-body">
              <motion.div
                className="public-badge"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Globe size={12} />
                <span>Anyone with the link can download</span>
              </motion.div>

              <motion.div
                className="qr-card"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <div className="qr-frame">
                  <QRCodeSVG
                    value={shareUrl}
                    size={196}
                    level="M"
                    includeMargin={false}
                    bgColor={theme === "dark" ? "#1c1c32" : "#ffffff"}
                    fgColor={theme === "dark" ? "#f3f4ff" : "#1a1a2e"}
                  />
                </div>
                <p className="qr-filename" title={file.filename}>
                  {file.filename}
                </p>
              </motion.div>

              <motion.div
                className="share-link-row"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <input
                  className="share-link-input"
                  value={shareUrl}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
                <motion.button
                  className={`btn ${copied ? "btn-secondary" : "btn-primary"}`}
                  onClick={handleCopy}
                  whileTap={{ scale: 0.96 }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={copied ? "ok" : "copy"}
                      initial={{ y: -8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 8, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? "Copied" : "Copy"}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </motion.div>

              <p className="share-hint">
                Scan the QR with a phone camera, or share the link directly.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};

export default ShareModal;
