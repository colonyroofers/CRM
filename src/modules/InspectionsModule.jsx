import React, { useState, useRef, useCallback } from 'react';
import { C, generateId } from '../utils/constants';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import TasksPanel from '../components/TasksPanel';
import InspectionForm from '../components/InspectionForm';
import InspectionPhotos from '../components/InspectionPhotos';
import InspectionsList from '../components/InspectionsList';

    function InspectionsModule({ user, role, inspections, setInspections, entities, crmUsers, salesLeads, serviceTickets }) {
      const { companies, properties } = entities;
      const [search, setSearch] = useState("");
      const [statusFilter, setStatusFilter] = useState("All");
      const [assigneeFilter, setAssigneeFilter] = useState("All");
      const [editingInspection, setEditingInspection] = useState(null);
      const [sortField, setSortField] = useState("scheduledDate");
      const [sortDir, setSortDir] = useState("asc");
      const [showAssociationPicker, setShowAssociationPicker] = useState(false);
      const [assocSearch, setAssocSearch] = useState("");

      const co = (id) => companies.find(c => c.id === id);
      const pr = (id) => properties.find(p => p.id === id);

      const getEntityLabel = (ins) => {
        if (ins.entityType === "lead") return ins.entityName || "Sales Lead";
        if (ins.entityType === "ticket") return ins.entityName || "Service Ticket";
        return ins.entityType || "—";
      };

      const getPropertyLabel = (ins) => {
        if (ins.propertyId) { const p = pr(ins.propertyId); return p ? p.name : ""; }
        return "";
      };

      const inspectorNames = [...new Set(inspections.map(i => i.assignedTo).filter(Boolean))];

      const filtered = inspections.filter(ins => {
        if (statusFilter !== "All" && ins.status !== statusFilter) return false;
        if (assigneeFilter !== "All" && ins.assignedTo !== assigneeFilter) return false;
        if (search) {
          const s = search.toLowerCase();
          const label = getEntityLabel(ins).toLowerCase();
          const prop = getPropertyLabel(ins).toLowerCase();
          const assignee = (ins.assignedTo || "").toLowerCase();
          const roofType = (ins.data?.roof_type || "").toLowerCase();
          if (!label.includes(s) && !prop.includes(s) && !assignee.includes(s) && !roofType.includes(s)) return false;
        }
        return true;
      });

      const sorted = [...filtered].sort((a, b) => {
        let va, vb;
        if (sortField === "scheduledDate") { va = a.scheduledDate || "9999"; vb = b.scheduledDate || "9999"; }
        else if (sortField === "status") { va = a.status || ""; vb = b.status || ""; }
        else if (sortField === "assignedTo") { va = a.assignedTo || ""; vb = b.assignedTo || ""; }
        else if (sortField === "createdAt") { va = a.createdAt || ""; vb = b.createdAt || ""; }
        else { va = ""; vb = ""; }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });

      const toggleSort = (field) => {
        if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortField(field); setSortDir("asc"); }
      };

      const handleSave = (ins) => {
        setInspections(prev => { const idx = prev.findIndex(i => i.id === ins.id); if (idx >= 0) { const u = [...prev]; u[idx] = ins; return u; } return [...prev, ins]; });
        setEditingInspection(null);
      };

      const handleCreate = () => {
        setShowAssociationPicker(true);
        setAssocSearch("");
      };

      const createWithAssociation = (entityType, entityId, entityName) => {
        setShowAssociationPicker(false);
        setEditingInspection({ id: generateId(), entityType, entityId, entityName, data: {}, status: "Draft", summary: "", assignedTo: "", scheduledDate: "", createdAt: new Date().toISOString(), createdBy: user.name });
      };

      const STATUS_COLORS = { Draft: C.gray400, "In Progress": "#D97706", Complete: C.green };
      const sortIcon = (f) => sortField === f ? (sortDir === "asc" ? " ↑" : " ↓") : "";
      const thStyle = { padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: C.gray500, cursor: "pointer", userSelect: "none", borderBottom: `2px solid ${C.gray200}` };
      const tdStyle = { padding: "12px 12px", fontSize: 13, color: C.navy, borderBottom: `1px solid ${C.gray100}` };

      if (editingInspection) return <InspectionForm inspection={editingInspection} onSave={handleSave} onClose={() => setEditingInspection(null)} user={user} crmUsers={crmUsers} />;

      // Association picker modal
      const AssociationPicker = showAssociationPicker ? (() => {
        const s = assocSearch.toLowerCase();
        const coMap = new Map(); companies.forEach(c => coMap.set(c.id, c));
        const leads = (salesLeads || []).filter(l => !s || (l.jobName || "").toLowerCase().includes(s) || (coMap.get(l.companyId)?.name || l.company || "").toLowerCase().includes(s));
        const tickets = (serviceTickets || []).filter(t => !s || (t.subject || "").toLowerCase().includes(s) || (coMap.get(t.companyId)?.name || "").toLowerCase().includes(s));
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowAssociationPicker(false)}>
            <div style={{ background: C.white, borderRadius: 12, width: 500, maxHeight: "80vh", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.gray200}` }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: "0 0 4px" }}>Associate Inspection</h3>
                <p style={{ fontSize: 12, color: C.gray500, margin: "0 0 10px" }}>Every inspection must be linked to a project or service ticket.</p>
                <input value={assocSearch} onChange={e => setAssocSearch(e.target.value)} placeholder="Search projects or tickets..." style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.navy, boxSizing: "border-box" }} autoFocus />
              </div>
              <div style={{ maxHeight: "55vh", overflowY: "auto", padding: "8px 12px" }}>
                {leads.length > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", padding: "8px 8px 4px", letterSpacing: "0.05em" }}>Projects ({leads.length})</div>}
                {leads.slice(0, 15).map(l => {
                  const coName = coMap.get(l.companyId)?.name || l.company || "";
                  return (
                    <div key={l.id} onClick={() => createWithAssociation("lead", l.id, l.jobName || coName)} style={{ padding: "10px 12px", borderRadius: 6, cursor: "pointer", marginBottom: 2 }} onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{l.jobName || coName || "Untitled"}</div>
                      <div style={{ fontSize: 11, color: C.gray400 }}>{coName} · {l.status || "—"}</div>
                    </div>
                  );
                })}
                {tickets.length > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", padding: "8px 8px 4px", letterSpacing: "0.05em" }}>Service Tickets ({tickets.length})</div>}
                {tickets.slice(0, 15).map(t => (
                  <div key={t.id} onClick={() => createWithAssociation("ticket", t.id, t.subject)} style={{ padding: "10px 12px", borderRadius: 6, cursor: "pointer", marginBottom: 2 }} onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{t.subject || "Untitled"}</div>
                    <div style={{ fontSize: 11, color: C.gray400 }}>{t.status || "—"} · {t.priority || "—"}</div>
                  </div>
                ))}
                {leads.length === 0 && tickets.length === 0 && <div style={{ padding: 24, textAlign: "center", color: C.gray400, fontSize: 12 }}>No matching projects or tickets found</div>}
              </div>
              <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.gray200}`, textAlign: "right" }}>
                <button onClick={() => setShowAssociationPicker(false)} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 12, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })() : null;

      // Stats
      const totalCount = inspections.length;
      const scheduledCount = inspections.filter(i => i.status !== "Complete" && i.scheduledDate).length;
      const inProgressCount = inspections.filter(i => i.status === "In Progress").length;
      const completeCount = inspections.filter(i => i.status === "Complete").length;

      return (
        <div style={{ padding: 24 }}>
          {AssociationPicker}
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: C.navy, margin: 0 }}>🔍 Inspections</h1>
              <p style={{ fontSize: 12, color: C.gray400, margin: "4px 0 0" }}>All roof inspections across projects and service tickets</p>
            </div>
            <button onClick={handleCreate} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: C.navy, color: C.white, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ New Inspection</button>
          </div>

          {/* Stats cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total", value: totalCount, color: C.navy },
              { label: "Scheduled", value: scheduledCount, color: C.blue },
              { label: "In Progress", value: inProgressCount, color: "#D97706" },
              { label: "Complete", value: completeCount, color: C.green },
            ].map(s => (
              <div key={s.label} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: "14px 18px" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inspections..." style={{ flex: 1, minWidth: 200, padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 12, color: C.navy }} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 12, color: C.navy, background: C.white }}>
              <option value="All">All Statuses</option>
              {INSPECTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} style={{ padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 12, color: C.navy, background: C.white }}>
              <option value="All">All Inspectors</option>
              {inspectorNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Table */}
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.gray50 }}>
                  <th style={thStyle} onClick={() => toggleSort("scheduledDate")}>Scheduled Date{sortIcon("scheduledDate")}</th>
                  <th style={thStyle} onClick={() => toggleSort("assignedTo")}>Inspector{sortIcon("assignedTo")}</th>
                  <th style={thStyle}>Property / Entity</th>
                  <th style={thStyle}>Roof Type</th>
                  <th style={thStyle} onClick={() => toggleSort("status")}>Status{sortIcon("status")}</th>
                  <th style={thStyle} onClick={() => toggleSort("createdAt")}>Created{sortIcon("createdAt")}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: C.gray400, fontSize: 13 }}>No inspections found</td></tr>
                ) : sorted.map(ins => (
                  <tr key={ins.id} onClick={() => setEditingInspection(ins)} style={{ cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={tdStyle}>{ins.scheduledDate ? new Date(ins.scheduledDate + "T00:00:00").toLocaleDateString() : <span style={{ color: C.gray400, fontSize: 11 }}>Not scheduled</span>}</td>
                    <td style={tdStyle}><span style={{ fontWeight: 600 }}>{ins.assignedTo || <span style={{ color: C.gray400, fontStyle: "italic", fontWeight: 400 }}>Unassigned</span>}</span></td>
                    <td style={tdStyle}><div style={{ fontSize: 13, fontWeight: 600 }}>{getPropertyLabel(ins) || getEntityLabel(ins)}</div>{getPropertyLabel(ins) && <div style={{ fontSize: 10, color: C.gray400 }}>{getEntityLabel(ins)}</div>}</td>
                    <td style={tdStyle}>{ins.data?.roof_type || "—"}</td>
                    <td style={tdStyle}><span style={{ padding: "3px 10px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: ins.status === "Complete" ? C.greenBg : ins.status === "In Progress" ? "#FEF3C7" : C.gray100, color: STATUS_COLORS[ins.status] || C.gray500 }}>{ins.status}</span></td>
                    <td style={{ ...tdStyle, fontSize: 11, color: C.gray400 }}>{new Date(ins.createdAt).toLocaleDateString()}<br/><span style={{ fontSize: 10 }}>by {ins.createdBy}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // ============================================================
    // MODULE: SERVICE (Tickets linked to shared entities)
    // ============================================================
    const TICKET_TYPES = ["Leak / Repair", "Warranty Claim", "Scheduled Maintenance", "Inspection Follow-Up", "Emergency", "Other"];
    const TICKET_STATUSES = ["New", "Dispatched", "In Progress", "On Hold", "Complete", "Closed"];
    const TICKET_PRIORITIES = ["Emergency", "High", "Medium", "Low"];
    const PRIORITY_COLORS = { Emergency: C.red, High: "#F97316", Medium: C.yellow, Low: C.gray400 };
    const TSTATUS_COLORS = { New: C.blue, Dispatched: "#8B5CF6", "In Progress": C.green, "On Hold": C.yellow, Complete: "#6366F1", Closed: C.gray400 };


export default InspectionsModule;
