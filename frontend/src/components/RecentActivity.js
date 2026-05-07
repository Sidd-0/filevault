import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  Download,
  Trash2,
  Share2,
  Activity,
  Recycle,
} from "lucide-react";

const ICON_FOR = {
  upload: UploadCloud,
  download: Download,
  delete: Trash2,
  share: Share2,
};

const ACCENT_FOR = {
  upload: "var(--accent-2)",
  download: "var(--accent-1)",
  delete: "#ef4444",
  share: "var(--accent-3)",
};

const timeAgo = (iso) => {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const titleFor = (entry) => {
  const name = entry.filename || `file #${entry.file_id ?? "?"}`;
  switch (entry.action) {
    case "upload":
      return `Uploaded ${name}`;
    case "download":
      return `Downloaded ${name}`;
    case "delete":
      return `Deleted ${name}`;
    case "share":
      return `Shared ${name}`;
    default:
      return entry.action;
  }
};

const subtitleFor = (entry) => {
  const d = entry.details;
  if (!d || typeof d !== "object") return null;
  if (entry.action === "upload" && d.deduplicated) {
    return (
      <span className="activity-tag dedup">
        <Recycle size={11} /> deduplicated
      </span>
    );
  }
  if (entry.action === "share" && d.share_type) {
    return <span className="activity-tag">{d.share_type}</span>;
  }
  if (entry.action === "delete" && typeof d.remaining_refs === "number") {
    return (
      <span className="activity-tag">
        {d.remaining_refs > 0
          ? `${d.remaining_refs} ref${d.remaining_refs > 1 ? "s" : ""} remain`
          : "blob purged"}
      </span>
    );
  }
  return null;
};

const RecentActivity = ({ entries }) => {
  return (
    <motion.section
      className="activity-panel glass"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.4 }}
    >
      <div className="activity-head">
        <div className="activity-title">
          <Activity size={16} />
          <h2>Recent Activity</h2>
        </div>
        <span className="files-count">{entries?.length || 0}</span>
      </div>

      {(!entries || entries.length === 0) && (
        <div className="activity-empty">
          <p>No activity yet — upload, download, or share a file.</p>
        </div>
      )}

      <ul className="activity-list">
        <AnimatePresence initial={false}>
          {(entries || []).slice(0, 8).map((entry) => {
            const Icon = ICON_FOR[entry.action] || Activity;
            const accent = ACCENT_FOR[entry.action] || "var(--accent-1)";
            return (
              <motion.li
                key={entry.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="activity-item"
              >
                <span
                  className="activity-icon"
                  style={{
                    color: accent,
                    background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                  }}
                >
                  <Icon size={14} />
                </span>
                <div className="activity-meta">
                  <span className="activity-text">{titleFor(entry)}</span>
                  <span className="activity-when">
                    {timeAgo(entry.created_at)}
                    {subtitleFor(entry) && (
                      <>
                        <span className="dot">·</span>
                        {subtitleFor(entry)}
                      </>
                    )}
                  </span>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </motion.section>
  );
};

export default RecentActivity;
