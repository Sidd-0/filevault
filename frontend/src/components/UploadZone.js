import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileUp, Loader2 } from "lucide-react";

const UploadZone = ({ isUploading, uploadProgress, onFiles }) => {
  const onDrop = useCallback((accepted) => onFiles(accepted), [onFiles]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  return (
    <motion.div
      className="upload-section"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5 }}
    >
      <motion.div
        {...getRootProps()}
        className={`dropzone glass ${isDragActive ? "active" : ""} ${
          isUploading ? "uploading" : ""
        }`}
        animate={{
          scale: isDragActive ? 1.01 : 1,
        }}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              className="upload-progress-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="upload-head">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <Loader2 size={20} />
                </motion.div>
                <span>Uploading files…</span>
              </div>
              <div className="upload-list">
                {Object.entries(uploadProgress).map(([fileName, progress]) => (
                  <motion.div
                    key={fileName}
                    className="upload-item"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <span className="upload-file-name" title={fileName}>
                      {fileName}
                    </span>
                    <div className="upload-progress-bar">
                      <motion.div
                        className="upload-progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                    <span className="upload-progress-percent">{progress}%</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : isDragActive ? (
            <motion.div
              key="drag"
              className="dropzone-inner"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="dropzone-icon"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <FileUp size={36} />
              </motion.div>
              <h3>Drop them in</h3>
              <p>release to upload</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              className="dropzone-inner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="dropzone-icon"
                whileHover={{ scale: 1.1, rotate: -6 }}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <UploadCloud size={36} />
              </motion.div>
              <h3>Drag &amp; drop files</h3>
              <p>or click to browse from your device</p>
              <span className="dropzone-hint">
                Multi-file uploads · Auto deduplication
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default UploadZone;
