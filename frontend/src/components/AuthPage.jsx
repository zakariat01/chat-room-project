/**
 * AuthPage.jsx
 *
 * Login / Sign Up screen.
 * Replaces the old LandingPage.jsx username-only flow.
 *
 * Design: uses the same CSS variables already defined in App.css so it
 * inherits the dark theme, fonts, and design tokens automatically.
 * No new global CSS classes needed — all layout is scoped to this component
 * via a <style> block injected once.
 */

import { useState } from "react";
import { useAuth } from "../context/AuthContext";

// ─── Scoped styles ──────────────────────────────────────────────────────────
const STYLES = `
  .auth-page {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg, #0f1117);
    padding: 1rem;
  }

  .auth-card {
    width: 100%;
    max-width: 420px;
    background: var(--color-surface, #1a1d27);
    border: 1px solid var(--color-border, #2a2d3a);
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }

  .auth-logo {
    text-align: center;
    margin-bottom: 1.75rem;
  }
  .auth-logo-icon {
    font-size: 2.5rem;
    display: block;
    margin-bottom: 0.4rem;
  }
  .auth-logo-title {
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--color-text, #e8eaf0);
    margin: 0;
  }
  .auth-logo-sub {
    font-size: 0.8rem;
    color: var(--color-text-muted, #8b8fa8);
    margin: 0.2rem 0 0;
  }

  /* Tabs */
  .auth-tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border, #2a2d3a);
    margin-bottom: 1.5rem;
  }
  .auth-tab {
    flex: 1;
    padding: 0.65rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text-muted, #8b8fa8);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.2s, border-color 0.2s;
  }
  .auth-tab.active {
    color: var(--color-accent, #7c6af7);
    border-bottom-color: var(--color-accent, #7c6af7);
  }

  /* Form */
  .auth-field {
    margin-bottom: 1rem;
  }
  .auth-label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-muted, #8b8fa8);
    margin-bottom: 0.35rem;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  .auth-input {
    width: 100%;
    padding: 0.65rem 0.9rem;
    background: var(--color-input-bg, #12141d);
    border: 1px solid var(--color-border, #2a2d3a);
    border-radius: 0.5rem;
    color: var(--color-text, #e8eaf0);
    font-size: 0.95rem;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }
  .auth-input:focus {
    border-color: var(--color-accent, #7c6af7);
  }
  .auth-input::placeholder {
    color: var(--color-text-muted, #8b8fa8);
    opacity: 0.6;
  }

  /* Error */
  .auth-error {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 0.5rem;
    padding: 0.6rem 0.9rem;
    color: #f87171;
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }

  /* Submit button */
  .auth-btn {
    width: 100%;
    padding: 0.75rem;
    background: var(--color-accent, #7c6af7);
    color: #fff;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 0.25rem;
    transition: opacity 0.2s, transform 0.1s;
  }
  .auth-btn:hover:not(:disabled) { opacity: 0.9; }
  .auth-btn:active:not(:disabled) { transform: scale(0.98); }
  .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Switch link */
  .auth-switch {
    text-align: center;
    margin-top: 1.25rem;
    font-size: 0.85rem;
    color: var(--color-text-muted, #8b8fa8);
  }
  .auth-switch button {
    background: none;
    border: none;
    color: var(--color-accent, #7c6af7);
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0;
    margin-left: 0.25rem;
    font-weight: 600;
  }
  .auth-switch button:hover { text-decoration: underline; }

  /* Loading spinner */
  .auth-spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    vertical-align: middle;
    margin-right: 0.4rem;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─── Component ──────────────────────────────────────────────────────────────

export default function AuthPage() {
  const { login, register } = useAuth();

  const [tab,      setTab]      = useState("login");   // "login" | "signup"
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Login fields
  const [loginId,  setLoginId]  = useState("");
  const [loginPw,  setLoginPw]  = useState("");

  // Signup fields
  const [regUser,  setRegUser]  = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPw,    setRegPw]    = useState("");
  const [regPw2,   setRegPw2]   = useState("");

  const switchTab = (t) => { setTab(t); setError(""); };

  // ── Login submit ──
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!loginId.trim() || !loginPw.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await login(loginId.trim(), loginPw);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Register submit ──
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!regUser.trim() || !regEmail.trim() || !regPw || !regPw2) {
      setError("Please fill in all fields.");
      return;
    }
    if (regPw !== regPw2) {
      setError("Passwords do not match.");
      return;
    }
    if (regPw.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await register(regUser.trim(), regEmail.trim(), regPw);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Inject scoped styles once */}
      <style>{STYLES}</style>

      <div className="auth-page">
        <div className="auth-card">

          {/* Logo */}
          <div className="auth-logo">
            <span className="auth-logo-icon">💬</span>
            <p className="auth-logo-title">ChatRoom</p>
            <p className="auth-logo-sub">Real-time conversations</p>
          </div>

          {/* Tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab${tab === "login"  ? " active" : ""}`}
              onClick={() => switchTab("login")}
            >
              Log In
            </button>
            <button
              className={`auth-tab${tab === "signup" ? " active" : ""}`}
              onClick={() => switchTab("signup")}
            >
              Sign Up
            </button>
          </div>

          {/* Error banner */}
          {error && <div className="auth-error">{error}</div>}

          {/* ── Login form ── */}
          {tab === "login" && (
            <form onSubmit={handleLogin} autoComplete="on">
              <div className="auth-field">
                <label className="auth-label">Username or Email</label>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="Enter your username or email"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  autoFocus
                  autoComplete="username"
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">Password</label>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Enter your password"
                  value={loginPw}
                  onChange={(e) => setLoginPw(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <button className="auth-btn" type="submit" disabled={loading}>
                {loading && <span className="auth-spinner" />}
                {loading ? "Logging in…" : "Log In"}
              </button>
            </form>
          )}

          {/* ── Sign Up form ── */}
          {tab === "signup" && (
            <form onSubmit={handleRegister} autoComplete="on">
              <div className="auth-field">
                <label className="auth-label">Username</label>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="Choose a username (min 3 chars)"
                  value={regUser}
                  onChange={(e) => setRegUser(e.target.value)}
                  autoFocus
                  autoComplete="username"
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">Email</label>
                <input
                  className="auth-input"
                  type="email"
                  placeholder="you@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">Password</label>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Min 6 characters"
                  value={regPw}
                  onChange={(e) => setRegPw(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">Confirm Password</label>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Repeat your password"
                  value={regPw2}
                  onChange={(e) => setRegPw2(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <button className="auth-btn" type="submit" disabled={loading}>
                {loading && <span className="auth-spinner" />}
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>
          )}

          {/* Switch hint */}
          <div className="auth-switch">
            {tab === "login" ? (
              <>No account?<button onClick={() => switchTab("signup")}>Sign up</button></>
            ) : (
              <>Already have an account?<button onClick={() => switchTab("login")}>Log in</button></>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
