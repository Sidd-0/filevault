import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Sun,
  Moon,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

const Login = () => {
  const { login, signup } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", email: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "login") {
        login({ username: form.username, password: form.password });
        toast.success(`Welcome back, ${form.username}!`);
      } else {
        signup({
          username: form.username,
          password: form.password,
          email: form.email,
        });
        toast.success(`Account created. Welcome, ${form.username}!`);
      }
    } catch (err) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const orbs = [
    { x: "10%", y: "20%", size: 380, color: "var(--accent-1)", delay: 0 },
    { x: "80%", y: "70%", size: 420, color: "var(--accent-2)", delay: 1.2 },
    { x: "55%", y: "10%", size: 280, color: "var(--accent-3)", delay: 2.4 },
  ];

  return (
    <div className="auth-shell">
      <div className="auth-bg">
        {orbs.map((o, i) => (
          <motion.div
            key={i}
            className="auth-orb"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: 0.55,
              scale: [0.9, 1.15, 0.9],
              x: [0, 30, -20, 0],
              y: [0, -25, 15, 0],
            }}
            transition={{
              duration: 12,
              delay: o.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              left: o.x,
              top: o.y,
              width: o.size,
              height: o.size,
              background: o.color,
            }}
          />
        ))}
        <div className="auth-grid" />
      </div>

      <motion.button
        className="theme-toggle theme-toggle--floating"
        onClick={toggleTheme}
        whileTap={{ scale: 0.9, rotate: 30 }}
        whileHover={{ scale: 1.08 }}
        aria-label="Toggle theme"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={theme}
            initial={{ y: -20, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 20, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.25 }}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="auth-brand"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <motion.div
            className="auth-brand-icon"
            animate={{ rotate: [0, 6, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <ShieldCheck size={26} />
          </motion.div>
          <div>
            <h1 className="auth-title">File Vault</h1>
            <p className="auth-subtitle">
              <Sparkles size={12} /> secure, deduplicated storage
            </p>
          </div>
        </motion.div>

        <div className="auth-tabs">
          {["login", "signup"].map((t) => (
            <button
              key={t}
              className={`auth-tab ${mode === t ? "active" : ""}`}
              onClick={() => setMode(t)}
              type="button"
            >
              {t === "login" ? "Sign In" : "Create Account"}
              {mode === t && (
                <motion.span
                  layoutId="auth-tab-pill"
                  className="auth-tab-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === "login" ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "login" ? 16 : -16 }}
              transition={{ duration: 0.25 }}
              className="auth-fields"
            >
              <div className="field">
                <User size={16} className="field-icon" />
                <input
                  type="text"
                  placeholder="Username"
                  required
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                />
              </div>

              {mode === "signup" && (
                <motion.div
                  className="field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Mail size={16} className="field-icon" />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </motion.div>
              )}

              <div className="field">
                <Lock size={16} className="field-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  required
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="field-trail"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          <motion.button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={submitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
            <ArrowRight size={16} />
          </motion.button>
        </form>

        <p className="auth-foot">
          {mode === "login" ? "New here?" : "Already registered?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="link"
          >
            {mode === "login" ? "Create an account" : "Sign in instead"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
