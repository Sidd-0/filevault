import React from "react";
import { motion } from "framer-motion";
import {
  HardDrive,
  Files,
  Database,
  Activity,
} from "lucide-react";
import { formatBytes } from "../api";

const cards = [
  {
    key: "used",
    label: "Storage Used",
    icon: HardDrive,
    accent: "var(--accent-1)",
  },
  {
    key: "files",
    label: "Total Files",
    icon: Files,
    accent: "var(--accent-2)",
  },
  {
    key: "limit",
    label: "Storage Limit",
    icon: Database,
    accent: "var(--accent-3)",
  },
  {
    key: "live",
    label: "Real-time Updates",
    icon: Activity,
    accent: "var(--accent-4)",
  },
];

const StatsPanel = ({ stats, realTimeEnabled, setRealTimeEnabled }) => {
  if (!stats) return null;

  const valueOf = {
    used: formatBytes(stats.total_storage_bytes || 0),
    files: stats.total_files || 0,
    limit: formatBytes(stats.storage_limit_bytes || 10485760),
    live: realTimeEnabled ? "On" : "Off",
  };

  return (
    <div className="stats-grid">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={c.key}
            className="stat-card glass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.05 * i,
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <div
              className="stat-glow"
              style={{ background: c.accent }}
            />
            <div className="stat-head">
              <div className="stat-icon" style={{ color: c.accent }}>
                <Icon size={18} />
              </div>
              <span className="stat-label">{c.label}</span>
            </div>

            <div className="stat-value">{valueOf[c.key]}</div>

            {c.key === "used" && (
              <div className="stat-progress">
                <div className="progress-track">
                  <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(stats.storage_used_percent || 0, 100)}%`,
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <span className="stat-percent">
                  {Math.round(stats.storage_used_percent || 0)}%
                </span>
              </div>
            )}

            {c.key === "live" && (
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={realTimeEnabled}
                  onChange={(e) => setRealTimeEnabled(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default StatsPanel;
