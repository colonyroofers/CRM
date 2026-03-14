import React, { useState, useRef, useCallback, useEffect } from 'react';
import { C, generateId, formatCurrency, fmt } from '../utils/constants';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';

    function ServiceModule({ user, role, entities, crmUsers, onMention, inspections, setInspections }) {
      const { companies, properties, contacts, setCompanies } = entities;
      const [ticketsData, saveTickets] = useFirestoreCollection("cr_service_tickets", []);
      const ticketsRef = useRef(ticketsData); ticketsRef.current = ticketsData;
      const setTickets = useCallback(u => { const n = typeof u === "function" ? u(ticketsRef.current) : u; saveTickets(n); }, [saveTickets]);
      const tickets = ticketsData;
      const [projectsData, setProjectsData] = useState([]);

      useEffect(() => {
        try {
          const stored = localStorage.getItem("cr_production_projects");
          if (stored) setProjectsData(JSON.parse(stored));
        } catch(e) { console.warn("Storage/parse error:", e.message); }
      }, []);

      const co = (id) => companies.find(c => c.id === id);
      const pr = (id) => properties.find(p => p.id === id);
      const ct = (id) => contacts.find(c => c.id === id);
      const proj = (id) => projectsData.find(p => p.id === id);

      const [search, setSearch] = useState("");
      const [statusFilter, setStatusFilter] = useState("All");
      const [priorityFilter, setPriorityFilter] = useState("All");
      const [showCreate, setShowCreate] = useState(false);
      const [selectedTicket, setSelectedTicket] = useState(null);

      const filtered = tickets.filter(t => {
        if (statusFilter !== "All" && t.status !== statusFilter) return false;
        if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
        if (search) { const s = search.toLowerCase(); if (!t.subject?.toLowerCase().includes(s) && !(co(t.companyId)?.name || "").toLowerCase().includes(s)) return false; }
        return true;
      });
      const openCount = tickets.filter(t => !["Complete", "Closed"].includes(t.status)).length;
      const emergencyCount = tickets.filter(t => t.priority === "Emergency" && !["Complete", "Closed"].includes(t.status)).length;

      const ticketsWithResponse = tickets.filter(t => t.firstResponseAt && t.createdAt);
      const avgResponseMinutes = ticketsWithResponse.length > 0
        ? Math.round(ticketsWithResponse.reduce((sum, t) => sum + (new Date(t.firstResponseAt) - new Date(t.createdAt)), 0) / ticketsWithResponse.length / 60000)
        : 0;
      const avgResponseStr = avgResponseMinutes < 60
        ? `${avgResponseMinutes}m`
        : `${Math.floor(avgResponseMinutes / 60)}h ${avgResponseMinutes % 60}m`;

      const handleCreate = (ticket) => { setTickets(prev => [{ ...ticket, id: generateId(), status: "New", createdAt: new Date().toISOString(), createdBy: user.name, activities: [{ type: "created", text: "Ticket created", by: user.name, at: new Date().toISOString() }] }, ...prev]); setShowCreate(false); };
      const handleUpdate = (id, updates) => setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      const handleDelete = (id) => { if (confirm("Delete?")) { setTickets(prev => prev.filter(t => t.id !== id)); setSelectedTicket(null); } };
      const handleCreateEntity = (type, data) => {
        const item = { ...data, id: generateId(), createdAt: new Date().toISOString() };
        if (type === "company") setCompanies(prev => [item, ...prev]);
      };

      return (
        <div style={{ background: C.gray50, minHeight: "calc(100vh - 56px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div><h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, margin: 0 }}>Service</h1><p style={{ fontSize: 14, color: C.gray500, margin: "4px 0 0" }}>Tickets linked to your client database</p></div>
              <button onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, color: C.white, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 12px ${C.red}30` }}>{I.plus} New Ticket</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              <StatCard label="Open Tickets" value={openCount} icon={I.file} accent={C.blue} />
              <StatCard label="Emergencies" value={emergencyCount} sub={emergencyCount > 0 ? "Needs attention" : "None"} icon={I.alert} accent={emergencyCount > 0 ? C.red : C.green} />
              <StatCard label="Avg Response Time" value={avgResponseStr} sub={ticketsWithResponse.length > 0 ? `${ticketsWithResponse.length} measured` : "No data yet"} icon={I.clock} accent={C.navy} />
              <StatCard label="Total" value={tickets.length} icon={I.layers} accent={C.gray500} />
            </div>
            {/* Filters */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "0 0 240px" }}><span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.gray400 }}>{I.search}</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..." style={{ width: "100%", padding: "8px 10px 8px 34px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none", background: C.white }} /></div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: "8px 28px 8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 12, color: C.navy, outline: "none", background: C.white, fontWeight: 500, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}><option value="All">All Statuses</option>{TICKET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ padding: "8px 28px 8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 12, color: C.navy, outline: "none", background: C.white, fontWeight: 500, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}><option value="All">All Priorities</option>{TICKET_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select>
            </div>
            {/* Ticket table */}
            {filtered.length > 0 ? (
              <div style={{ borderRadius: 10, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: C.gray50 }}>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Ticket</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Company / Property</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Type</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Priority</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Status</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Assigned</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Created</th>
                  </tr></thead>
                  <tbody>{filtered.map(t => { const pc = PRIORITY_COLORS[t.priority] || C.gray400; const sc = TSTATUS_COLORS[t.status] || C.gray400; return (
                    <tr key={t.id} onClick={() => setSelectedTicket(t)} style={{ cursor: "pointer", borderTop: `1px solid ${C.gray100}` }} onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: C.navy }}>{t.subject}</td>
                      <td style={{ padding: "10px 8px" }}><div style={{ fontWeight: 600, color: C.navy, fontSize: 12 }}>{co(t.companyId)?.name || "—"}</div><div style={{ fontSize: 10, color: C.gray400 }}>{pr(t.propertyId)?.name}</div></td>
                      <td style={{ padding: "10px 8px", color: C.gray600, fontSize: 11 }}>{t.type}</td>
                      <td style={{ padding: "10px 8px" }}><span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: pc + "18", color: pc }}>{t.priority}</span></td>
                      <td style={{ padding: "10px 8px" }}><span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: sc + "18", color: sc }}>{t.status}</span></td>
                      <td style={{ padding: "10px 8px", color: C.gray600, fontSize: 11 }}>{t.assignedTo || "—"}</td>
                      <td style={{ padding: "10px 8px", color: C.gray400, fontSize: 11 }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                    </tr>); })}</tbody>
                </table>
              </div>
            ) : <div style={{ padding: 48, textAlign: "center", background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}` }}><div style={{ fontSize: 36, opacity: 0.2, marginBottom: 12 }}>🔧</div><p style={{ fontSize: 13, color: C.gray400 }}>No tickets found</p></div>}
          </div>
          {showCreate && <CreateTicketModal companies={companies} properties={properties} contacts={contacts} onClose={() => setShowCreate(false)} onCreate={handleCreate} onCreateEntity={handleCreateEntity} crmUsers={crmUsers} projects={projectsData} />}
          {selectedTicket && <TicketDetailPanel ticket={tickets.find(t => t.id === selectedTicket.id) || selectedTicket} co={co} prop={pr} ct={ct} onClose={() => setSelectedTicket(null)} onUpdate={handleUpdate} onDelete={handleDelete} user={user} crmUsers={crmUsers || []} onMention={onMention} inspections={inspections || []} setInspections={setInspections} projects={projectsData} />}
        </div>
      );
    }

    function CreateTicketModal({ companies, properties, contacts, onClose, onCreate, onCreateEntity, prefill, crmUsers, projects = [] }) {
      const [form, setForm] = useState({ subject: "", type: "Leak / Repair", priority: "Medium", market: "ATL", companyId: prefill?.companyId || "", propertyId: prefill?.propertyId || "", contactId: prefill?.contactId || "", description: "", assignedTo: "", linkedProjectId: "" });
      const [validationError, setValidationError] = useState("");
      const fs = { width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none", boxSizing: "border-box" };
      const ls = { fontSize: 11, fontWeight: 600, color: C.gray600, marginBottom: 3, display: "block" };
      const lsReq = { ...ls, color: C.navy };
      const filteredProps = form.companyId ? properties.filter(p => p.companyId === form.companyId) : properties;
      const filteredContacts = form.companyId ? contacts.filter(c => c.companyId === form.companyId) : contacts;
      const filteredProjects = form.companyId && form.propertyId ? projects.filter(p => p.companyId === form.companyId && p.propertyId === form.propertyId) : [];
      const handleSubmit = () => {
        if (!form.subject.trim()) { setValidationError("Subject is required."); return; }
        if (!form.propertyId) { setValidationError("A property is required for every ticket."); return; }
        setValidationError("");

        const ticketData = { ...form };
        if (form.linkedProjectId) {
          const proj = projects.find(p => p.id === form.linkedProjectId);
          if (proj && proj.completionDate) {
            const completionDate = new Date(proj.completionDate);
            const warrantyExpiration = new Date(completionDate.getFullYear() + 5, completionDate.getMonth(), completionDate.getDate());
            ticketData.warrantyExpiration = warrantyExpiration.toISOString();
            ticketData.isUnderWarranty = warrantyExpiration > new Date().toISOString();
          }
        }
        onCreate(ticketData);
      };
      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }} onClick={onClose}>
          <div style={{ background: C.white, borderRadius: 16, width: 560, maxHeight: "85vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${C.gray200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>New Service Ticket</h2><button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400 }}>{I.x}</button></div>
            <div style={{ padding: "20px 28px 28px", display: "grid", gap: 14 }}>
              <div><label style={lsReq}>Subject *</label><input style={fs} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief description of the issue" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label style={ls}>Type</label><select style={fs} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{TICKET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label style={ls}>Priority</label><select style={fs} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>{TICKET_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                <div><label style={ls}>Market</label><select style={fs} value={form.market} onChange={e => setForm(f => ({ ...f, market: e.target.value }))}>{MARKETS.map(m => <option key={m} value={m}>{MARKET_LABELS[m]}</option>)}</select></div>
              </div>
              <div style={{ padding: "14px 16px", borderRadius: 10, background: C.gray50, border: `1px solid ${C.gray200}` }}>
                <h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 10px" }}>Link to Directory</h4>
                <div style={{ display: "grid", gap: 10 }}>
                  <div><label style={ls}>Company</label><SearchableSelect options={companies.map(c => ({ value: c.id, label: c.name, sub: `${c.market || ""} · ${c.type || ""}` }))} value={form.companyId} onChange={v => setForm(f => ({ ...f, companyId: v, propertyId: "", contactId: "", linkedProjectId: "" }))} placeholder="Type to search companies..." /></div>
                  <div><label style={lsReq}>Property * <span style={{ fontWeight: 400, color: C.gray400 }}>(required)</span></label><SearchableSelect options={filteredProps.map(p => ({ value: p.id, label: p.name, sub: p.address || "" }))} value={form.propertyId} onChange={v => setForm(f => ({ ...f, propertyId: v, linkedProjectId: "" }))} placeholder="Type to search properties..." required emptyMsg="No properties — create in Directory" /></div>
                  <div><label style={ls}>Contact</label><SearchableSelect options={filteredContacts.map(c => ({ value: c.id, label: c.name, sub: [c.email, c.phone].filter(Boolean).join(" · ") }))} value={form.contactId} onChange={v => setForm(f => ({ ...f, contactId: v }))} placeholder="Type to search contacts..." /></div>
                  <div><label style={ls}>Linked Project</label><SearchableSelect options={filteredProjects.map(p => ({ value: p.id, label: p.name, sub: p.completionDate ? `Completed: ${new Date(p.completionDate).toLocaleDateString()}` : "No completion date" }))} value={form.linkedProjectId} onChange={v => setForm(f => ({ ...f, linkedProjectId: v }))} placeholder="Type to search projects..." emptyMsg={!form.companyId || !form.propertyId ? "Select a company and property first" : "No projects for this property"} /></div>
                </div>
              </div>
              <div><label style={ls}>Assigned To</label><select style={fs} value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}><option value="">Unassigned</option>{((crmUsers || []).filter(u => u.active !== false).length > 0 ? (crmUsers || []).filter(u => u.active !== false) : USERS).map(u => <option key={u.id} value={u.name}>{u.name}{u.role ? ` (${ROLE_PRESETS[u.role]?.label || u.role})` : ""}</option>)}</select></div>
              <div><label style={ls}>Description</label><textarea style={{ ...fs, minHeight: 80, resize: "vertical" }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              {validationError && <div style={{ padding: "8px 12px", borderRadius: 6, background: C.redBg, color: C.red, fontSize: 12, fontWeight: 600 }}>{validationError}</div>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSubmit} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, color: C.white, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Create Ticket</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    function TicketDetailPanel({ ticket, co, prop, ct, onClose, onUpdate, onDelete, user, crmUsers, onMention, inspections, setInspections, projects = [] }) {
      const [activeTab, setActiveTab] = useState("details");
      const [newNote, setNewNote] = useState("");
      const [showMentionSuggest, setShowMentionSuggest] = useState(false);
      const [mentionFilter, setMentionFilter] = useState("");
      const [editingInspection, setEditingInspection] = useState(null);
      const company = co(ticket.companyId); const property = prop(ticket.propertyId); const contact = ct(ticket.contactId);
      const pc = PRIORITY_COLORS[ticket.priority] || C.gray400; const sc = TSTATUS_COLORS[ticket.status] || C.gray400;

      const handleStatusChange = (s) => {
        const updates = { status: s, activities: [...(ticket.activities || []), { type: "status", text: `Status → ${s}`, by: user.name, at: new Date().toISOString() }] };
        if (ticket.status === "New" && s !== "New" && !ticket.firstResponseAt) {
          updates.firstResponseAt = new Date().toISOString();
        }
        onUpdate(ticket.id, updates);
      };

      const handleSaveInspection = (ins) => {
        if (setInspections) setInspections(prev => { const idx = prev.findIndex(i => i.id === ins.id); return idx >= 0 ? prev.map(i => i.id === ins.id ? ins : i) : [...prev, ins]; });
        setEditingInspection(null);
      };
      const handleCreateInspection = () => {
        setEditingInspection({ id: generateId(), entityType: "ticket", entityId: ticket.id, data: {}, status: "Draft", summary: "", createdAt: new Date().toISOString(), createdBy: user.name });
      };

      const handleNoteChange = (val) => {
        setNewNote(val);
        const atMatch = val.match(/@(\w*)$/);
        if (atMatch) { setShowMentionSuggest(true); setMentionFilter(atMatch[1].toLowerCase()); }
        else { setShowMentionSuggest(false); setMentionFilter(""); }
      };
      const insertMention = (u) => {
        const before = newNote.replace(/@\w*$/, "");
        setNewNote(before + "@" + u.name + " ");
        setShowMentionSuggest(false);
      };
      const filteredMentionUsers = (crmUsers || []).filter(u => u.name?.toLowerCase().includes(mentionFilter));

      const handleAddNote = () => {
        if (!newNote.trim()) return;
        // Parse @mentions by matching against known user names
        (crmUsers || []).forEach(u => {
          if (u.name && newNote.includes("@" + u.name) && u.email && onMention) {
            onMention(u.email, `mentioned you in a note on ticket "${ticket.subject || "a ticket"}": "${newNote.trim().slice(0, 100)}"`);
          }
        });
        onUpdate(ticket.id, { activities: [...(ticket.activities || []), { type: "note", text: newNote.trim(), by: user.name, at: new Date().toISOString() }] });
        setNewNote("");
      };

      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(17,29,53,0.5)", display: "flex", flexDirection: "column" }}>
          {/* Full-width header */}
          <div style={{ padding: "16px 32px", background: `linear-gradient(135deg, ${C.navyDark}, ${C.navy})`, color: C.white, flexShrink: 0 }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: C.white, padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, marginTop: 2 }}>← Back</button>
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 6 }}><span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: pc + "30", color: pc }}>{ticket.priority}</span><span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: sc + "30", color: sc }}>{ticket.status}</span></div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 2px" }}>{ticket.subject}</h2>
                  <p style={{ fontSize: 13, opacity: 0.7, margin: 0 }}>{company?.name || "—"} · {property?.name || "—"} · {ticket.type}</p>
                </div>
              </div>
              <button onClick={() => onDelete(ticket.id)} style={{ background: "rgba(239,68,68,0.3)", border: "none", cursor: "pointer", color: "#FCA5A5", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>Delete</button>
            </div>
          </div>
          {/* Status bar */}
          <div style={{ background: C.white, borderBottom: `1px solid ${C.gray200}`, flexShrink: 0 }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 32px", display: "flex", gap: 3, overflowX: "auto" }}>{TICKET_STATUSES.map(s => <button key={s} onClick={() => handleStatusChange(s)} style={{ padding: "5px 10px", borderRadius: 5, border: ticket.status === s ? `2px solid ${TSTATUS_COLORS[s]}` : `1px solid ${C.gray200}`, background: ticket.status === s ? (TSTATUS_COLORS[s]) + "15" : C.white, color: ticket.status === s ? TSTATUS_COLORS[s] : C.gray500, fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{s}</button>)}</div>
          </div>
          {/* Tabs */}
          <div style={{ background: C.white, borderBottom: `1px solid ${C.gray200}`, flexShrink: 0 }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "flex", gap: 0 }}>
              {[{ id: "details", label: "Details" }, { id: "inspections", label: `Inspections (${(inspections || []).filter(i => i.entityType === "ticket" && i.entityId === ticket.id).length})` }, { id: "tasks", label: "Tasks" }, { id: "activity", label: "Activity" }, { id: "email", label: "📧 Email" }].map(t => <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "12px 18px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: activeTab === t.id ? C.red : C.gray500, borderBottom: `2px solid ${activeTab === t.id ? C.red : "transparent"}` }}>{t.label}</button>)}
            </div>
          </div>
          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 32px" }}>
              {activeTab === "details" && <div style={{ display: "grid", gap: 16 }}>
                <div><h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 8px" }}>Linked Records</h4>
                  {company && <div style={{ padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.gray200}`, marginBottom: 8, background: C.gray50 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 4 }}>🏢 {company.name}</div>
                    <div style={{ fontSize: 11, color: C.gray500 }}>{company.type && <span>{company.type} · </span>}{company.phone && <span>📞 {company.phone} · </span>}{company.address && <span>📍 {company.address}</span>}</div>
                  </div>}
                  {property && <div style={{ padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.gray200}`, marginBottom: 8, background: C.gray50 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 4 }}>🏠 {property.name}</div>
                    <div style={{ fontSize: 11, color: C.gray500 }}>{property.address && <span>📍 {property.address} · </span>}{property.propertyType || ""}{property.sqft ? ` · ${property.sqft.toLocaleString()} SF` : ""}</div>
                  </div>}
                  {contact && <div style={{ padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.gray200}`, marginBottom: 8, background: C.gray50 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 4 }}>👤 {contact.name} {contact.contactType && <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: contact.contactType === "B2B" ? C.blueBg : C.greenBg, color: contact.contactType === "B2B" ? C.blue : C.green, marginLeft: 6 }}>{contact.contactType}</span>}</div>
                    <div style={{ fontSize: 11, color: C.gray500 }}>{contact.email && <span>✉ {contact.email} · </span>}{contact.phone && <span>📞 {contact.phone}</span>}{contact.title && <span> · 💼 {contact.title}</span>}</div>
                  </div>}
                </div>

                {/* Warranty Section */}
                <div><h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 8px" }}>Warranty</h4>
                  {(() => {
                    const proj = ticket.linkedProjectId ? projects.find(p => p.id === ticket.linkedProjectId) : null;
                    const warrantyStatus = ticket.warrantyExpiration ? (ticket.isUnderWarranty ? "Under Warranty" : "Out of Warranty") : "No Warranty Data";
                    const warrantyBgColor = ticket.warrantyExpiration ? (ticket.isUnderWarranty ? C.greenBg : C.yellowBg) : C.gray50;
                    const warrantyColor = ticket.warrantyExpiration ? (ticket.isUnderWarranty ? C.green : C.yellow) : C.gray400;
                    return (
                      <div style={{ padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.gray200}`, background: warrantyBgColor }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: warrantyColor, color: C.white }}>{warrantyStatus}</span>
                        </div>
                        {proj && (
                          <div style={{ fontSize: 11, color: C.gray600, lineHeight: 1.5 }}>
                            <div><strong>Project:</strong> {proj.name}</div>
                            {proj.completionDate && <div><strong>Install Date:</strong> {new Date(proj.completionDate).toLocaleDateString()}</div>}
                            {ticket.warrantyExpiration && <div><strong>Warranty Expires:</strong> {new Date(ticket.warrantyExpiration).toLocaleDateString()}</div>}
                            {proj.roofType && <div><strong>System Type:</strong> {proj.roofType}</div>}
                          </div>
                        )}
                        {!proj && <div style={{ fontSize: 11, color: C.gray500 }}>No project linked</div>}
                      </div>
                    );
                  })()}
                </div>

                {/* SLA / Response Time Section */}
                {(() => {
                  let responseTimeStr = "—";
                  let slaColor = C.gray400;
                  let slaStatus = "No response yet";

                  if (ticket.firstResponseAt && ticket.createdAt) {
                    const responseMs = new Date(ticket.firstResponseAt) - new Date(ticket.createdAt);
                    const responseHours = responseMs / (1000 * 60 * 60);
                    const minutes = Math.round((responseHours % 1) * 60);
                    const hours = Math.floor(responseHours);
                    responseTimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${Math.round(responseMs / (1000 * 60))}m`;

                    const priority = ticket.priority;
                    if (priority === "Emergency") {
                      slaStatus = responseHours < 2 ? "On Time (< 2h)" : responseHours < 4 ? "At Risk (4h)" : "Missed (> 4h)";
                      slaColor = responseHours < 2 ? C.green : responseHours < 4 ? C.yellow : C.red;
                    } else if (priority === "High") {
                      slaStatus = responseHours < 24 ? "On Time (< 24h)" : responseHours < 48 ? "At Risk (48h)" : "Missed (> 48h)";
                      slaColor = responseHours < 24 ? C.green : responseHours < 48 ? C.yellow : C.red;
                    } else if (priority === "Medium") {
                      slaStatus = responseHours < 72 ? "On Time (< 72h)" : "Missed (> 72h)";
                      slaColor = responseHours < 72 ? C.green : C.red;
                    }
                  }

                  return (
                    <div><h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 8px" }}>SLA Tracking</h4>
                      <div style={{ padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.gray50 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontSize: 12, color: C.gray600 }}>Response Time</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{responseTimeStr}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: slaColor, color: C.white }}>{slaStatus}</span>
                        </div>
                        {!ticket.firstResponseAt && ticket.status !== "New" && <div style={{ fontSize: 10, color: C.gray500, marginTop: 6 }}>Response tracked from status change</div>}
                      </div>
                    </div>
                  );
                })()}

                <div>{[["Type", ticket.type], ["Priority", ticket.priority], ["Assigned", ticket.assignedTo || "Unassigned"], ["Created", new Date(ticket.createdAt).toLocaleString()], ["By", ticket.createdBy]].map(([l, v]) => <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.gray100}` }}><span style={{ fontSize: 12, color: C.gray500 }}>{l}</span><span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{v}</span></div>)}</div>
                {ticket.description && <div style={{ padding: "10px 12px", borderRadius: 8, background: C.gray50, fontSize: 12, color: C.gray600, lineHeight: 1.5 }}>{ticket.description}</div>}
              </div>}
              {activeTab === "inspections" && <div>
                <InspectionsList inspections={inspections || []} entityType="ticket" entityId={ticket.id} onOpen={ins => setEditingInspection(ins)} onCreate={handleCreateInspection} />
                {editingInspection && <InspectionForm inspection={editingInspection} onSave={handleSaveInspection} onClose={() => setEditingInspection(null)} user={user} crmUsers={crmUsers} />}
              </div>}
              {activeTab === "tasks" && <TasksPanel objectType="ticket" objectId={ticket.id} user={user} crmUsers={crmUsers} />}
              {activeTab === "activity" && <div>
                <div style={{ position: "relative", display: "flex", gap: 8, marginBottom: 20 }}><input value={newNote} onChange={e => handleNoteChange(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAddNote(); }} placeholder="Add a note... (use @name to mention)" style={{ flex: 1, padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none" }} /><button onClick={handleAddNote} disabled={!newNote.trim()} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: newNote.trim() ? C.navy : C.gray200, color: newNote.trim() ? C.white : C.gray400, fontSize: 12, fontWeight: 600, cursor: newNote.trim() ? "pointer" : "default" }}>Add</button>
                  {showMentionSuggest && filteredMentionUsers.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 99, background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 160, overflowY: "auto", width: 200, marginTop: 4 }}>
                      {filteredMentionUsers.slice(0, 6).map(u => (
                        <div key={u.email} onClick={() => insertMention(u)} style={{ padding: "8px 12px", cursor: "pointer", fontSize: 12, color: C.navy, fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = C.white}>
                          {u.name} <span style={{ color: C.gray400, fontSize: 10 }}>{u.role}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {(ticket.activities || []).slice().reverse().map((a, i) => <div key={a.at + '_' + i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.gray100}` }}><span style={{ fontSize: 14 }}>{{ created: "🆕", status: "📋", note: "📝", email: "📧" }[a.type] || "📌"}</span><div><div style={{ fontSize: 12, color: C.navy }}>{a.text}</div><div style={{ fontSize: 10, color: C.gray400 }}>{a.by} · {new Date(a.at).toLocaleString()}</div></div></div>)}
              </div>}
              {activeTab === "email" && <div>
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: "0 0 8px" }}>Send Email for: {ticket.subject}</h3>
                  <p style={{ fontSize: 13, color: C.gray500, margin: 0 }}>Email will be logged to this ticket's activity.</p>
                </div>
                <EmailCompose
                  to={contact?.email || ""}
                  defaultSubject={`Colony Roofers — Service: ${ticket.subject}`}
                  defaultBody={`Hey ${(contact?.name || "").split(" ")[0] || "there"},\n\nHope all is well. Following up regarding ${ticket.subject} at ${property?.name || "the property"}.\n\n\n\nZach Reece, Owner\nColony Roofers\n404-806-0956`}
                  contacts={contacts}
                  entityType="ticket" entityId={ticket.id} entityName={ticket.subject}
                  onSent={(emailData) => {
                    onUpdate(ticket.id, { activities: [...(ticket.activities || []), { type: "email", text: `Email sent to ${emailData.to} — "${emailData.subject}"`, by: user.name, at: new Date().toISOString() }] });
                  }}
                />
              </div>}
            </div>
          </div>
        </div>
      );
    }

    // ============================================================
    // MODULE: TASK MANAGER


export default ServiceModule;
