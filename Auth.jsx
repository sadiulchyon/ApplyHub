// src/Auth.jsx
import { useState } from "react";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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
