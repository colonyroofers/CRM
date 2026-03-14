import React, { useState, useEffect, useMemo } from 'react';
import { C } from '../utils/constants';
import ActivityTimeline from '../components/ActivityTimeline';

    function DailyDigestModule({ user, role, entities, salesLeads, serviceTickets, inspections, crmUsers }) {
      const today = new Date().toISOString().split("T")[0];
      const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      const [ddRefreshKey, setDdRefreshKey] = useState(0);

      // Gather tasks assigned to user across all objects
      const allTaskKeys = Object.keys(localStorage).filter(k => k.startsWith("cr_tasks_"));
      const myTasks = [];
      allTaskKeys.forEach(key => {
        try {
          const tasks = JSON.parse(localStorage.getItem(key) || "[]");
          tasks.filter(t => !t.completed && (t.assignee === user.name || t.createdBy === user.name)).forEach(t => {
            myTasks.push({ ...t, source: key.replace("cr_tasks_", "") });
          });
        } catch(e) { console.warn("Storage/parse error:", e.message); }
      });
      // Also check Firestore collections
      const [firestoreTasks, setFirestoreTasks] = useState([]);
      useEffect(() => {
        if (!firestoreDb) return;
        // We'll just use localStorage tasks for now — Firestore tasks load above
      }, []);

      const todayTasks = myTasks.filter(t => t.dueDate === today);
      const overdueTasks = myTasks.filter(t => t.dueDate && t.dueDate < today);
      const upcomingTasks = myTasks.filter(t => t.dueDate && t.dueDate > today && t.dueDate <= new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]);

      // Today's inspections for this user
      const myInspections = (inspections || []).filter(insp => {
        const inspDate = insp.scheduledDate || insp.createdAt?.split("T")[0];
        return inspDate === today && (insp.inspector === user.name || insp.createdBy === user.name);
      });

      // Active sales leads assigned to or owned by user
      const myLeads = (salesLeads || []).filter(l => l.assignedTo === user.name || l.createdBy === user.name).filter(l => !["awarded", "closed_lost"].includes(l.stage));

      // Active service tickets
      const myTickets = (serviceTickets || []).filter(t => (t.assignedTo === user.name || t.createdBy === user.name) && !["Complete", "Closed"].includes(t.status));

      const [ddEditTask, setDdEditTask] = useState(null);
      const [ddEditTitle, setDdEditTitle] = useState("");
      const [ddEditDue, setDdEditDue] = useState("");
      const [ddEditAssignee, setDdEditAssignee] = useState("");
      const ddActiveUsers = (crmUsers || []).filter(u => u.active !== false);
      const openDdEdit = (t) => { setDdEditTask(t); setDdEditTitle(t.title); setDdEditDue(t.dueDate || ""); setDdEditAssignee(t.assignee || ""); };
      const saveDdEdit = () => {
        if (!ddEditTitle.trim() || !ddEditTask) return;
        const collKey = `cr_tasks_${ddEditTask.source}`;
        try {
          const existing = JSON.parse(localStorage.getItem(collKey) || "[]");
          const updated = existing.map(t => t.id === ddEditTask.id ? { ...t, title: ddEditTitle.trim(), dueDate: ddEditDue || null, assignee: ddEditAssignee } : t);
          localStorage.setItem(collKey, JSON.stringify(updated));
          if (firestoreDb) { firestoreDb.collection("kv").doc(collKey).set({ value: JSON.stringify(updated) }); }
        } catch(ex) {}
        setDdEditTask(null);
        setDdRefreshKey(k => k + 1);
      };
      const cancelDdEdit = () => setDdEditTask(null);

      const TaskRow = ({ t }) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${C.gray100}`, cursor: "pointer" }} onClick={() => openDdEdit(t)} title="Click to edit">
          <span style={{ fontSize: 12, color: C.navy, flex: 1 }}>{t.title}</span>
          {t.assignee && <span style={{ fontSize: 10, color: C.gray400, marginRight: 6 }}>→ {t.assignee}</span>}
          {t.dueDate && <span style={{ fontSize: 10, fontWeight: 600, color: t.dueDate < today ? C.red : t.dueDate === today ? C.yellow : C.gray400 }}>{new Date(t.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
          <span style={{ fontSize: 11, color: C.gray400, marginLeft: 4 }}>✏</span>
        </div>
      );

      return (
        <div style={{ background: C.gray50, minHeight: "calc(100vh - 56px)" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 32px" }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, margin: 0 }}>Daily Digest</h1>
              <p style={{ fontSize: 14, color: C.gray500, margin: "4px 0 0" }}>{todayLabel} — here's what's on your plate, {user.name?.split(" ")[0]}</p>
            </div>

            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: overdueTasks.length > 0 ? C.red : C.navy }}>{todayTasks.length}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, marginTop: 4 }}>Tasks Today</div>
                {overdueTasks.length > 0 && <div style={{ fontSize: 10, color: C.red, fontWeight: 700, marginTop: 4 }}>{overdueTasks.length} overdue</div>}
              </div>
              <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.navy }}>{myInspections.length}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, marginTop: 4 }}>Inspections Today</div>
              </div>
              <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.navy }}>{myLeads.length}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, marginTop: 4 }}>Active Projects</div>
              </div>
              <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.navy }}>{myTickets.length}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, marginTop: 4 }}>Open Tickets</div>
              </div>
            </div>

            {/* Quick Add Task with Object Attachment */}
            {(() => {
              const [qaTask, setQaTask] = useState("");
              const [qaDue, setQaDue] = useState("");
              const [qaAssignee, setQaAssignee] = useState(user?.name || "");
              const [qaObjType, setQaObjType] = useState("");
              const [qaObjId, setQaObjId] = useState("");
              const [qaExpanded, setQaExpanded] = useState(false);
              const activeUsers = (crmUsers || []).filter(u => u.active !== false);
              const { companies = [], properties = [], contacts = [] } = entities || {};

              const objectTypeOptions = [
                { value: "", label: "— No attachment —" },
                { value: "lead", label: "Project" },
                { value: "estimate", label: "Estimate" },
                { value: "company", label: "Company" },
                { value: "property", label: "Property" },
                { value: "contact", label: "Contact" },
                { value: "inspection", label: "Inspection" },
                { value: "service_ticket", label: "Service Ticket" },
                { value: "invoice", label: "Invoice" },
              ];

              const getObjectOptions = () => {
                if (qaObjType === "lead") return (salesLeads || []).map(l => ({ value: l.id, label: l.jobName || l.company || "Project" }));
                if (qaObjType === "company") return companies.map(c => ({ value: c.id, label: c.name }));
                if (qaObjType === "property") return properties.map(p => ({ value: p.id, label: `${p.name} — ${p.address || ""}` }));
                if (qaObjType === "contact") return contacts.map(c => ({ value: c.id, label: `${c.name}${c.email ? ` (${c.email})` : ""}` }));
                if (qaObjType === "inspection") return (inspections || []).map(i => ({ value: i.id, label: `${i.propertyName || i.address || "Inspection"} — ${i.inspector || ""}` }));
                if (qaObjType === "service_ticket") return (serviceTickets || []).map(t => ({ value: t.id, label: `${t.subject} — ${t.status}` }));
                if (qaObjType === "estimate") {
                  // Collect estimates from all Firestore collections starting with cr_estimates_
                  const estKeys = Object.keys(localStorage).filter(k => k.startsWith("cr_estimates_"));
                  const ests = [];
                  estKeys.forEach(k => { try { JSON.parse(localStorage.getItem(k) || "[]").forEach(e => ests.push({ value: `${k.replace("cr_estimates_", "")}_est_${e.id}`, label: `Est: ${e.leadId ? (salesLeads || []).find(l => l.id === e.leadId)?.jobName || "Estimate" : "Estimate"} — $${Number(e.totalPrice || 0).toLocaleString()}` })); } catch(ex) {} });
                  return ests;
                }
                return [];
              };

              const handleQuickAdd = () => {
                if (!qaTask.trim()) return;
                if (!qaAssignee) { alert("Please assign the task."); return; }
                const detectedDate = qaDue || detectDateFromText(qaTask) || null;
                const taskObj = { id: generateId(), title: qaTask.trim(), dueDate: detectedDate, assignee: qaAssignee, completed: false, createdAt: new Date().toISOString(), createdBy: user.name };
                const collKey = qaObjType && qaObjId ? `cr_tasks_${qaObjType}_${qaObjId}` : `cr_tasks_user_${user.email}`;
                try {
                  const existing = JSON.parse(localStorage.getItem(collKey) || "[]");
                  localStorage.setItem(collKey, JSON.stringify([...existing, taskObj]));
                  if (firestoreDb) { firestoreDb.collection("kv").doc(collKey).set({ value: JSON.stringify([...existing, taskObj]) }); }
                } catch(ex) {}
                setQaTask(""); setQaDue(""); setQaAssignee(user?.name || ""); setQaObjType(""); setQaObjId("");
                setDdRefreshKey(k => k + 1);
              };

              return (
                <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, marginBottom: 16, overflow: "hidden" }}>
                  <div onClick={() => setQaExpanded(!qaExpanded)} style={{ padding: "12px 16px", borderBottom: qaExpanded ? `2px solid ${C.green}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>➕ Quick Add Task</span>
                    <span style={{ fontSize: 11, color: C.gray400 }}>{qaExpanded ? "▲" : "▼"}</span>
                  </div>
                  {qaExpanded && (
                    <div style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                        <input value={qaTask} onChange={e => { setQaTask(e.target.value); if (!qaDue) { const d = detectDateFromText(e.target.value); if (d) setQaDue(d); } }} onKeyDown={e => e.key === "Enter" && handleQuickAdd()} placeholder="Task description (dates auto-detected)..." style={{ flex: 1, minWidth: 200, padding: "7px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.navy }} />
                        <input type="date" value={qaDue} onChange={e => setQaDue(e.target.value)} style={{ padding: "7px 8px", border: `1px solid ${qaDue ? C.green + "80" : C.gray300}`, borderRadius: 6, fontSize: 11, color: C.gray600, width: 120 }} />
                      </div>
                      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                        <select value={qaAssignee} onChange={e => setQaAssignee(e.target.value)} style={{ padding: "7px 8px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 11, color: C.gray600, flex: 1, minWidth: 140 }}>
                          {activeUsers.length > 0 ? activeUsers.map(u => <option key={u.id} value={u.name}>{u.name}{u.role ? ` (${ROLE_PRESETS[u.role]?.label || u.role})` : ""}</option>) : <option value={user?.name || ""}>{user?.name || "Me"}</option>}
                        </select>
                        <select value={qaObjType} onChange={e => { setQaObjType(e.target.value); setQaObjId(""); }} style={{ padding: "7px 8px", border: `1px solid ${qaObjType ? C.blue + "80" : C.gray300}`, borderRadius: 6, fontSize: 11, color: C.gray600, flex: 1, minWidth: 140 }}>
                          {objectTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {qaObjType && (() => { const opts = getObjectOptions(); return (
                          <select value={qaObjId} onChange={e => setQaObjId(e.target.value)} style={{ padding: "7px 8px", border: `1px solid ${qaObjId ? C.green + "80" : C.gray300}`, borderRadius: 6, fontSize: 11, color: C.gray600, flex: 1, minWidth: 180 }}>
                            <option value="">— Select {objectTypeOptions.find(o => o.value === qaObjType)?.label} —</option>
                            {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ); })()}
                        <button onClick={handleQuickAdd} style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: C.green, color: C.white, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add Task</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Overdue tasks */}
            {overdueTasks.length > 0 && (
              <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.red}30`, marginBottom: 16, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `2px solid ${C.red}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.red }}>⚠ Overdue Tasks ({overdueTasks.length})</span>
                </div>
                {overdueTasks.map(t => <TaskRow key={t.id} t={t} />)}
              </div>
            )}

            {/* Today's tasks */}
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, marginBottom: 16, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: `2px solid ${C.navy}` }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>📋 Today's Tasks ({todayTasks.length})</span>
              </div>
              {todayTasks.length === 0 ? <div style={{ padding: 20, textAlign: "center", color: C.gray400, fontSize: 12 }}>No tasks due today</div> : todayTasks.map(t => <TaskRow key={t.id} t={t} />)}
            </div>

            {/* Today's inspections */}
            {myInspections.length > 0 && (
              <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, marginBottom: 16, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `2px solid #F59E0B` }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>🔍 Today's Inspections ({myInspections.length})</span>
                </div>
                {myInspections.map(insp => (
                  <div key={insp.id} style={{ padding: "10px 16px", borderBottom: `1px solid ${C.gray100}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{insp.propertyName || insp.address || "Inspection"}</div>
                      <div style={{ fontSize: 10, color: C.gray400 }}>{insp.inspector} · {insp.status || "Scheduled"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming tasks this week */}
            {upcomingTasks.length > 0 && (
              <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, marginBottom: 16, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `2px solid ${C.blue}` }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>📆 Upcoming This Week ({upcomingTasks.length})</span>
                </div>
                {upcomingTasks.map(t => <TaskRow key={t.id} t={t} />)}
              </div>
            )}
          </div>

          {/* Task Edit Modal */}
          {ddEditTask && (
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={cancelDdEdit}>
              <div style={{ background: C.white, borderRadius: 12, padding: 24, width: 420, maxWidth: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.navy, margin: "0 0 16px" }}>Edit Task</h3>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 4 }}>Task Title</label>
                  <input value={ddEditTitle} onChange={e => setDdEditTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && saveDdEdit()} autoFocus style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 13, color: C.navy, boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 4 }}>Due Date</label>
                    <input type="date" value={ddEditDue} onChange={e => setDdEditDue(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.gray600, boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 4 }}>Assignee</label>
                    <select value={ddEditAssignee} onChange={e => setDdEditAssignee(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.gray600, boxSizing: "border-box" }}>
                      {ddActiveUsers.length > 0 ? ddActiveUsers.map(u => <option key={u.id} value={u.name}>{u.name}{u.role ? ` (${ROLE_PRESETS[u.role]?.label || u.role})` : ""}</option>) : <option value={user?.name || ""}>{user?.name || "Me"}</option>}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
                  <button onClick={cancelDdEdit} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray500, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                  <button onClick={saveDdEdit} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: C.green, color: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save Changes</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // MODULE: FINANCE (Invoicing, SOV, Job Costing)


export default DailyDigestModule;
