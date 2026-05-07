import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const STORAGE_KEY = "fv_auth_user";
const USERS_KEY = "fv_auth_registry";

const loadRegistry = () => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveRegistry = (registry) =>
  localStorage.setItem(USERS_KEY, JSON.stringify(registry));

const hashCode = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem("userId", String(user.id));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const signup = ({ username, password, email }) => {
    const registry = loadRegistry();
    const key = username.trim().toLowerCase();
    if (!key || !password) throw new Error("Username and password required");
    if (registry[key]) throw new Error("Username already exists");
    const id = Object.keys(registry).length + 1;
    registry[key] = {
      id,
      username,
      email: email || "",
      passHash: hashCode(password),
      createdAt: new Date().toISOString(),
    };
    saveRegistry(registry);
    setUser({ id, username, email: email || "" });
    return true;
  };

  const login = ({ username, password }) => {
    const registry = loadRegistry();
    const key = username.trim().toLowerCase();
    const record = registry[key];
    if (!record) throw new Error("User not found. Sign up first.");
    if (record.passHash !== hashCode(password))
      throw new Error("Incorrect password");
    setUser({ id: record.id, username: record.username, email: record.email });
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("userId");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
