/**
 * AuthContext.jsx
 *
 * Provides authentication state and actions to the entire React tree.
 *
 * Usage:
 *   const { user, token, login, register, logout, loading } = useAuth();
 *
 * On mount, if a token exists in localStorage the context automatically
 * calls GET /api/auth/me to verify it is still valid. If the server
 * rejects the token it is cleared so the user sees the login screen.
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem("chat_token"));
  const [loading, setLoading] = useState(true); // true while verifying stored token

  // -------------------------------------------------------------------------
  // On mount: verify stored token
  // -------------------------------------------------------------------------
  useEffect(() => {
    const storedToken = localStorage.getItem("chat_token");
    if (!storedToken) {
      setLoading(false);
      return;
    }

    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Token invalid");
        return r.json();
      })
      .then((data) => {
        setUser(data.user);
        setToken(storedToken);
      })
      .catch(() => {
        // Token is expired or invalid — clear it
        localStorage.removeItem("chat_token");
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------
  const register = useCallback(async (username, email, password) => {
    const r = await fetch(`${API}/api/auth/register`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ username, email, password }),
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Registration failed");

    localStorage.setItem("chat_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------
  const login = useCallback(async (identifier, password) => {
    const r = await fetch(`${API}/api/auth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ username: identifier, password }),
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Login failed");

    localStorage.setItem("chat_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------
  const logout = useCallback(() => {
    localStorage.removeItem("chat_token");
    setToken(null);
    setUser(null);
  }, []);

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------
  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
