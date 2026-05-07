import React from "react";
import Modal from "react-modal";
import { Toaster } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import "./App.css";
import { useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

Modal.setAppElement("#root");

const App = () => {
  const { user } = useAuth();

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--surface-2)",
            color: "var(--text-1)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            backdropFilter: "blur(12px)",
          },
          success: { iconTheme: { primary: "var(--accent-2)", secondary: "white" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "white" } },
        }}
      />

      <AnimatePresence mode="wait">
        {user ? (
          <motion.div
            key="dash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Dashboard />
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Login />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default App;
