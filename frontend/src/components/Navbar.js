import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Sun, Moon, LogOut, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.header
      className="navbar"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="navbar-brand">
        <motion.div
          className="brand-icon"
          whileHover={{ rotate: 12, scale: 1.05 }}
          animate={{ rotate: [0, 4, -4, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ShieldCheck size={20} />
        </motion.div>
        <div className="brand-text">
          <h1>File Vault</h1>
          <span>secure storage</span>
        </div>
      </div>

      <div className="navbar-actions">
        <motion.button
          className="theme-toggle"
          onClick={toggleTheme}
          whileTap={{ scale: 0.9, rotate: 30 }}
          whileHover={{ scale: 1.06 }}
          aria-label="Toggle theme"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ y: -16, opacity: 0, rotate: -90 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: 16, opacity: 0, rotate: 90 }}
              transition={{ duration: 0.25 }}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        <motion.div
          className="user-chip"
          whileHover={{ y: -1 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <div className="user-avatar">
            <User size={14} />
          </div>
          <div className="user-meta">
            <span className="user-name">{user?.username}</span>
            <span className="user-id">id #{user?.id}</span>
          </div>
        </motion.div>

        <motion.button
          className="btn btn-ghost"
          onClick={logout}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <LogOut size={14} />
          <span>Logout</span>
        </motion.button>
      </div>
    </motion.header>
  );
};

export default Navbar;
