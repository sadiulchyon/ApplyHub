// src/JobBoards.jsx
import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";

const inputStyle = {
  background: "#0f1117",
  border: "1px solid #2d3148",
  borderRadius: 8,
  padding: "10px 14px",
  color: "#e2e8f0",
  fontFamily: "inherit",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  width: "100%",
};

const SAMPLE_BOARDS = [
  { name: "HigherEdJobs", url: "https://www.higheredjobs.com", isSample: true },
  { name: "AGU Jobs", url: "https://careers.agu.org", isSample: true },
  { name: "ESJobs (Ecological Society)", url: "https://www.esa.org/career-opportunities", isSample: true },
  { name: "Academic Positions", url: "https://academicpositions.com", isSample: true },
  { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs", isSample: true },
];

export default function JobBoards({ user, showForm, setShowForm }) {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editingScoutedId, setEditingScoutedId] = useState(null);
  const [scoutedDraft, setScoutedDraft] = useState("");
  const [addError, setAddError] = useState("");
  const seededRef = useRef(false);

  const userBoardsRef = collection(db, "users", user.uid, "jobboards");

  useEffect(() => {
    const q = query(userBoardsRef, orderBy("createdAt", "asc"));
    const storageKey = `applyhub_boards_seeded_${user.uid}`;
    const unsub = onSnapshot(q, (snap) => {
      setBoards(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
      if (!seededRef.current && snap.empty && !localStorage.getItem(storageKey)) {
        seededRef.current = true;
        localStorage.setItem(storageKey, "1");
        Promise.all(SAMPLE_BOARDS.map(b => addDoc(userBoardsRef, { ...b, createdAt: serverTimestamp() })));
      }
    });
    return () => unsub();
  }, [user.uid]);

  const hasSamples = boards.some(b => b.isSample);

  const clearSamples = async () => {
    await Promise.all(
      boards.filter(b => b.isSample).map(b => deleteDoc(doc(db, "users", user.uid, "jobboards", b.id)))
    );
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAddError("");
    try {
      await addDoc(userBoardsRef, {
        name: newName.trim(),
        url: newUrl.trim(),
        createdAt: serverTimestamp(),
      });
      setNewName("");
      setNewUrl("");
      if (setShowForm) setShowForm(false);
    } catch (err) {
      setAddError(err.code === "permission-denied"
        ? "Permission denied — Firestore rules need to be deployed. Run: firebase deploy --only firestore:rules"
        : (err.message || "Failed to save. Check Firestore rules."));
    }
  };

  const startEdit = (board) => {
    setEditId(board.id);
    setEditName(board.name);
    setEditUrl(board.url || "");
  };

  const saveEdit = async (id) => {
    if (!editName.trim()) return;
    await updateDoc(doc(db, "users", user.uid, "jobboards", id), {
      name: editName.trim(),
      url: editUrl.trim(),
    });
    setEditId(null);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "users", user.uid, "jobboards", id));
  };

  const saveLastScouted = async (id, date) => {
    await updateDoc(doc(db, "users", user.uid, "jobboards", id), { lastScouted: date });
    setEditingScoutedId(null);
  };

  const formatScouted = (date) => {
    if (!date) return null;
    const d = new Date(date + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const today = () => new Date().toISOString().split("T")[0];

  return (
    <div>
      {/* Sample banner */}
      {hasSamples && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1a1d2e", border: "1px solid #3730a3", borderRadius: 8, padding: "10px 16px", marginBottom: 16, gap: 12 }}>
          <span style={{ fontSize: 12, color: "#a5b4fc" }}>✦ These are example job boards to get you started — add your own and clear these when ready.</span>
          <button className="btn-ghost" style={{ whiteSpace: "nowrap", color: "#818cf8", borderColor: "#3730a3", flexShrink: 0 }} onClick={clearSamples}>Clear examples</button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "#161821", border: "1px solid #2d3148", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 13 }}>Loading...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2d3148" }}>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", color: "#64748b", width: 220 }}>BOARD NAME</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", color: "#64748b" }}>URL</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", color: "#64748b", width: 170 }}>LAST SCOUTED</th>
                <th style={{ padding: "12px 20px", width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {boards.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 13 }}>
                    No job boards yet. Use the button below to add one.
                  </td>
                </tr>
              )}
              {boards.map((board, i) => (
                <tr key={board.id} className="row-hover" style={{ borderBottom: i < boards.length - 1 ? "1px solid #1e2235" : "none", transition: "background 0.15s" }}>
                  <td style={{ padding: "14px 20px" }}>
                    {editId === board.id ? (
                      <input
                        autoFocus
                        style={{ ...inputStyle, padding: "6px 10px", fontSize: 13 }}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(board.id); if (e.key === "Escape") setEditId(null); }}
                      />
                    ) : (
                      <span style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500 }}>{board.name}</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    {editId === board.id ? (
                      <input
                        style={{ ...inputStyle, padding: "6px 10px", fontSize: 13 }}
                        value={editUrl}
                        onChange={e => setEditUrl(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(board.id); if (e.key === "Escape") setEditId(null); }}
                      />
                    ) : board.url ? (
                      <a
                        href={board.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 13, color: "#6366f1", textDecoration: "none" }}
                        onMouseEnter={e => e.target.style.textDecoration = "underline"}
                        onMouseLeave={e => e.target.style.textDecoration = "none"}
                      >
                        {board.url}
                      </a>
                    ) : (
                      <span style={{ color: "#2d3148", fontSize: 13 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 20px" }}>
                    {editingScoutedId === board.id ? (
                      <input
                        autoFocus
                        type="date"
                        style={{ ...inputStyle, padding: "5px 8px", fontSize: 12, width: "auto" }}
                        value={scoutedDraft}
                        onChange={e => setScoutedDraft(e.target.value)}
                        onBlur={() => { if (scoutedDraft) saveLastScouted(board.id, scoutedDraft); else setEditingScoutedId(null); }}
                        onKeyDown={e => { if (e.key === "Enter") saveLastScouted(board.id, scoutedDraft); if (e.key === "Escape") setEditingScoutedId(null); }}
                      />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          onClick={() => { setEditingScoutedId(board.id); setScoutedDraft(board.lastScouted || today()); }}
                          style={{ fontSize: 13, color: board.lastScouted ? "#94a3b8" : "#2d3148", cursor: "pointer" }}
                          title="Click to change date"
                        >
                          {board.lastScouted ? formatScouted(board.lastScouted) : "—"}
                        </span>
                        <button
                          onClick={() => saveLastScouted(board.id, today())}
                          title="Mark as today"
                          style={{ background: "none", border: "1px solid #2d3148", color: "#64748b", cursor: "pointer", fontSize: 10, padding: "2px 7px", borderRadius: 4, fontFamily: "inherit", whiteSpace: "nowrap" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#818cf8"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "#2d3148"; e.currentTarget.style.color = "#64748b"; }}
                        >
                          Today
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right", whiteSpace: "nowrap" }}>
                    {editId === board.id ? (
                      <>
                        <button className="btn-primary" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => saveEdit(board.id)}>Save</button>
                        <button className="btn-ghost" style={{ marginLeft: 6, padding: "5px 10px", fontSize: 12 }} onClick={() => setEditId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button title="Edit" className="icon-btn" onClick={() => startEdit(board)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button title="Delete" className="icon-btn icon-btn-danger" onClick={() => handleDelete(board.id)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!showForm && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            onClick={() => setShowForm(true)}
            style={{ background: "none", border: "1px dashed #2d3148", color: "#64748b", cursor: "pointer", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 28px", fontFamily: "inherit", borderRadius: 8, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#e2e8f0"; e.currentTarget.style.borderColor = "#6366f1"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "#2d3148"; }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Board
          </button>
        </div>
      )}

      {/* Add form */}
      {showForm && <div style={{ background: "#161821", border: "1px solid #2d3148", borderRadius: 12, padding: 20, marginTop: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: "0 0 220px" }}>
            <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>BOARD NAME *</label>
            <input
              style={inputStyle}
              placeholder="e.g. HigherEdJobs"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>URL</label>
            <input
              style={inputStyle}
              placeholder="https://..."
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
          </div>
          <button
            className="btn-primary"
            onClick={handleAdd}
            style={{ whiteSpace: "nowrap", flexShrink: 0 }}
          >
            + Add Board
          </button>
          <button
            className="btn-ghost"
            onClick={() => { setShowForm(false); setNewName(""); setNewUrl(""); setAddError(""); }}
            style={{ whiteSpace: "nowrap", flexShrink: 0 }}
          >
            Cancel
          </button>
        </div>
        {addError && (
          <div style={{ marginTop: 12, padding: "8px 12px", background: "#2a0f14", border: "1px solid #9f1239", borderRadius: 6, color: "#fb7185", fontSize: 12 }}>
            {addError}
          </div>
        )}
      </div>}
    </div>
  );
}
