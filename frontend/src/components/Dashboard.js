import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  uploadMultipleFiles,
  listFiles,
  deleteFile,
  downloadFile,
  shareFile,
  searchFiles,
  getUserStats,
  getFilePreview,
  subscribeToUpdates,
  canPreviewFile,
} from "../api";
import Navbar from "./Navbar";
import StatsPanel from "./StatsPanel";
import UploadZone from "./UploadZone";
import SearchBar from "./SearchBar";
import FileGrid from "./FileGrid";
import { PreviewModal, DetailsModal } from "./Modals";
import ShareModal from "./ShareModal";

const Dashboard = () => {
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const [uploadProgress, setUploadProgress] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    mimeType: "",
    minSize: "",
    maxSize: "",
    dateFrom: "",
    dateTo: "",
  });

  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    file: null,
    previewUrl: null,
  });
  const [detailsModal, setDetailsModal] = useState({
    isOpen: false,
    file: null,
  });
  const [shareModal, setShareModal] = useState({ isOpen: false, file: null });
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  const loadFiles = useCallback(async () => {
    try {
      const data = await listFiles();
      setFiles(data || []);
    } catch (error) {
      toast.error("Error loading files: " + error.message);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await getUserStats();
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }, []);

  useEffect(() => {
    loadFiles();
    loadStats();
  }, [loadFiles, loadStats]);

  useEffect(() => {
    if (!realTimeEnabled) return;
    const unsubscribe = subscribeToUpdates(
      ({ files: newFiles, stats: newStats }) => {
        setFiles(newFiles || []);
        setStats(newStats);
      },
      10000
    );
    return () => unsubscribe();
  }, [realTimeEnabled]);

  const handleUpload = async (acceptedFiles) => {
    if (!acceptedFiles?.length) return;
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
        toast.success(`Uploaded ${results.length} file(s)`);
        loadFiles();
        loadStats();
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} file(s) failed to upload`);
      }
    } catch (error) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Delete "${file.filename}"?`)) return;
    setLoading(true);
    try {
      await deleteFile(file.id);
      toast.success(`Deleted "${file.filename}"`);
      loadFiles();
      loadStats();
    } catch (error) {
      toast.error("Delete failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      await downloadFile(file.id, file.filename);
      toast.success(`Downloaded "${file.filename}"`);
      setTimeout(loadFiles, 1000);
    } catch (error) {
      toast.error("Download failed: " + error.message);
    }
  };

  const handleShare = async (file) => {
    const newShareType = file.is_public ? "private" : "public";
    setLoading(true);
    try {
      await shareFile(file.id, newShareType);
      toast.success(`"${file.filename}" is now ${newShareType}`);
      loadFiles();
      if (newShareType === "public") {
        setShareModal({ isOpen: true, file: { ...file, is_public: true } });
      }
    } catch (error) {
      toast.error("Share failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (file) => {
    if (!canPreviewFile(file.mime_type)) {
      toast("Preview not available for this file type", { icon: "ℹ️" });
      return;
    }
    try {
      const previewUrl = await getFilePreview(file.id);
      setPreviewModal({ isOpen: true, file, previewUrl });
    } catch (error) {
      toast.error("Preview failed: " + error.message);
    }
  };

  const handleDetails = (file) =>
    setDetailsModal({ isOpen: true, file });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() && !Object.values(filters).some((v) => v)) {
      loadFiles();
      return;
    }
    setLoading(true);
    try {
      const result = await searchFiles({ query: searchQuery, ...filters });
      setFiles(result.files || []);
      toast.success(`Found ${result.files?.length || 0} file(s)`);
    } catch (error) {
      toast.error("Search failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="app-bg">
        <div className="bg-orb orb-1" />
        <div className="bg-orb orb-2" />
        <div className="bg-grid" />
      </div>

      <Navbar />

      <main className="main-container">
        <StatsPanel
          stats={stats}
          realTimeEnabled={realTimeEnabled}
          setRealTimeEnabled={setRealTimeEnabled}
        />

        <UploadZone
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          onFiles={handleUpload}
        />

        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filters={filters}
          setFilters={setFilters}
          showAdvanced={showAdvancedFilters}
          setShowAdvanced={setShowAdvancedFilters}
          onSearch={handleSearch}
          onClear={handleClearSearch}
          loading={loading}
        />

        <FileGrid
          files={files}
          loading={loading}
          onPreview={handlePreview}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onShare={handleShare}
          onDetails={handleDetails}
        />
      </main>

      <footer className="footer">
        <p>
          Drag &amp; Drop · Progress · Preview · Search · Real-time · Dedup
        </p>
      </footer>

      <PreviewModal
        isOpen={previewModal.isOpen}
        file={previewModal.file}
        previewUrl={previewModal.previewUrl}
        onClose={() =>
          setPreviewModal({ isOpen: false, file: null, previewUrl: null })
        }
      />

      <DetailsModal
        isOpen={detailsModal.isOpen}
        file={detailsModal.file}
        onClose={() => setDetailsModal({ isOpen: false, file: null })}
        onDownload={handleDownload}
        onPreview={handlePreview}
      />

      <ShareModal
        isOpen={shareModal.isOpen}
        file={shareModal.file}
        onClose={() => setShareModal({ isOpen: false, file: null })}
      />
    </div>
  );
};

export default Dashboard;
