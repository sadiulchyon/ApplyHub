// src/JobTracker.jsx
import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { signOut } from "firebase/auth";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";

const STATUSES = ["Bookmarked", "Applied", "Interview", "Offer", "Rejected"];

const STATUS_STYLES = {
  Bookmarked: { bg: "#1a1d2e", color: "#818cf8", border: "#3730a3" },
  Applied:    { bg: "#0f2a1a", color: "#4ade80", border: "#166534" },
  Interview:  { bg: "#2a1f0a", color: "#fbbf24", border: "#92400e" },
  Offer:      { bg: "#0a2a25", color: "#2dd4bf", border: "#134e4a" },
  Rejected:   { bg: "#2a0f14", color: "#fb7185", border: "#9f1239" },
};

const emptyForm = { position: "", advertiser: "", url: "", deadline: "", status: "Bookmarked", excitement: 0, comments: "" };

function Stars({ value, onChange }) {
  const [hovered, setHovered] = useState(null);
  const active = hovered ?? value;
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1,2,3,4,5].map(n => (
        <span
          key={n}
          onClick={() => onChange(value === n ? 0 : n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          style={{ cursor: "pointer", fontSize: 22, color: n <= active ? "#fbbf24" : "#2d3148", transition: "color 0.1s", userSelect: "none" }}
        >★</span>
      ))}
    </div>
  );
}

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

export default function JobTracker({ user }) {
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Reference to this user's jobs collection
  const userJobsRef = collection(db, "users", user.uid, "jobs");

  // Real-time listener — only this user's data
  useEffect(() => {
    const q = query(userJobsRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [user.uid]);

  const handleSubmit = async () => {
    if (!form.position.trim()) return;
    if (editId !== null) {
      await updateDoc(doc(db, "users", user.uid, "jobs", editId), {
        position: form.position,
        advertiser: form.advertiser,
        url: form.url,
        deadline: form.deadline,
        status: form.status,
        excitement: form.excitement,
        comments: form.comments,
      });
      setEditId(null);
    } else {
      await addDoc(userJobsRef, { ...form, createdAt: serverTimestamp() });
    }
    setForm(emptyForm);
    setShowForm(false);
  };

  const handleEdit = (job) => {
    setForm({ position: job.position, advertiser: job.advertiser || "", url: job.url, deadline: job.deadline, status: job.status, excitement: job.excitement || 0, comments: job.comments || "" });
    setEditId(job.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "users", user.uid, "jobs", id));
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
  };

  const filtered = filterStatus === "All" ? jobs : jobs.filter(j => j.status === filterStatus);
  const counts = STATUSES.reduce((acc, s) => { acc[s] = jobs.filter(j => j.status === s).length; return acc; }, {});

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", fontFamily: "'DM Mono', 'Courier New', monospace", color: "#e2e8f0", padding: "40px 24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        input:focus, select:focus { border-color: #6366f1 !important; }
        .row-hover:hover { background: #1a1d27 !important; }
        .btn-primary { background: #6366f1; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 500; transition: background 0.2s; }
        .btn-primary:hover { background: #4f46e5; }
        .btn-ghost { background: transparent; color: #94a3b8; border: 1px solid #2d3148; padding: 7px 14px; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 12px; transition: all 0.2s; }
        .btn-ghost:hover { color: #e2e8f0; border-color: #6366f1; }
        .btn-danger { background: transparent; color: #f87171; border: none; cursor: pointer; font-family: inherit; font-size: 12px; padding: 4px 8px; border-radius: 4px; }
        .btn-danger:hover { background: #2d1515; }
        .filter-btn { background: transparent; border: 1px solid #2d3148; padding: 6px 14px; border-radius: 20px; cursor: pointer; font-family: inherit; font-size: 12px; color: #94a3b8; transition: all 0.2s; }
        .filter-btn.active { background: #6366f1; color: #fff; border-color: #6366f1; }
        .filter-btn:hover:not(.active) { border-color: #6366f1; color: #e2e8f0; }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 40, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: "-1px", color: "#fff" }}>Job Tracker</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{user.email}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {!showForm && <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add Application</button>}
            <button className="btn-ghost" onClick={() => signOut(auth)}>Sign out</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
          {STATUSES.map(s => (
            <div key={s} style={{ background: "#161821", border: "1px solid #2d3148", borderRadius: 10, padding: "10px 16px", minWidth: 100 }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: STATUS_STYLES[s].color }}>{counts[s]}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{s}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        {showForm && (
          <div style={{ background: "#161821", border: "1px solid #2d3148", borderRadius: 12, padding: 24, marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16, color: "#94a3b8" }}>
              {editId !== null ? "Edit Application" : "New Application"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>POSITION *</label>
                <input style={inputStyle} placeholder="e.g. Environmental Data Analyst" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>ADVERTISER</label>
                <input style={inputStyle} placeholder="e.g. Acme Corp" value={form.advertiser} onChange={e => setForm({ ...form, advertiser: e.target.value })} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>JOB AD URL</label>
                <input style={inputStyle} placeholder="https://..." value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>DEADLINE</label>
                <input type="date" style={inputStyle} value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>STATUS</label>
                <select style={inputStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>EXCITEMENT</label>
                <Stars value={form.excitement} onChange={v => setForm({ ...form, excitement: v })} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>COMMENTS</label>
                <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} placeholder="Notes, impressions, next steps..." value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn-primary" onClick={handleSubmit}>{editId !== null ? "Save Changes" : "Add Application"}</button>
              <button className="btn-ghost" onClick={handleCancel}>Cancel</button>
            </div>
          </div>
        )}

        {/* Filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {["All", ...STATUSES].map(s => (
            <button key={s} className={`filter-btn ${filterStatus === s ? "active" : ""}`} onClick={() => setFilterStatus(s)}>{s}</button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: "#161821", border: "1px solid #2d3148", borderRadius: 12, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 13 }}>Loading...</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2d3148" }}>
                  {["Position", "Excitement", "Deadline", "Status", ""].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: "#64748b", fontWeight: 500, letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 13 }}>No applications yet.</td></tr>
                )}
                {filtered.map((job, i) => {
                  const s = STATUS_STYLES[job.status];
                  const isLate = job.deadline && new Date(job.deadline) < new Date() && job.status !== "Offer" && job.status !== "Rejected";
                  return (
                    <tr key={job.id} className="row-hover" style={{ borderBottom: i < filtered.length - 1 ? "1px solid #1e2235" : "none", transition: "background 0.15s" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500 }}>{job.position}</div>
                        {job.advertiser && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{job.advertiser}</div>}
                        {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#6366f1", textDecoration: "none", opacity: 0.8 }}>View posting ↗</a>}
                      </td>
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        {[1,2,3,4,5].map(n => (
                          <span key={n} style={{ fontSize: 15, color: n <= (job.excitement || 0) ? "#fbbf24" : "#2d3148" }}>★</span>
                        ))}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {job.deadline ? (
                          <span style={{ fontSize: 13, color: isLate ? "#f87171" : "#94a3b8" }}>
                            {new Date(job.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {isLate && <span style={{ fontSize: 11, marginLeft: 6 }}>overdue</span>}
                          </span>
                        ) : <span style={{ color: "#2d3148" }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 500 }}>
                          {job.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <button className="btn-ghost" style={{ marginRight: 6 }} onClick={() => handleEdit(job)}>Edit</button>
                        <button className="btn-danger" onClick={() => handleDelete(job.id)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
