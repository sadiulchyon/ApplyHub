// src/Auth.jsx
import { useState } from "react";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

const inputStyle = {
  width: "100%",
  background: "#0f1117",
  border: "1px solid #2d3148",
  borderRadius: 8,
  padding: "10px 14px",
  color: "#e2e8f0",
  fontFamily: "inherit",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

export default function Auth() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError(e.message.replace("Firebase: ", "").replace(/\(.*\)/, "").trim());
    }
    setLoading(false);
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      setError(e.message.replace("Firebase: ", "").replace(/\(.*\)/, "").trim());
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', 'Courier New', monospace", color: "#e2e8f0", padding: 24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');`}</style>
      <div style={{ width: "100%", maxWidth: 380, background: "#161821", border: "1px solid #2d3148", borderRadius: 16, padding: 36 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Job Tracker</div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 28 }}>
          {mode === "login" ? "Sign in to your account" : "Create a new account"}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>EMAIL</label>
          <input style={inputStyle} type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKey} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>PASSWORD</label>
          <input style={inputStyle} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKey} />
        </div>

        {error && (
          <div style={{ background: "#2d1515", border: "1px solid #f87171", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#f87171", marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: "100%", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#2d3148" }} />
          <span style={{ fontSize: 11, color: "#64748b" }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "#2d3148" }} />
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{ width: "100%", background: "#161821", color: "#e2e8f0", border: "1px solid #2d3148", borderRadius: 8, padding: "11px", fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1 }}
        >
          <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
          Continue with Google
        </button>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "#64748b" }}>
          {mode === "login" ? "No account? " : "Have an account? "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
