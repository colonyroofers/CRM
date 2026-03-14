import React, { useState } from 'react';
import { C } from '../utils/constants';
import TasksPanel from '../components/TasksPanel';

    function TaskManagerModule({ user, role, entities, salesLeads, serviceTickets, inspections, crmUsers }) {
      const today = new Date().toISOString().split("T")[0];
      const isMobile = useIsMobile();
      const isAdmin = role === "admin" || role === "coordinator";
      const activeUsers = (crmUsers || []).filter(u => u.active !== false);

      // Gather ALL tasks from localStorage cr_tasks_* keys
      const [allTasks, setAllTasks] = useState([]);
      const [refreshKey, setRefreshKey] = useState(0);
      useEffect(() => {
        const tasks = [];
        const keys = Object.keys(localStorage).filter(k => k.startsWith("cr_tasks_"));
        keys.forEach(key => {
          try {
            const arr = JSON.parse(localStorage.getItem(key) || "[]");
            const source = key.replace("cr_tasks_", "");
            arr.forEach(t => tasks.push({ ...t, _source: source, _key: key }));
          } catch(e) { console.warn("Storage/parse error:", e.message); }
        });
        setAllTasks(tasks);
      }, [refreshKey]);

      // Filters
      const [filterAssignee, setFilterAssignee] = useState("mine");
      const [filterStatus, setFilterStatus] = useState("open");
      const [filterSearch, setFilterSearch] = useState("");
      const [sortBy, setSortBy] = useState("due"); // due, created, alpha
      const [selectedTask, setSelectedTask] = useState(null);

      // Quick add
      const [newTask, setNewTask] = useState("");
      const [newDue, setNewDue] = useState("");
      const [newAssignee, setNewAssignee] = useState(user?.name || "");
      const [newObjType, setNewObjType] = useState("");
      const [newObjId, setNewObjId] = useState("");

      // Edit state
      const [editingId, setEditingId] = useState(null);
      const [editTitle, setEditTitle] = useState("");
      const [editDue, setEditDue] = useState("");
      const [editAssignee, setEditAssignee] = useState("");

      // Resolve source label
      const resolveSource = (source) => {
        if (source.startsWith("user_")) return "Personal";
        const parts = source.split("_");
        if (parts.length >= 2) {
          const type = parts[0];
          const labels = { lead: "Project", company: "Company", property: "Property", contact: "Contact", ticket: "Ticket", inspection: "Inspection", estimate: "Estimate" };
          return labels[type] || type;
        }
        return source;
      };

      // Filter tasks
      const filtered = allTasks.filter(t => {
        if (filterStatus === "open" && t.completed) return false;
        if (filterStatus === "completed" && !t.completed) return false;
        if (filterAssignee === "mine" && t.assignee !== user.name && t.createdBy !== user.name) return false;
        if (filterAssignee !== "mine" && filterAssignee !== "all" && t.assignee !== filterAssignee) return false;
        if (filterSearch && !t.title?.toLowerCase().includes(filterSearch.toLowerCase())) return false;
        return true;
      }).sort((a, b) => {
        if (sortBy === "due") {
          if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return 0;
        }
        if (sortBy === "created") return (b.createdAt || "").localeCompare(a.createdAt || "");
        if (sortBy === "alpha") return (a.title || "").localeCompare(b.title || "");
        return 0;
      });

      const overdue = filtered.filter(t => !t.completed && t.dueDate && t.dueDate < today);
      const dueToday = filtered.filter(t => !t.completed && t.dueDate === today);
      const upcoming = filtered.filter(t => !t.completed && t.dueDate && t.dueDate > today);
      const noDue = filtered.filter(t => !t.completed && !t.dueDate);
      const completedTasks = filtered.filter(t => t.completed);
      // Always gather completed tasks for the "Completed" section, even when filter is "open"
      const allCompletedForUser = allTasks.filter(t => t.completed && (filterAssignee === "all" || filterAssignee === "mine" ? (t.assignee === user.name || t.createdBy === user.name) : t.assignee === filterAssignee)).sort((a, b) => (b.completedAt || b.createdAt || "").localeCompare(a.completedAt || a.createdAt || ""));
      const [showCompleted, setShowCompleted] = useState(false);
      const totalOpen = allTasks.filter(t => !t.completed).length;
      const myOpen = allTasks.filter(t => !t.completed && (t.assignee === user.name || t.createdBy === user.name)).length;
      const overdueCount = allTasks.filter(t => !t.completed && t.dueDate && t.dueDate < today).length;

      const [fadingTasks, setFadingTasks] = useState(new Set());

      const toggleTask = (task) => {
        const wasCompleted = task.completed;
        try {
          const existing = JSON.parse(localStorage.getItem(task._key) || "[]");
          const updated = existing.map(t => t.id === task.id ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null } : t);
          localStorage.setItem(task._key, JSON.stringify(updated));
          if (firestoreDb) firestoreDb.collection("kv").doc(task._key).set({ value: JSON.stringify(updated) });
        } catch(e) { console.warn("Storage/parse error:", e.message); }
        // If completing a task, fade it out after 1.5s
        if (!wasCompleted) {
          setFadingTasks(prev => new Set([...prev, task.id]));
          setTimeout(() => { setFadingTasks(prev => { const n = new Set(prev); n.delete(task.id); return n; }); setRefreshKey(k => k + 1); }, 1500);
        } else {
          setRefreshKey(k => k + 1);
        }
      };

      const deleteTask = (task) => {
        if (!confirm("Delete this task?")) return;
        try {
          const existing = JSON.parse(localStorage.getItem(task._key) || "[]");
          const updated = existing.filter(t => t.id !== task.id);
          localStorage.setItem(task._key, JSON.stringify(updated));
          if (firestoreDb) firestoreDb.collection("kv").doc(task._key).set({ value: JSON.stringify(updated) });
        } catch(e) { console.warn("Storage/parse error:", e.message); }
        setRefreshKey(k => k + 1);
      };

      const saveEdit = (task) => {
        if (!editTitle.trim()) return;
        try {
          const existing = JSON.parse(localStorage.getItem(task._key) || "[]");
          const updated = existing.map(t => t.id === task.id ? { ...t, title: editTitle.trim(), dueDate: editDue || null, assignee: editAssignee } : t);
          localStorage.setItem(task._key, JSON.stringify(updated));
          if (firestoreDb) firestoreDb.collection("kv").doc(task._key).set({ value: JSON.stringify(updated) });
        } catch(e) { console.warn("Storage/parse error:", e.message); }
        setEditingId(null);
        setRefreshKey(k => k + 1);
      };

      const handleQuickAdd = () => {
        if (!newTask.trim()) return;
        const detectedDate = newDue || detectDateFromText(newTask) || null;
        const taskObj = { id: generateId(), title: newTask.trim(), dueDate: detectedDate, assignee: newAssignee || user.name, completed: false, createdAt: new Date().toISOString(), createdBy: user.name };
        const collKey = newObjType && newObjId ? `cr_tasks_${newObjType}_${newObjId}` : `cr_tasks_user_${user.email}`;
        try {
          const existing = JSON.parse(localStorage.getItem(collKey) || "[]");
          localStorage.setItem(collKey, JSON.stringify([...existing, taskObj]));
          if (firestoreDb) firestoreDb.collection("kv").doc(collKey).set({ value: JSON.stringify([...existing, taskObj]) });
        } catch(e) { console.warn("Storage/parse error:", e.message); }
        setNewTask(""); setNewDue(""); setNewAssignee(user?.name || ""); setNewObjType(""); setNewObjId("");
        setRefreshKey(k => k + 1);
      };

      const getObjectOptions = () => {
        const { companies = [], properties = [], contacts = [] } = entities || {};
        if (newObjType === "lead") return (salesLeads || []).map(l => ({ value: l.id, label: l.jobName || l.company || "Project" }));
        if (newObjType === "company") return companies.map(c => ({ value: c.id, label: c.name }));
        if (newObjType === "property") return properties.map(p => ({ value: p.id, label: p.name || p.address || "Property" }));
        if (newObjType === "contact") return contacts.map(c => ({ value: c.id, label: c.name }));
        if (newObjType === "service_ticket") return (serviceTickets || []).map(t => ({ value: t.id, label: t.subject || "Ticket" }));
        return [];
      };

      const getDueBadge = (t) => {
        if (!t.dueDate) return null;
        const isOverdue = t.dueDate < today;
        const isToday = t.dueDate === today;
        const color = isOverdue ? C.red : isToday ? "#D97706" : C.gray500;
        const bg = isOverdue ? "#FEE2E2" : isToday ? "#FEF3C7" : C.gray100;
        const label = isOverdue ? "Overdue" : isToday ? "Today" : new Date(t.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return React.createElement("span", { style: { padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, color, background: bg } }, label);
      };

      const TaskRow = ({ t }) => {
        if (editingId === t.id) {
          return React.createElement("div", { style: { padding: "12px 16px", background: C.white, borderRadius: 8, border: `1px solid ${C.blue}`, marginBottom: 6 } },
            React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" } },
              React.createElement("input", { value: editTitle, onChange: e => setEditTitle(e.target.value), onKeyDown: e => e.key === "Enter" && saveEdit(t), autoFocus: true, style: { flex: 1, minWidth: 200, padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 13, color: C.navy, outline: "none" } }),
              React.createElement("input", { type: "date", value: editDue, onChange: e => setEditDue(e.target.value), style: { padding: "8px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.gray600, width: 140 } })
            ),
            React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center" } },
              React.createElement("select", { value: editAssignee, onChange: e => setEditAssignee(e.target.value), style: { padding: "7px 8px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.gray600, flex: 1, maxWidth: 200 } },
                activeUsers.length > 0 ? activeUsers.map(u => React.createElement("option", { key: u.id, value: u.name }, u.name)) : React.createElement("option", { value: user?.name || "" }, user?.name || "Me")
              ),
              React.createElement("button", { onClick: () => saveEdit(t), style: { padding: "7px 16px", borderRadius: 6, border: "none", background: C.green, color: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "Save"),
              React.createElement("button", { onClick: () => setEditingId(null), style: { padding: "7px 14px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray500, fontSize: 12, cursor: "pointer" } }, "Cancel")
            )
          );
        }
        const isFading = fadingTasks.has(t.id);
        return React.createElement("div", { onClick: () => { setEditingId(t.id); setEditTitle(t.title); setEditDue(t.dueDate || ""); setEditAssignee(t.assignee || ""); }, style: { display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: isFading ? C.greenBg : C.white, borderRadius: 8, border: `1px solid ${isFading ? C.green + "40" : C.gray200}`, marginBottom: 4, transition: "all 0.5s ease", cursor: "pointer", opacity: isFading ? 0.5 : 1 },
          onMouseEnter: e => { if (!isFading) e.currentTarget.style.borderColor = C.blue + "60"; },
          onMouseLeave: e => { if (!isFading) e.currentTarget.style.borderColor = C.gray200; } },
          React.createElement("input", { type: "checkbox", checked: !!t.completed || isFading, onClick: e => e.stopPropagation(), onChange: e => { e.stopPropagation(); toggleTask(t); }, style: { width: 18, height: 18, cursor: "pointer", accentColor: C.green, flexShrink: 0 } }),
          React.createElement("div", { style: { flex: 1, minWidth: 0 } },
            React.createElement("div", { style: { fontSize: 13, fontWeight: 500, color: t.completed ? C.gray400 : C.navy, textDecoration: t.completed ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, t.title),
            React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", marginTop: 3, flexWrap: "wrap" } },
              t.assignee && React.createElement("span", { style: { fontSize: 10, color: C.gray400 } }, "→ " + t.assignee),
              React.createElement("span", { style: { fontSize: 10, color: C.gray400, padding: "1px 6px", background: C.gray50, borderRadius: 3 } }, resolveSource(t._source))
            )
          ),
          getDueBadge(t),
          React.createElement("button", { onClick: e => { e.stopPropagation(); deleteTask(t); }, style: { background: "none", border: "none", color: C.gray300, cursor: "pointer", fontSize: 14, padding: "2px 6px", borderRadius: 4 }, title: "Delete task", onMouseEnter: e => e.currentTarget.style.color = C.red, onMouseLeave: e => e.currentTarget.style.color = C.gray300 }, "✕")
        );
      };

      const SectionHeader = ({ label, count, color }) => React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, marginTop: 16 } },
        React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: color || C.navy } }, label),
        React.createElement("span", { style: { fontSize: 10, fontWeight: 700, color: C.white, background: color || C.gray400, borderRadius: 10, padding: "1px 8px", minWidth: 18, textAlign: "center" } }, count)
      );

      return React.createElement("div", { style: { background: C.gray50, minHeight: "calc(100vh - 56px)" } },
        React.createElement("div", { style: { maxWidth: 900, margin: "0 auto", padding: isMobile ? "20px 16px" : "28px 32px" } },
          // Header
          React.createElement("div", { style: { marginBottom: 20 } },
            React.createElement("h1", { style: { fontSize: 24, fontWeight: 800, color: C.navy, margin: 0 } }, "Tasks"),
            React.createElement("p", { style: { fontSize: 14, color: C.gray500, margin: "4px 0 0" } }, "All tasks across projects, tickets, and personal items")
          ),
          // Stat cards
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 20 } },
            React.createElement("div", { style: { background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: "14px 16px", textAlign: "center" } },
              React.createElement("div", { style: { fontSize: 28, fontWeight: 800, color: C.navy } }, myOpen),
              React.createElement("div", { style: { fontSize: 11, fontWeight: 600, color: C.gray500, marginTop: 2 } }, "My Open Tasks")
            ),
            React.createElement("div", { style: { background: C.white, borderRadius: 10, border: `1px solid ${overdueCount > 0 ? C.red + "40" : C.gray200}`, padding: "14px 16px", textAlign: "center" } },
              React.createElement("div", { style: { fontSize: 28, fontWeight: 800, color: overdueCount > 0 ? C.red : C.navy } }, overdueCount),
              React.createElement("div", { style: { fontSize: 11, fontWeight: 600, color: C.gray500, marginTop: 2 } }, "Overdue")
            ),
            React.createElement("div", { style: { background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: "14px 16px", textAlign: "center" } },
              React.createElement("div", { style: { fontSize: 28, fontWeight: 800, color: "#D97706" } }, dueToday.length),
              React.createElement("div", { style: { fontSize: 11, fontWeight: 600, color: C.gray500, marginTop: 2 } }, "Due Today")
            ),
            React.createElement("div", { style: { background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: "14px 16px", textAlign: "center" } },
              React.createElement("div", { style: { fontSize: 28, fontWeight: 800, color: C.navy } }, totalOpen),
              React.createElement("div", { style: { fontSize: 11, fontWeight: 600, color: C.gray500, marginTop: 2 } }, "All Open")
            )
          ),
          // Quick add
          React.createElement("div", { style: { background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: 16, marginBottom: 16 } },
            React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 } }, "➕ Add Task"),
            React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: newObjType ? 8 : 0 } },
              React.createElement("input", { value: newTask, onChange: e => { setNewTask(e.target.value); if (!newDue) { const d = detectDateFromText(e.target.value); if (d) setNewDue(d); } }, onKeyDown: e => e.key === "Enter" && handleQuickAdd(), placeholder: "Add a task... (dates auto-detected)", style: { flex: 1, minWidth: 200, padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 13, color: C.navy, outline: "none" } }),
              React.createElement("input", { type: "date", value: newDue, onChange: e => setNewDue(e.target.value), style: { padding: "8px 10px", border: `1px solid ${newDue ? C.green + "80" : C.gray300}`, borderRadius: 6, fontSize: 12, color: C.gray600, width: 130 } }),
              React.createElement("select", { value: newAssignee, onChange: e => setNewAssignee(e.target.value), style: { padding: "8px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.gray600, width: 150 } },
                activeUsers.length > 0 ? activeUsers.map(u => React.createElement("option", { key: u.id, value: u.name }, u.name)) : React.createElement("option", { value: user?.name || "" }, user?.name || "Me")
              ),
              React.createElement("select", { value: newObjType, onChange: e => { setNewObjType(e.target.value); setNewObjId(""); }, style: { padding: "8px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.gray600, width: 130 } },
                React.createElement("option", { value: "" }, "Personal"),
                React.createElement("option", { value: "lead" }, "Project"),
                React.createElement("option", { value: "company" }, "Company"),
                React.createElement("option", { value: "contact" }, "Contact"),
                React.createElement("option", { value: "service_ticket" }, "Ticket")
              ),
              React.createElement("button", { onClick: handleQuickAdd, style: { padding: "8px 18px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, color: C.white, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" } }, "+ Add")
            ),
            newObjType && React.createElement("select", { value: newObjId, onChange: e => setNewObjId(e.target.value), style: { padding: "8px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.gray600, width: "100%" } },
              React.createElement("option", { value: "" }, "— Select " + (newObjType === "lead" ? "project" : newObjType === "service_ticket" ? "ticket" : newObjType) + " —"),
              ...getObjectOptions().map(o => React.createElement("option", { key: o.value, value: o.value }, o.label))
            )
          ),
          // Filters bar
          React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" } },
            React.createElement("input", { value: filterSearch, onChange: e => setFilterSearch(e.target.value), placeholder: "Search tasks...", style: { flex: 1, minWidth: 160, padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 13, color: C.navy, outline: "none" } }),
            React.createElement("select", { value: filterAssignee, onChange: e => setFilterAssignee(e.target.value), style: { padding: "8px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.gray600 } },
              React.createElement("option", { value: "mine" }, "My Tasks"),
              React.createElement("option", { value: "all" }, "All Tasks"),
              ...activeUsers.map(u => React.createElement("option", { key: u.id, value: u.name }, u.name))
            ),
            React.createElement("select", { value: filterStatus, onChange: e => setFilterStatus(e.target.value), style: { padding: "8px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.gray600 } },
              React.createElement("option", { value: "open" }, "Open"),
              React.createElement("option", { value: "completed" }, "Completed"),
              React.createElement("option", { value: "all" }, "All")
            ),
            React.createElement("select", { value: sortBy, onChange: e => setSortBy(e.target.value), style: { padding: "8px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.gray600 } },
              React.createElement("option", { value: "due" }, "Sort: Due Date"),
              React.createElement("option", { value: "created" }, "Sort: Newest"),
              React.createElement("option", { value: "alpha" }, "Sort: A-Z")
            )
          ),
          // Task list grouped by status
          filterStatus !== "completed" && overdue.length > 0 && React.createElement(React.Fragment, null,
            React.createElement(SectionHeader, { label: "Overdue", count: overdue.length, color: C.red }),
            overdue.map(t => React.createElement(TaskRow, { key: t.id + t._key, t }))
          ),
          filterStatus !== "completed" && dueToday.length > 0 && React.createElement(React.Fragment, null,
            React.createElement(SectionHeader, { label: "Due Today", count: dueToday.length, color: "#D97706" }),
            dueToday.map(t => React.createElement(TaskRow, { key: t.id + t._key, t }))
          ),
          filterStatus !== "completed" && upcoming.length > 0 && React.createElement(React.Fragment, null,
            React.createElement(SectionHeader, { label: "Upcoming", count: upcoming.length, color: C.blue }),
            upcoming.map(t => React.createElement(TaskRow, { key: t.id + t._key, t }))
          ),
          filterStatus !== "completed" && noDue.length > 0 && React.createElement(React.Fragment, null,
            React.createElement(SectionHeader, { label: "No Due Date", count: noDue.length, color: C.gray400 }),
            noDue.map(t => React.createElement(TaskRow, { key: t.id + t._key, t }))
          ),
          filterStatus === "completed" && completedTasks.length > 0 && React.createElement(React.Fragment, null,
            React.createElement(SectionHeader, { label: "Completed", count: completedTasks.length, color: C.green }),
            completedTasks.map(t => React.createElement(TaskRow, { key: t.id + t._key, t }))
          ),
          filterStatus === "open" && allCompletedForUser.length > 0 && React.createElement("div", { style: { marginTop: 24, borderTop: `1px solid ${C.gray200}`, paddingTop: 16 } },
            React.createElement("button", { onClick: () => setShowCompleted(!showCompleted), style: { display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "4px 0", fontSize: 12, fontWeight: 700, color: C.gray500 } },
              React.createElement("span", { style: { transform: showCompleted ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" } }, "▶"),
              "Completed (" + allCompletedForUser.length + ")"
            ),
            showCompleted && allCompletedForUser.slice(0, 25).map(t => React.createElement(TaskRow, { key: t.id + t._key, t }))
          ),
          filtered.length === 0 && React.createElement("div", { style: { padding: 40, textAlign: "center", color: C.gray400 } },
            React.createElement("div", { style: { fontSize: 32, marginBottom: 8 } }, "✅"),
            React.createElement("div", { style: { fontSize: 14, fontWeight: 600 } }, filterStatus === "open" ? "No open tasks — nice work!" : "No tasks match your filters")
          )
        )
      );
    }

    // ============================================================
    // MODULE: DAILY DIGEST


export default TaskManagerModule;
