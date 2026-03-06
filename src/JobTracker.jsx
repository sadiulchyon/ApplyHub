// src/JobTracker.jsx
import { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import { signOut } from "firebase/auth";
import JobBoards from "./JobBoards";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";

const STATUSES = ["Bookmarked", "Applied", "Interview", "Offer", "Rejected"];
const STATUS_LABELS = { Bookmarked: "Planning to Apply" };
const getStatusLabel = (status) => STATUS_LABELS[status] || status;

const STATUS_STYLES = {
  Bookmarked: { bg: "#1a1d2e", color: "#818cf8", border: "#3730a3" },
  Applied:    { bg: "#0f2a1a", color: "#4ade80", border: "#166534" },
  Interview:  { bg: "#2a1f0a", color: "#fbbf24", border: "#92400e" },
  Offer:      { bg: "#0a2a25", color: "#2dd4bf", border: "#134e4a" },
  Rejected:   { bg: "#2a0f14", color: "#fb7185", border: "#9f1239" },
};

const emptyForm = { position: "", advertiser: "", url: "", deadline: "", status: "Bookmarked", interviewDate: "", excitement: 0, comments: "" };

const COLS = [
  { key: "position",   label: "Position" },
  { key: "advertiser", label: "Advertiser" },
  { key: "excitement", label: "Excitement" },
  { key: "deadline",   label: "Deadline" },
  { key: "status",     label: "Status" },
  { key: "comments",   label: "Comments" },
  { key: "actions",    label: "", sortable: false },
];

const DEFAULT_WIDTHS = { position: 190, advertiser: 150, comments: 210, excitement: 108, deadline: 130, status: 170, actions: 80 };
const PAGE_SIZE_OPTIONS = [10, 20, 50];

function Stars({ value, onChange, size = 22 }) {
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
          style={{ cursor: "pointer", fontSize: size, color: n <= active ? "#fbbf24" : "#2d3148", transition: "color 0.1s", userSelect: "none" }}
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
  const [submitError, setSubmitError] = useState("");
  const [colWidths, setColWidths] = useState(DEFAULT_WIDTHS);
  const [editingComments, setEditingComments] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [editingInterviewDate, setEditingInterviewDate] = useState(null);
  const [interviewDateDraft, setInterviewDateDraft] = useState("");
  const [sortCol, setSortCol] = useState("deadline");
  const [sortDir, setSortDir] = useState("asc");
  const [view, setView] = useState("applications");
  const [applicationsPage, setApplicationsPage] = useState(1);
  const [applicationsPageSize, setApplicationsPageSize] = useState(10);
  const [showBoardForm, setShowBoardForm] = useState(false);
  const resizeRef = useRef(null);
  const interviewDateInputRefs = useRef({});
  const seededRef = useRef(false);

  const startResize = (e, key) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { key, startX: e.clientX, startW: colWidths[key] };
    const onMove = (ev) => {
      const delta = ev.clientX - resizeRef.current.startX;
      setColWidths(prev => ({ ...prev, [resizeRef.current.key]: Math.max(60, resizeRef.current.startW + delta) }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleSort = (key) => {
    if (sortCol === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(key); setSortDir("asc"); }
  };

  const updateField = async (id, field, value) => {
    try {
      await updateDoc(doc(db, "users", user.uid, "jobs", id), { [field]: value });
    } catch (err) {
      console.error("Inline update failed:", err);
    }
  };

  const saveInterviewDate = async (id, value) => {
    await updateField(id, "interviewDate", value || "");
  };

  // Reference to this user's jobs collection
  const userJobsRef = collection(db, "users", user.uid, "jobs");

  // Real-time listener — seeds example jobs for first-time users
  useEffect(() => {
    const q = query(userJobsRef, orderBy("createdAt", "desc"));
    const storageKey = `applyhub_seeded_${user.uid}`;
    const unsub = onSnapshot(q, (snap) => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
      if (!seededRef.current && snap.empty && !localStorage.getItem(storageKey)) {
        seededRef.current = true;
        localStorage.setItem(storageKey, "1");
        const ds = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split("T")[0]; };
        const samples = [
          { position: "Remote Sensing Intern", advertiser: "NASA Goddard Space Flight Center", url: "", deadline: ds(23), status: "Bookmarked", excitement: 4, comments: "Focuses on land surface hydrology using MODIS and Landsat — strong fit. Check their current research group before applying.", isSample: true },
          { position: "Water Resources Analyst", advertiser: "USGS", url: "", deadline: ds(-1), status: "Applied", excitement: 5, comments: "Applied via USAJobs. Role involves streamflow modelling and satellite-derived ET. Follow up by end of week.", isSample: true },
          { position: "GIS & Hydrological Modelling Specialist", advertiser: "Deltares", url: "", deadline: ds(8), status: "Interview", interviewDate: ds(3), excitement: 3, comments: "Video interview Thursday. They use SOBEK and Delft3D — review before call. Ask about remote work flexibility.", isSample: true },
          { position: "Postdoctoral Fellow – SAR & Flood Mapping", advertiser: "TU Delft", url: "", deadline: ds(5), status: "Offer", excitement: 5, comments: "2-year position with competitive stipend. Offer expires soon — compare with Deltares role before deciding.", isSample: true },
          { position: "Earth Observation Data Scientist", advertiser: "Planet Labs", url: "", deadline: ds(-47), status: "Rejected", excitement: 2, comments: "Requested feedback after rejection — suggested stronger ML background. Good experience overall.", isSample: true },
        ];
        Promise.all(samples.map(s => addDoc(userJobsRef, { ...s, createdAt: serverTimestamp() })));
      }
    });
    return () => unsub();
  }, [user.uid]);

  const hasSamples = jobs.some(j => j.isSample);

  const clearSamples = async () => {
    await Promise.all(
      jobs.filter(j => j.isSample).map(j => deleteDoc(doc(db, "users", user.uid, "jobs", j.id)))
    );
  };

  const handleSubmit = async () => {
    if (!form.position.trim()) return;
    setSubmitError("");
    try {
      if (editId !== null) {
        await updateDoc(doc(db, "users", user.uid, "jobs", editId), {
          position: form.position,
          advertiser: form.advertiser,
          url: form.url,
          deadline: form.deadline,
          status: form.status,
          interviewDate: form.status === "Interview" ? form.interviewDate || "" : "",
          excitement: form.excitement,
          comments: form.comments,
        });
        setEditId(null);
      } else {
        await addDoc(userJobsRef, { ...form, createdAt: serverTimestamp() });
      }
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      setSubmitError(err.message || "Failed to save. Check Firestore rules.");
    }
  };

  const handleEdit = (job) => {
    setForm({ position: job.position, advertiser: job.advertiser || "", url: job.url, deadline: job.deadline, status: job.status, interviewDate: job.interviewDate || "", excitement: job.excitement || 0, comments: job.comments || "" });
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
    setSubmitError("");
  };

  const filtered = filterStatus === "All" ? jobs : jobs.filter(j => j.status === filterStatus);
  const counts = STATUSES.reduce((acc, s) => { acc[s] = jobs.filter(j => j.status === s).length; return acc; }, {});

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    let av = a[sortCol] ?? "", bv = b[sortCol] ?? "";
    if (sortCol === "excitement") return sortDir === "asc" ? (av||0)-(bv||0) : (bv||0)-(av||0);
    if (sortCol === "deadline") {
      const aEmpty = !av, bEmpty = !bv;
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      av = new Date(av).getTime();
      bv = new Date(bv).getTime();
      return sortDir === "asc" ? av - bv : bv - av;
    }
    return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });


  const totalApplicationPages = Math.max(1, Math.ceil(sorted.length / applicationsPageSize));

  useEffect(() => {
    setApplicationsPage(prev => Math.min(prev, totalApplicationPages));
  }, [totalApplicationPages]);

  useEffect(() => {
    setApplicationsPage(1);
  }, [filterStatus, sortCol, sortDir, applicationsPageSize]);

  const paginatedApplications = sorted.slice((applicationsPage - 1) * applicationsPageSize, applicationsPage * applicationsPageSize);

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
        .icon-btn { background: transparent; border: 1px solid #2d3148; color: #94a3b8; cursor: pointer; border-radius: 6px; padding: 6px 7px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; margin-left: 6px; }
        .icon-btn:hover { color: #e2e8f0; border-color: #6366f1; background: #1a1d2e; }
        .icon-btn-danger:hover { color: #f87171; border-color: #9f1239; background: #2d1515; }
        .col-header { cursor: pointer; user-select: none; }
        .col-header:hover { color: #c7d2fe; }
        .status-select { border-radius: 20px; padding: 3px 6px 3px 12px; font-size: 11px; font-weight: 500; cursor: pointer; outline: none; font-family: inherit; }
        .status-select:focus { box-shadow: 0 0 0 2px #6366f1; }
        .comment-cell { cursor: text; min-height: 20px; border-radius: 4px; padding: 2px 4px; transition: background 0.15s; }
        .comment-cell:hover { background: #1e2235; }
        .comment-textarea { width: 100%; background: #0f1117; border: 1px solid #6366f1; border-radius: 6px; padding: 6px 8px; color: #e2e8f0; font-family: inherit; font-size: 12px; resize: vertical; min-height: 64px; outline: none; }
        .resize-handle { position: absolute; right: 0; top: 0; bottom: 0; width: 5px; cursor: col-resize; z-index: 1; }
        .resize-handle:hover, .resize-handle:active { background: #6366f1; opacity: 0.5; }
        thead th:not(:last-child) { border-right: 1px solid #2d3148; }
        tbody td:not(:last-child) { border-right: 1px solid #1e2235; }
      `}</style>

      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 40, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: "-1px", color: "#fff" }}>Job Tracker</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{user.email}</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* Tab switcher */}
            <div style={{ display: "flex", gap: 6, background: "#161821", border: "1px solid #2d3148", borderRadius: 24, padding: "4px 6px" }}>
              <button
                className={`filter-btn ${view === "applications" ? "active" : ""}`}
                onClick={() => { setView("applications"); setShowBoardForm(false); }}
              >
                Applications
              </button>
              <button
                className={`filter-btn ${view === "boards" ? "active" : ""}`}
                onClick={() => { setView("boards"); setShowForm(false); }}
              >
                Job Boards
              </button>
            </div>
            <button className="btn-ghost" onClick={() => signOut(auth)}>Sign out</button>
          </div>
        </div>

        {view === "boards" && <JobBoards user={user} showForm={showBoardForm} setShowForm={setShowBoardForm} />}

        {view === "applications" && <>
        {/* Stats / Filter — click a card to filter */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
          <div
            onClick={() => setFilterStatus("All")}
            style={{ background: "#161821", border: `1px solid ${filterStatus === "All" ? "#6366f1" : "#2d3148"}`, borderRadius: 10, padding: "10px 16px", minWidth: 100, cursor: "pointer", transition: "border-color 0.2s" }}
          >
            <div style={{ fontSize: 20, fontWeight: 500, color: filterStatus === "All" ? "#818cf8" : "#94a3b8" }}>{jobs.length}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>All</div>
          </div>
          {STATUSES.map(s => (
            <div
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{ background: "#161821", border: `1px solid ${filterStatus === s ? STATUS_STYLES[s].border : "#2d3148"}`, borderRadius: 10, padding: "10px 16px", minWidth: 100, cursor: "pointer", transition: "border-color 0.2s" }}
            >
              <div style={{ fontSize: 20, fontWeight: 500, color: STATUS_STYLES[s].color }}>{counts[s]}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{getStatusLabel(s)}</div>
            </div>
          ))}
        </div>

        {/* Sample banner */}
        {hasSamples && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1a1d2e", border: "1px solid #3730a3", borderRadius: 8, padding: "10px 16px", marginBottom: 16, gap: 12 }}>
            <span style={{ fontSize: 12, color: "#a5b4fc" }}>✦ These are example entries to help you explore the tracker — try editing them inline, then clear them when you're ready to start for real.</span>
            <button className="btn-ghost" style={{ whiteSpace: "nowrap", color: "#818cf8", borderColor: "#3730a3", flexShrink: 0 }} onClick={clearSamples}>Clear examples</button>
          </div>
        )}

        {/* Table */}
        <div style={{ background: "#161821", border: "1px solid #2d3148", borderRadius: 12, overflow: "auto" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 13 }}>Loading...</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <colgroup>
                {COLS.map(c => <col key={c.key} style={{ width: colWidths[c.key] }} />)}
              </colgroup>
              <thead>
                <tr style={{ borderBottom: "1px solid #2d3148" }}>
                  {COLS.map(c => (
                    <th
                      key={c.key}
                      className={c.sortable !== false ? "col-header" : ""}
                      onClick={() => c.sortable !== false && handleSort(c.key)}
                      style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", position: "relative", color: sortCol === c.key ? "#818cf8" : "#64748b" }}
                    >
                      {c.label}
                      {sortCol === c.key && (
                        <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>
                      )}
                      {c.key !== "actions" && (
                        <div className="resize-handle" onMouseDown={e => startResize(e, c.key)} onClick={e => e.stopPropagation()} />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 13 }}>No applications yet.</td></tr>
                )}
                {paginatedApplications.map((job, i) => {
                  const s = STATUS_STYLES[job.status];
                  const isLate = job.deadline && new Date(job.deadline) < new Date() && job.status === "Bookmarked";
                  return (
                    <tr key={job.id} className="row-hover" style={{ borderBottom: i < paginatedApplications.length - 1 ? "1px solid #1e2235" : "none", transition: "background 0.15s" }}>
                      <td style={{ padding: "14px 16px", overflow: "hidden" }}>
                        <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.position}</div>
                        {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#6366f1", textDecoration: "none", opacity: 0.8 }}>View posting ↗</a>}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#94a3b8", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                        {job.advertiser || <span style={{ color: "#2d3148" }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <Stars value={job.excitement || 0} onChange={v => updateField(job.id, "excitement", v)} size={16} />
                      </td>
                      <td style={{ padding: "14px 16px", overflow: "hidden" }}>
                        {job.deadline ? (
                          <span style={{ fontSize: 13, color: isLate ? "#f87171" : "#94a3b8", whiteSpace: "nowrap" }}>
                            {new Date(job.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {isLate && <span style={{ fontSize: 11, marginLeft: 6 }}>overdue</span>}
                          </span>
                        ) : <span style={{ color: "#2d3148" }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <select
                            className="status-select"
                            value={job.status}
                            onChange={async (e) => {
                              const nextStatus = e.target.value;
                              await updateField(job.id, "status", nextStatus);
                              if (nextStatus !== "Interview" && job.interviewDate) {
                                await updateField(job.id, "interviewDate", "");
                              }
                            }}
                            style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                          >
                            {STATUSES.map(st => <option key={st} value={st}>{getStatusLabel(st)}</option>)}
                          </select>
                          {job.status === "Interview" && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <input
                                type="date"
                                value={editingInterviewDate === job.id ? interviewDateDraft : (job.interviewDate || "")}
                                onFocus={() => {
                                  setEditingInterviewDate(job.id);
                                  setInterviewDateDraft(job.interviewDate || "");
                                }}
                                onChange={e => setInterviewDateDraft(e.target.value)}
                                onBlur={async () => {
                                  if (editingInterviewDate !== job.id) return;
                                  await saveInterviewDate(job.id, interviewDateDraft);
                                  setEditingInterviewDate(null);
                                }}
                                onKeyDown={async (e) => {
                                  if (e.key === "Enter") {
                                    e.currentTarget.blur();
                                  }
                                  if (e.key === "Escape") {
                                    setEditingInterviewDate(null);
                                    setInterviewDateDraft(job.interviewDate || "");
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  background: "#0f1117",
                                  border: "1px solid #92400e",
                                  borderRadius: 6,
                                  padding: "5px 8px",
                                  color: "#fbbf24",
                                  fontFamily: "inherit",
                                  fontSize: 11,
                                  outline: "none",
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "10px 16px", overflow: "hidden" }}>
                        {editingComments === job.id ? (
                          <textarea
                            autoFocus
                            className="comment-textarea"
                            value={commentDraft}
                            onChange={e => setCommentDraft(e.target.value)}
                            onBlur={() => { updateField(job.id, "comments", commentDraft); setEditingComments(null); }}
                            onKeyDown={e => { if (e.key === "Escape") setEditingComments(null); }}
                          />
                        ) : (
                          <div className="comment-cell" onClick={() => { setEditingComments(job.id); setCommentDraft(job.comments || ""); }}>
                            {job.comments
                              ? <span style={{ fontSize: 12, color: "#94a3b8", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{job.comments}</span>
                              : <span style={{ fontSize: 12, color: "#2d3148" }}>Click to add…</span>}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <button title="Edit" className="icon-btn" onClick={() => handleEdit(job)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button title="Delete" className="icon-btn icon-btn-danger" onClick={() => handleDelete(job.id)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Showing {sorted.length === 0 ? 0 : (applicationsPage - 1) * applicationsPageSize + 1}–{Math.min(applicationsPage * applicationsPageSize, sorted.length)} of {sorted.length}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: "#94a3b8" }}>
              Rows:
              <select
                value={applicationsPageSize}
                onChange={(e) => setApplicationsPageSize(Number(e.target.value))}
                style={{ marginLeft: 6, background: "#0f1117", color: "#e2e8f0", border: "1px solid #2d3148", borderRadius: 6, padding: "4px 8px", fontFamily: "inherit", fontSize: 12 }}
              >
                {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <button className="btn-ghost" onClick={() => setApplicationsPage(p => Math.max(1, p - 1))} disabled={applicationsPage === 1} style={{ opacity: applicationsPage === 1 ? 0.5 : 1 }}>
              Prev
            </button>
            <span style={{ fontSize: 12, color: "#94a3b8", minWidth: 64, textAlign: "center" }}>Page {applicationsPage} / {totalApplicationPages}</span>
            <button className="btn-ghost" onClick={() => setApplicationsPage(p => Math.min(totalApplicationPages, p + 1))} disabled={applicationsPage >= totalApplicationPages} style={{ opacity: applicationsPage >= totalApplicationPages ? 0.5 : 1 }}>
              Next
            </button>
          </div>
        </div>

        {!showForm && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button
              onClick={() => setShowForm(true)}
              style={{ background: "none", border: "1px dashed #2d3148", color: "#64748b", cursor: "pointer", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 28px", fontFamily: "inherit", borderRadius: 8, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#e2e8f0"; e.currentTarget.style.borderColor = "#6366f1"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "#2d3148"; }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Application
            </button>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div style={{ background: "#161821", border: "1px solid #2d3148", borderRadius: 12, padding: 24, marginTop: 16 }}>
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
                  {STATUSES.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
                </select>
              </div>
              {form.status === "Interview" && (
                <div>
                  <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>INTERVIEW DATE</label>
                  <input type="date" style={inputStyle} value={form.interviewDate} onChange={e => setForm({ ...form, interviewDate: e.target.value })} />
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>EXCITEMENT</label>
                <Stars value={form.excitement} onChange={v => setForm({ ...form, excitement: v })} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>COMMENTS</label>
                <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} placeholder="Notes, impressions, next steps..." value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} />
              </div>
            </div>
            {submitError && (
              <div style={{ marginTop: 12, padding: "8px 12px", background: "#2a0f14", border: "1px solid #9f1239", borderRadius: 6, color: "#fb7185", fontSize: 12 }}>
                {submitError}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn-primary" onClick={handleSubmit}>{editId !== null ? "Save Changes" : "Add Application"}</button>
              <button className="btn-ghost" onClick={handleCancel}>Cancel</button>
            </div>
          </div>
        )}
        </>}
      </div>
    </div>
  );
}
