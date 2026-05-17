/**
 * App.jsx — Root component
 *
 * Render logic:
 *   loading → full-screen spinner (verifying stored JWT on startup)
 *   !user   → <AuthPage />  (login / sign-up)
 *   user    → <ChatRoom />  (main app)
 *
 * AuthProvider wraps everything so any child can call useAuth().
 */

import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage  from "./components/AuthPage";
import ChatRoom  from "./components/ChatRoom";
import "./App.css";

// ─── Inner component (needs access to useAuth) ───────────────────────────────
function AppInner() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bg, #0f1117)",
      }}>
        <div style={{
          width: "2.5rem",
          height: "2.5rem",
          border: "3px solid rgba(124,106,247,0.3)",
          borderTopColor: "#7c6af7",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        {/* Reuse the keyframe already defined in AuthPage styles or App.css */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <AuthPage />;
  return <ChatRoom />;
}

// ─── Root export (wraps with provider) ───────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
