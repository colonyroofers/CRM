import React, { useState, useRef, useCallback } from 'react';
import { C, generateId } from '../utils/constants';
import { detectDateFromText } from '../utils/helpers';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { ROLE_PRESETS } from '../utils/constants';

    function TasksPanel({ objectType, objectId, user, crmUsers }) {
      const collectionKey = `cr_tasks_${objectType}_${objectId}`;
      const [tasks, saveTasks] = useFirestoreCollection(collectionKey, []);
      const tasksRef = useRef(tasks); tasksRef.current = tasks;
      const setTasks = useCallback(u => { const n = typeof u === "function" ? u(tasksRef.current) : u; saveTasks(n); }, [saveTasks]);
      const [newTask, setNewTask] = useState("");
      const [newDue, setNewDue] = useState("");
      const [newAssignee, setNewAssignee] = useState(user?.name || "");
      const [showCompleted, setShowCompleted] = useState(false);
      const activeUsers = (crmUsers || []).filter(u => u.active !== false);

      // AI date detection: auto-detect dates as user types
      const handleTaskInput = (text) => {
        setNewTask(text);
        if (!newDue) {
          const detected = detectDateFromText(text);
          if (detected) setNewDue(detected);
        }
      };

      const addTask = () => {
        if (!newTask.trim()) return;
        if (!newAssignee) { alert("Please assign the task to a user."); return; }
        const detectedDate = newDue || detectDateFromText(newTask) || null;
        setTasks(prev => [...prev, { id: generateId(), title: newTask.trim(), dueDate: detectedDate, assignee: newAssignee, completed: false, createdAt: new Date().toISOString(), createdBy: user.name }]);
        setNewTask(""); setNewDue(""); setNewAssignee(user?.name || "");
      };

      const toggleTask = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null } : t));
      const removeTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));
      const [editingTask, setEditingTask] = useState(null);
      const [editTitle, setEditTitle] = useState("");
      const [editDue, setEditDue] = useState("");
      const [editAssignee, setEditAssignee] = useState("");
      const openEditTask = (t) => { setEditingTask(t.id); setEditTitle(t.title); setEditDue(t.dueDate || ""); setEditAssignee(t.assignee || ""); };
      const saveEditTask = () => { if (!editTitle.trim()) return; setTasks(prev => prev.map(t => t.id === editingTask ? { ...t, title: editTitle.trim(), dueDate: editDue || null, assignee: editAssignee } : t)); setEditingTask(null); };
      const cancelEditTask = () => setEditingTask(null);

      const pending = tasks.filter(t => !t.completed).sort((a, b) => { if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate); if (a.dueDate) return -1; if (b.dueDate) return 1; return 0; });
      const completed = tasks.filter(t => t.completed);

      return (
        <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>📋 Tasks ({pending.length} open)</span>
            {completed.length > 0 && <button onClick={() => setShowCompleted(!showCompleted)} style={{ fontSize: 10, color: C.gray400, background: "none", border: "none", cursor: "pointer" }}>{showCompleted ? "Hide" : "Show"} {completed.length} completed</button>}
          </div>
          {/* Add task */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            <input value={newTask} onChange={e => handleTaskInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="Add a task... (dates like 'by March 20' auto-detected)" style={{ flex: 1, minWidth: 180, padding: "7px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.navy }} />
            <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} title="Due date (auto-detected from task text)" style={{ padding: "7px 8px", border: `1px solid ${newDue ? C.green + "80" : C.gray300}`, borderRadius: 6, fontSize: 11, color: C.gray600, width: 120 }} />
            <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)} style={{ padding: "7px 8px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 11, color: C.gray600, width: 150 }}>{activeUsers.length > 0 ? activeUsers.map(u => <option key={u.id} value={u.name}>{u.name}{u.role ? ` (${ROLE_PRESETS[u.role]?.label || u.role})` : ""}</option>) : <option value={user?.name || ""}>{user?.name || "Me"}</option>}</select>
            <button onClick={addTask} style={{ padding: "7px 14px", borderRadius: 6, border: "none", background: C.navy, color: C.white, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add</button>
          </div>
          {/* Pending tasks */}
          {pending.length === 0 && <div style={{ padding: 12, textAlign: "center", color: C.gray400, fontSize: 11 }}>No open tasks</div>}
          {pending.map(t => editingTask === t.id ? (
            <div key={t.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.gray100}` }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && saveEditTask()} autoFocus style={{ flex: 1, minWidth: 180, padding: "7px 10px", border: `1px solid ${C.blue}`, borderRadius: 6, fontSize: 12, color: C.navy, outline: "none" }} />
                <input type="date" value={editDue} onChange={e => setEditDue(e.target.value)} style={{ padding: "7px 8px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 11, color: C.gray600, width: 120 }} />
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <select value={editAssignee} onChange={e => setEditAssignee(e.target.value)} style={{ padding: "7px 8px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 11, color: C.gray600, flex: 1, maxWidth: 180 }}>{activeUsers.length > 0 ? activeUsers.map(u => <option key={u.id} value={u.name}>{u.name}{u.role ? ` (${ROLE_PRESETS[u.role]?.label || u.role})` : ""}</option>) : <option value={user?.name || ""}>{user?.name || "Me"}</option>}</select>
                <button onClick={saveEditTask} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: C.green, color: C.white, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Save</button>
                <button onClick={cancelEditTask} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray500, fontSize: 11, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div key={t.id} onClick={() => openEditTask(t)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.gray100}`, cursor: "pointer" }} title="Click to edit">
              <input type="checkbox" checked={false} onClick={e => e.stopPropagation()} onChange={e => { e.stopPropagation(); toggleTask(t.id); }} style={{ width: 16, height: 16, cursor: "pointer", accentColor: C.green }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, color: C.navy }}>{t.title}</span>
                {t.assignee && <span style={{ fontSize: 10, color: C.gray400, marginLeft: 6 }}>→ {t.assignee}</span>}
              </div>
              {t.dueDate && <span style={{ fontSize: 10, color: new Date(t.dueDate) < new Date() ? C.red : C.gray400, fontWeight: 600 }}>{new Date(t.dueDate).toLocaleDateString()}</span>}
              <button onClick={e => { e.stopPropagation(); openEditTask(t); }} style={{ background: "none", border: "none", color: C.gray400, cursor: "pointer", fontSize: 11, padding: "0 4px" }} title="Edit task">✏</button>
              <button onClick={e => { e.stopPropagation(); removeTask(t.id); }} style={{ background: "none", border: "none", color: C.gray300, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
            </div>
          ))}
          {/* Completed tasks */}
          {showCompleted && completed.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.gray100}`, opacity: 0.5 }}>
              <input type="checkbox" checked={true} onChange={() => toggleTask(t.id)} style={{ width: 16, height: 16, cursor: "pointer", accentColor: C.green }} />
              <span style={{ flex: 1, fontSize: 12, color: C.gray500, textDecoration: "line-through" }}>{t.title}</span>
              <button onClick={() => removeTask(t.id)} style={{ background: "none", border: "none", color: C.gray300, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
            </div>
          ))}
        </div>
      );
    }

export default TasksPanel;
