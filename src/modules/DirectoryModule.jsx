import React, { useState } from 'react';
import { C, generateId, fmt, MARKET_LABELS, formatCurrency } from '../utils/constants';
import { useIsMobile } from '../hooks/useIsMobile';
import TasksPanel from '../components/TasksPanel';
import { StatCard, StatusBadge, MarginBadge, MarketTag, I } from '../components/shared';

    function DirectoryModule({ user, role, entities, salesLeads, serviceTickets, setSalesLeads, setServiceTickets, crmUsers }) {
      const { companies, properties, contacts, subcontractors, setCompanies, setProperties, setContacts, setSubcontractors } = entities;
      const isMobile = useIsMobile();
      const [tab, setTab] = useState("companies");
      const [search, setSearch] = useState("");
      const [showCreate, setShowCreate] = useState(null);
      const [selected, setSelected] = useState(null);
      const [showCreateLead, setShowCreateLead] = useState(null); // { companyId, propertyId, contactId }
      const [showCreateTicket, setShowCreateTicket] = useState(null); // { companyId, propertyId, contactId }
      const [viewingLead, setViewingLead] = useState(null);
      const [viewingTicket, setViewingTicket] = useState(null);

      const s = search.toLowerCase();
      const filteredCo = companies.filter(c => !s || c.name?.toLowerCase().includes(s));
      const filteredPr = properties.filter(p => !s || p.name?.toLowerCase().includes(s) || p.address?.toLowerCase().includes(s));
      const filteredCt = contacts.filter(c => !s || c.name?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s));
      const filteredSb = (subcontractors || []).filter(sb => !s || sb.companyName?.toLowerCase().includes(s) || sb.contactName?.toLowerCase().includes(s) || sb.phone?.toLowerCase().includes(s));
      const leadsFor = (type, id) => (salesLeads || []).filter(l => l[type + "Id"] === id);
      const ticketsFor = (type, id) => (serviceTickets || []).filter(t => t[type + "Id"] === id);

      const handleCreate = (type, data) => {
        const item = { ...data, id: generateId(), createdAt: new Date().toISOString() };
        if (type === "company") setCompanies(prev => [item, ...prev]);
        if (type === "property") setProperties(prev => [item, ...prev]);
        if (type === "contact") setContacts(prev => [item, ...prev]);
        if (type === "subcontractor") setSubcontractors(prev => [item, ...prev]);
        setShowCreate(null);
      };
      const handleDelete = (type, id) => {
        if (!confirm(`Delete this ${type}?`)) return;
        if (type === "company") setCompanies(prev => prev.filter(c => c.id !== id));
        if (type === "property") setProperties(prev => prev.filter(p => p.id !== id));
        if (type === "contact") setContacts(prev => prev.filter(c => c.id !== id));
        if (type === "subcontractor") setSubcontractors(prev => prev.filter(s => s.id !== id));
        setSelected(null);
      };
      const handleCreateLead = (lead) => {
        const newLead = { ...lead, id: generateId(), stage: "new_lead", createdAt: new Date().toISOString(), activities: [{ type: "created", text: "Lead created from Directory", by: user.name, at: new Date().toISOString() }] };
        setSalesLeads(prev => [newLead, ...prev]);
        setShowCreateLead(null);
      };
      const handleCreateTicket = (ticket) => {
        const newTicket = { ...ticket, id: generateId(), status: "New", createdAt: new Date().toISOString(), createdBy: user.name, activities: [{ type: "created", text: "Ticket created from Directory", by: user.name, at: new Date().toISOString() }] };
        setServiceTickets(prev => [newTicket, ...prev]);
        setShowCreateTicket(null);
      };

      const getInsuranceStatus = (sub) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sixtyDaysAhead = new Date(today);
        sixtyDaysAhead.setDate(sixtyDaysAhead.getDate() + 60);

        const insExpiry = sub.insuranceExp ? new Date(sub.insuranceExp + "T23:59:59") : null;
        const wcExpiry = sub.wcExp ? new Date(sub.wcExp + "T23:59:59") : null;

        if (!insExpiry || !wcExpiry) return { label: "Incomplete", color: C.gray400 };
        if (insExpiry < today || wcExpiry < today) return { label: "Expired", color: C.red };
        if (insExpiry <= sixtyDaysAhead || wcExpiry <= sixtyDaysAhead) return { label: "Expiring Soon", color: C.yellow };
        return { label: "Current", color: C.green };
      };

      const EntityRow = ({ icon, name, sub, leadCount, ticketCount, onClick }) => (
        <div onClick={onClick} style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderBottom: `1px solid ${C.gray100}` }}
          onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 16, flexShrink: 0 }}>{icon}</div>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>{name}</div><div style={{ fontSize: 11, color: C.gray500 }}>{sub}</div></div>
          <div style={{ display: "flex", gap: 6 }}>
            {leadCount > 0 && <span style={{ padding: "2px 7px", borderRadius: 6, background: C.blueBg, color: C.blue, fontSize: 10, fontWeight: 700 }}>{leadCount} lead{leadCount > 1 ? "s" : ""}</span>}
            {ticketCount > 0 && <span style={{ padding: "2px 7px", borderRadius: 6, background: C.yellowBg, color: C.yellow, fontSize: 10, fontWeight: 700 }}>{ticketCount} ticket{ticketCount > 1 ? "s" : ""}</span>}
          </div>
        </div>
      );

      const SubcontractorRow = ({ sub, onClick }) => {
        const insStatus = getInsuranceStatus(sub);
        const ratingStars = sub.rating ? "★".repeat(sub.rating) + "☆".repeat(5 - sub.rating) : "—";
        return (
          <div onClick={onClick} style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderBottom: `1px solid ${C.gray100}` }}
            onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 16, flexShrink: 0 }}>🔧</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>{sub.companyName}</div>
              <div style={{ fontSize: 11, color: C.gray500 }}>{sub.contactName} · {sub.phone}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: C.gray500, minWidth: 80 }}>{MARKET_LABELS[sub.market] || "—"}</span>
              {(sub.trades || []).length > 0 && <span style={{ fontSize: 9, color: C.gray400 }}>{sub.trades.length} trade{sub.trades.length > 1 ? "s" : ""}</span>}
              <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: insStatus.color + "20", color: insStatus.color }}>{insStatus.label}</span>
              {sub.rating > 0 && <span style={{ fontSize: 11, color: C.yellow, minWidth: 55, textAlign: "right" }}>{ratingStars}</span>}
            </div>
          </div>
        );
      };

      // --- Entity Detail Slide-out (with inline editing) ---
      const [editingEntity, setEditingEntity] = useState(null); // holds edited fields
      const handleUpdateEntity = (type, id, updates) => {
        if (type === "company") setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
        if (type === "property") setProperties(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        if (type === "contact") setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
        if (type === "subcontractor") setSubcontractors(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        setEditingEntity(null);
      };
      const EntityDetail = () => {
        if (!selected) return null;
        const { type, id } = selected;
        const entity = type === "company" ? companies.find(c => c.id === id) : type === "property" ? properties.find(p => p.id === id) : type === "contact" ? contacts.find(c => c.id === id) : type === "subcontractor" ? (subcontractors || []).find(s => s.id === id) : null;
        if (!entity) return null;
        const leads = leadsFor(type, id);
        const tix = ticketsFor(type, id);
        const relProps = type === "company" ? properties.filter(p => p.companyId === id) : [];
        const relContacts = type === "company" ? contacts.filter(c => c.companyId === id) : [];
        const parentCo = (type !== "company" && entity.companyId) ? companies.find(c => c.id === entity.companyId) : null;
        const insStatus = type === "subcontractor" ? getInsuranceStatus(entity) : null;
        const isEditing = editingEntity && editingEntity._id === id;
        const editData = isEditing ? editingEntity : null;
        const startEdit = () => setEditingEntity({ ...entity, _id: id, _type: type });
        const cancelEdit = () => setEditingEntity(null);
        const saveEdit = () => {
          const { _id, _type, ...fields } = editingEntity;
          handleUpdateEntity(_type, _id, fields);
        };
        const setField = (k, v) => setEditingEntity(prev => ({ ...prev, [k]: v }));

        const EditableField = ({ label, field, value }) => {
          if (isEditing) {
            return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.gray100}`, gap: 12 }}>
              <span style={{ fontSize: 12, color: C.gray500, textTransform: "capitalize", minWidth: 80, flexShrink: 0 }}>{label}</span>
              <input value={editData[field] || ""} onChange={e => setField(field, e.target.value)} style={{ fontSize: 12, fontWeight: 600, color: C.navy, border: `1px solid ${C.gray300}`, borderRadius: 4, padding: "4px 8px", flex: 1, textAlign: "right", outline: "none" }} />
            </div>;
          }
          return <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.gray100}` }}><span style={{ fontSize: 12, color: C.gray500, textTransform: "capitalize" }}>{label}</span><span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{String(value)}</span></div>;
        };

        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(17,29,53,0.5)", display: "flex", justifyContent: "center", alignItems: "flex-start", overflowY: "auto" }} onClick={() => { setSelected(null); cancelEdit(); }}>
            <div style={{ width: "100%", maxWidth: 800, background: C.white, margin: "40px auto", borderRadius: 16, boxShadow: "0 25px 60px rgba(0,0,0,0.3)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: "20px 24px", background: `linear-gradient(135deg, ${C.navyDark}, ${C.navy})`, color: C.white }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {parentCo && <button onClick={() => setSelected({ type: "company", id: parentCo.id })} style={{ background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", color: C.white, padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600 }}>← {parentCo.name}</button>}
                    <button onClick={() => { setSelected(null); cancelEdit(); }} style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: C.white, padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600 }}>✕ Close</button>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.6, textTransform: "uppercase" }}>{type}</span>
                    {!isEditing && <button onClick={startEdit} style={{ background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", color: C.white, padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600 }}>✏️ Edit</button>}
                    {isEditing && <button onClick={saveEdit} style={{ background: "rgba(16,185,129,0.4)", border: "none", cursor: "pointer", color: C.white, padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600 }}>💾 Save</button>}
                    {isEditing && <button onClick={cancelEdit} style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: C.white, padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600 }}>Cancel</button>}
                    <button onClick={() => handleDelete(type, id)} style={{ background: "rgba(239,68,68,0.3)", border: "none", cursor: "pointer", color: "#FCA5A5", padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600 }}>Delete</button>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 28 }}>{{ company: "🏢", property: "🏠", contact: "👤", subcontractor: "🔧" }[type]}</span>
                  <div><h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{type === "subcontractor" ? entity.companyName : entity.name}</h2>{type === "subcontractor" ? <p style={{ fontSize: 12, opacity: 0.7, margin: "2px 0 0" }}>{entity.contactName}</p> : parentCo && <p style={{ fontSize: 12, opacity: 0.7, margin: "2px 0 0" }}>{parentCo.name}</p>}</div>
                </div>
              </div>
              <div style={{ padding: "20px 24px" }}>
                {/* Details */}
                <div style={{ marginBottom: 24 }}><h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 8px" }}>Details</h4>
                  {type === "subcontractor" ? (
                    <>
                      <EditableField label="Company" field="companyName" value={entity.companyName || ""} />
                      <EditableField label="Contact" field="contactName" value={entity.contactName || ""} />
                      <EditableField label="Phone" field="phone" value={entity.phone || ""} />
                      <EditableField label="Email" field="email" value={entity.email || ""} />
                      {(entity.market || isEditing) && <EditableField label="Market" field="market" value={MARKET_LABELS[entity.market] || entity.market || ""} />}
                      {entity.trades && entity.trades.length > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.gray100}` }}><span style={{ fontSize: 12, color: C.gray500 }}>Trades</span><span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{entity.trades.join(", ")}</span></div>}
                      {(entity.insuranceExp || isEditing) && <EditableField label="Insurance Exp" field="insuranceExp" value={entity.insuranceExp || ""} />}
                      {(entity.wcExp || isEditing) && <EditableField label="W/C Exp" field="wcExp" value={entity.wcExp || ""} />}
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.gray100}` }}><span style={{ fontSize: 12, color: C.gray500 }}>Insurance Status</span><span style={{ fontSize: 12, fontWeight: 600, color: insStatus.color }}>{insStatus.label}</span></div>
                      {entity.w9OnFile !== undefined && <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.gray100}` }}><span style={{ fontSize: 12, color: C.gray500 }}>W9 on File</span><span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{entity.w9OnFile ? "Yes" : "No"}</span></div>}
                      {(entity.notes || isEditing) && <EditableField label="Notes" field="notes" value={entity.notes || ""} />}
                    </>
                  ) : (
                    Object.entries(entity).filter(([k, v]) => !["id", "createdAt", "companyId"].includes(k) && (isEditing || (v != null && v !== "")) && typeof v !== "object").map(([k, v]) => <EditableField key={k} label={k.replace(/([A-Z])/g, " $1")} field={k} value={v != null ? String(v) : ""} />)
                  )}
                </div>
                {/* Related Properties */}
                {type === "company" && <div style={{ marginBottom: 24 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: 0 }}>Properties ({relProps.length})</h4><button onClick={() => { setSelected(null); setShowCreate("property"); }} style={{ padding: "3px 10px", borderRadius: 5, border: `1px solid ${C.gray300}`, background: C.white, color: C.navy, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>+ Add Property</button></div>
                  {relProps.map(p => <div key={p.id} onClick={() => setSelected({ type: "property", id: p.id })} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.gray200}`, marginBottom: 4, cursor: "pointer", display: "flex", justifyContent: "space-between" }} onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><div><div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>🏠 {p.name}</div><div style={{ fontSize: 10, color: C.gray400 }}>{p.address}</div></div><span style={{ fontSize: 10, color: C.gray400 }}>{ticketsFor("property", p.id).length} tickets</span></div>)}
                  {relProps.length === 0 && <p style={{ fontSize: 12, color: C.gray400, textAlign: "center", padding: 12, background: C.gray50, borderRadius: 8 }}>No properties yet</p>}
                </div>}
                {/* Related Contacts */}
                {type === "company" && <div style={{ marginBottom: 24 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: 0 }}>Contacts ({relContacts.length})</h4><button onClick={() => { setSelected(null); setShowCreate("contact"); }} style={{ padding: "3px 10px", borderRadius: 5, border: `1px solid ${C.gray300}`, background: C.white, color: C.navy, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>+ Add Contact</button></div>
                  {relContacts.map(c => <div key={c.id} onClick={() => setSelected({ type: "contact", id: c.id })} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.gray200}`, marginBottom: 4, cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>👤 {c.name}</div><div style={{ fontSize: 10, color: C.gray400 }}>{c.email} · {c.phone}</div></div>)}
                  {relContacts.length === 0 && <p style={{ fontSize: 12, color: C.gray400, textAlign: "center", padding: 12, background: C.gray50, borderRadius: 8 }}>No contacts yet</p>}
                </div>}
                {/* Related entities for non-company/non-subcontractor types */}
                {type !== "company" && type !== "subcontractor" && relProps.length > 0 && <div style={{ marginBottom: 24 }}><h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 8px" }}>Properties ({relProps.length})</h4>
                  {relProps.map(p => <div key={p.id} onClick={() => setSelected({ type: "property", id: p.id })} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.gray200}`, marginBottom: 4, cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>🏠 {p.name}</div><div style={{ fontSize: 10, color: C.gray400 }}>{p.address}</div></div>)}
                </div>}
                {type !== "company" && type !== "subcontractor" && relContacts.length > 0 && <div style={{ marginBottom: 24 }}><h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 8px" }}>Contacts ({relContacts.length})</h4>
                  {relContacts.map(c => <div key={c.id} onClick={() => setSelected({ type: "contact", id: c.id })} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.gray200}`, marginBottom: 4, cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>👤 {c.name}</div><div style={{ fontSize: 10, color: C.gray400 }}>{c.email} · {c.phone}</div></div>)}
                </div>}
                {/* Create Project or Ticket — not for subcontractors */}
                {type !== "subcontractor" && <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Create New</h4>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { const propEntity = type === "property" ? entity : null; setSelected(null); setShowCreateLead({ companyId: type === "company" ? id : entity.companyId || "", propertyId: type === "property" ? id : "", contactId: type === "contact" ? id : "", projectType: propEntity?.propertyType || "Apartment Complex" }); }} style={{ flex: 1, padding: "14px 0", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`, color: C.white, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 4px 12px ${C.navy}30` }}>💼 New Project</button>
                    <button onClick={() => { setSelected(null); setShowCreateTicket({ companyId: type === "company" ? id : entity.companyId || "", propertyId: type === "property" ? id : "", contactId: type === "contact" ? id : "" }); }} style={{ flex: 1, padding: "14px 0", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, color: C.white, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 4px 12px ${C.red}30` }}>🔧 New Service Ticket</button>
                  </div>
                </div>}
                {/* Sales History — clickable, not for subcontractors */}
                {type !== "subcontractor" && <div style={{ marginBottom: 24 }}><h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 8px" }}>Sales History ({leads.length})</h4>
                  {leads.length > 0 ? leads.map(l => { const stg = SALES_STAGES.find(s => s.id === l.stage); return (
                    <div key={l.id} onClick={() => setViewingLead(l)} style={{ padding: "10px 14px", borderRadius: 6, border: `1px solid ${C.gray200}`, marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = C.blueBg} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div><div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>💼 {l.jobName || l.company || companies.find(c => c.id === l.companyId)?.name || "Project"}</div><div style={{ fontSize: 10, color: C.gray400 }}>{stg?.label} · {l.estimator ? `Est: ${l.estimator} · ` : ""}{new Date(l.createdAt).toLocaleDateString()}{l.bidDueDate ? ` · Bid: ${new Date(l.bidDueDate + "T12:00:00").toLocaleDateString()}` : ""}</div></div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{formatCurrency(l.estimatedValue || 0)}</span><span style={{ color: C.gray400, fontSize: 11 }}>→</span></div>
                    </div>);
                  }) : <p style={{ fontSize: 12, color: C.gray400, textAlign: "center", padding: 12, background: C.gray50, borderRadius: 8 }}>No sales history</p>}
                </div>}
                {/* Service History — clickable, not for subcontractors */}
                {type !== "subcontractor" && <div><h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 8px" }}>Service History ({tix.length})</h4>
                  {tix.length > 0 ? tix.map(t => (
                    <div key={t.id} onClick={() => setViewingTicket(t)} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.gray200}`, marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = C.yellowBg} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div><div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>🔧 {t.subject}</div><div style={{ fontSize: 10, color: C.gray400 }}>{t.type} · {t.status} · {new Date(t.createdAt).toLocaleDateString()}</div></div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: (TSTATUS_COLORS[t.status] || C.gray400) + "18", color: TSTATUS_COLORS[t.status] || C.gray400 }}>{t.status}</span><span style={{ color: C.gray400, fontSize: 11 }}>→</span></div>
                    </div>
                  )) : <p style={{ fontSize: 12, color: C.gray400, textAlign: "center", padding: 12, background: C.gray50, borderRadius: 8 }}>No service history</p>}
                </div>}
                {/* Tasks */}
                <div style={{ marginTop: 24 }}>
                  <TasksPanel objectType={type} objectId={id} user={user} crmUsers={crmUsers} />
                </div>
              </div>
            </div>
          </div>
        );
      };

      return (
        <div style={{ background: C.gray50, minHeight: "calc(100vh - 56px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px" : "28px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: isMobile ? 16 : 24 }}>
              <div><h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: C.navy, margin: 0 }}>Directory</h1>{!isMobile && <p style={{ fontSize: 14, color: C.gray500, margin: "4px 0 0" }}>Companies, properties & contacts — the backbone of your CRM</p>}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 8 : 16, marginBottom: isMobile ? 16 : 24 }}>
              <StatCard label="Companies" value={companies.length} icon={I.building} accent={C.navy} />
              <StatCard label="Properties" value={properties.length} icon={I.layers} accent={C.blue} />
              <StatCard label="Contacts" value={contacts.length} icon={I.user} accent={C.green} />
              <StatCard label="Subcontractors" value={(subcontractors || []).length} icon="🔧" accent={C.red} />
            </div>
            {/* Tabs + search */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16, background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: 3, overflowX: isMobile ? "auto" : "visible" }}>
              {[{ id: "companies", label: isMobile ? `Co (${companies.length})` : `Companies (${companies.length})` }, { id: "properties", label: isMobile ? `Prop (${properties.length})` : `Properties (${properties.length})` }, { id: "contacts", label: isMobile ? `Ct (${contacts.length})` : `Contacts (${contacts.length})` }, { id: "subs", label: `Subs (${(subcontractors || []).length})` }].map(t => <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); }} style={{ flex: isMobile ? "0 0 auto" : 1, padding: isMobile ? "8px 12px" : "8px 0", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, background: tab === t.id ? C.navy : "transparent", color: tab === t.id ? C.white : C.gray500, cursor: "pointer", whiteSpace: "nowrap" }}>{t.label}</button>)}
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <div style={{ position: "relative", flex: 1 }}><span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.gray400 }}>{I.search}</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${tab}...`} style={{ width: "100%", padding: "8px 10px 8px 34px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none", background: C.white }} /></div>
              <button onClick={() => setShowCreate(tab === "companies" ? "company" : tab === "properties" ? "property" : tab === "contacts" ? "contact" : "subcontractor")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, color: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{I.plus} Add</button>
            </div>
            <div style={{ borderRadius: 10, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
              {tab === "companies" && (filteredCo.length > 0 ? filteredCo.map(c => <EntityRow key={c.id} icon="🏢" name={c.name} sub={`${MARKET_LABELS[c.market] || "—"} · ${c.type || "—"}`} leadCount={leadsFor("company", c.id).length} ticketCount={ticketsFor("company", c.id).length} onClick={() => setSelected({ type: "company", id: c.id })} />) : <div style={{ padding: 32, textAlign: "center", color: C.gray400, fontSize: 12 }}>No companies</div>)}
              {tab === "properties" && (filteredPr.length > 0 ? filteredPr.map(p => <EntityRow key={p.id} icon="🏠" name={p.name} sub={`${p.address || "—"} · ${companies.find(c => c.id === p.companyId)?.name || "No company"}`} leadCount={leadsFor("property", p.id).length} ticketCount={ticketsFor("property", p.id).length} onClick={() => setSelected({ type: "property", id: p.id })} />) : <div style={{ padding: 32, textAlign: "center", color: C.gray400, fontSize: 12 }}>No properties</div>)}
              {tab === "contacts" && (filteredCt.length > 0 ? filteredCt.map(c => <EntityRow key={c.id} icon="👤" name={c.name} sub={`${c.email || "—"} · ${companies.find(co => co.id === c.companyId)?.name || "No company"}`} leadCount={leadsFor("contact", c.id).length} ticketCount={ticketsFor("contact", c.id).length} onClick={() => setSelected({ type: "contact", id: c.id })} />) : <div style={{ padding: 32, textAlign: "center", color: C.gray400, fontSize: 12 }}>No contacts</div>)}
              {tab === "subs" && (filteredSb.length > 0 ? filteredSb.map(sb => <SubcontractorRow key={sb.id} sub={sb} onClick={() => setSelected({ type: "subcontractor", id: sb.id })} />) : <div style={{ padding: 32, textAlign: "center", color: C.gray400, fontSize: 12 }}>No subcontractors</div>)}
            </div>
          </div>
          {showCreate && <Portal><CreateEntityModal type={showCreate} companies={companies} contacts={contacts} subcontractors={subcontractors} onClose={() => setShowCreate(null)} onCreate={handleCreate} /></Portal>}
          {showCreateLead && <Portal><CreateLeadModal entities={entities} onClose={() => setShowCreateLead(null)} onCreate={handleCreateLead} prefill={showCreateLead} /></Portal>}
          {showCreateTicket && <Portal><CreateTicketModal companies={companies} properties={properties} contacts={contacts} onClose={() => setShowCreateTicket(null)} onCreate={handleCreateTicket} onCreateEntity={(type, data) => handleCreate(type, data)} prefill={showCreateTicket} crmUsers={crmUsers} /></Portal>}
          <Portal>{EntityDetail()}</Portal>
          {/* Lead detail overlay from directory */}
          {viewingLead && (() => {
            const vl = salesLeads.find(l => l.id === viewingLead.id) || viewingLead;
            const vlStage = SALES_STAGES.find(s => s.id === vl.stage);
            const vlCo = companies.find(c => c.id === vl.companyId);
            const vlPr = properties.find(p => p.id === vl.propertyId);
            const vlCt = contacts.find(c => c.id === vl.contactId);
            return (
            <Portal><div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(17,29,53,0.6)", display: "flex", justifyContent: "center", alignItems: "center" }} onClick={() => setViewingLead(null)}>
              <div style={{ background: C.white, borderRadius: 16, width: 560, maxHeight: "80vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: "20px 24px", background: `linear-gradient(135deg, ${C.navyDark}, ${C.navy})`, color: C.white, borderRadius: "16px 16px 0 0" }}>
                  <button onClick={() => setViewingLead(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: C.white, padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600, marginBottom: 8 }}>← Back</button>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>{vl.jobName || vlCo?.name || "Project"}</h3>
                  <p style={{ fontSize: 11, opacity: 0.7, margin: 0 }}>{vlCo?.name && vl.jobName ? `🏢 ${vlCo.name} · ` : ""}{vlCt?.name || ""}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: (vlStage?.color || C.gray400) + "30", color: vlStage?.color || C.gray400 }}>{vlStage?.label}</span>
                    {vl.market && <MarketTag market={vl.market} />}
                    <span style={{ fontSize: 15, fontWeight: 800, marginLeft: "auto" }}>{formatCurrency(vl.estimatedValue || 0)}</span>
                  </div>
                </div>
                <div style={{ padding: "16px 24px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                    {vlCo && <div style={{ padding: "8px 10px", borderRadius: 6, background: C.gray50, border: `1px solid ${C.gray200}` }}><div style={{ fontSize: 10, color: C.gray400, fontWeight: 600 }}>Company</div><div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{vlCo.name}</div></div>}
                    {vlPr && <div style={{ padding: "8px 10px", borderRadius: 6, background: C.gray50, border: `1px solid ${C.gray200}` }}><div style={{ fontSize: 10, color: C.gray400, fontWeight: 600 }}>Property</div><div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{vlPr.name}</div><div style={{ fontSize: 10, color: C.gray400 }}>{vlPr.address}</div></div>}
                    {vl.estimator && <div style={{ padding: "8px 10px", borderRadius: 6, background: C.gray50, border: `1px solid ${C.gray200}` }}><div style={{ fontSize: 10, color: C.gray400, fontWeight: 600 }}>Estimator</div><div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{vl.estimator}</div></div>}
                    {vl.bidDueDate && <div style={{ padding: "8px 10px", borderRadius: 6, background: C.gray50, border: `1px solid ${C.gray200}` }}><div style={{ fontSize: 10, color: C.gray400, fontWeight: 600 }}>Bid Due</div><div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{new Date(vl.bidDueDate + "T12:00:00").toLocaleDateString()}</div></div>}
                  </div>
                  {vl.scopeOfWork && <div style={{ padding: "10px 12px", borderRadius: 6, background: C.blueBg, border: `1px solid ${C.blue}30`, marginBottom: 16 }}><div style={{ fontSize: 10, fontWeight: 700, color: C.navy, marginBottom: 2 }}>Scope of Work</div><div style={{ fontSize: 12, color: C.gray600, lineHeight: 1.5 }}>{vl.scopeOfWork}</div></div>}
                  <h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 8px" }}>Activity Log</h4>
                  {(vl.activities || []).slice().reverse().slice(0, 10).map((a, i) => <div key={a.at + '_' + i} style={{ padding: "6px 0", borderBottom: `1px solid ${C.gray100}`, fontSize: 11 }}><span style={{ fontWeight: 600, color: C.navy }}>{a.by}</span> <span style={{ color: C.gray500 }}>— {a.text}</span> <span style={{ color: C.gray400, marginLeft: 4 }}>{new Date(a.at).toLocaleDateString()}</span></div>)}
                  {(!vl.activities || vl.activities.length === 0) && <p style={{ fontSize: 12, color: C.gray400 }}>No activity yet</p>}
                </div>
              </div>
            </div></Portal>);
          })()}
          {/* Ticket detail overlay from directory */}
          {viewingTicket && (() => {
            const vt = serviceTickets.find(t => t.id === viewingTicket.id) || viewingTicket;
            const vtCo = companies.find(c => c.id === vt.companyId);
            return (
            <Portal><div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(17,29,53,0.6)", display: "flex", justifyContent: "center", alignItems: "center" }} onClick={() => setViewingTicket(null)}>
              <div style={{ background: C.white, borderRadius: 16, width: 520, maxHeight: "80vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: "20px 24px", background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, color: C.white, borderRadius: "16px 16px 0 0" }}>
                  <button onClick={() => setViewingTicket(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: C.white, padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600, marginBottom: 8 }}>← Back</button>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>{vt.subject}</h3>
                  <p style={{ fontSize: 11, opacity: 0.8, margin: 0 }}>{vtCo?.name || ""} · {vt.type || ""}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: "rgba(255,255,255,0.2)" }}>{vt.status}</span>
                    <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: "rgba(255,255,255,0.2)" }}>{vt.priority}</span>
                  </div>
                </div>
                <div style={{ padding: "16px 24px" }}>
                  {vt.description && <div style={{ padding: "10px 12px", borderRadius: 6, background: C.gray50, border: `1px solid ${C.gray200}`, marginBottom: 16, fontSize: 12, color: C.gray600, lineHeight: 1.5 }}>{vt.description}</div>}
                  <h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 8px" }}>Activity Log</h4>
                  {(vt.activities || []).slice().reverse().slice(0, 10).map((a, i) => <div key={a.at + '_' + i} style={{ padding: "6px 0", borderBottom: `1px solid ${C.gray100}`, fontSize: 11 }}><span style={{ fontWeight: 600, color: C.navy }}>{a.by}</span> <span style={{ color: C.gray500 }}>— {a.text}</span> <span style={{ color: C.gray400, marginLeft: 4 }}>{new Date(a.at).toLocaleDateString()}</span></div>)}
                  {(!vt.activities || vt.activities.length === 0) && <p style={{ fontSize: 12, color: C.gray400 }}>No activity yet</p>}
                </div>
              </div>
            </div></Portal>);
          })()}
        </div>
      );
    }

    function CreateEntityModal({ type, companies, contacts, onClose, onCreate }) {
      const labels = { company: "Company", property: "Property", contact: "Contact", subcontractor: "Subcontractor" };
      const [form, setForm] = useState(
        type === "company" ? { name: "", market: "ATL", type: "Property Manager", phone: "", address: "", notes: "" } :
        type === "property" ? { name: "", companyId: "", contactId: "", propertyType: "Apartment Complex", address: "", market: "ATL", sqft: 0, roofType: "", buildingCount: 1, notes: "" } :
        type === "contact" ? { firstName: "", lastName: "", name: "", companyId: "", contactType: "B2B", email: "", officePhone: "", mobilePhone: "", title: "", notes: "" } :
        { companyName: "", contactName: "", phone: "", email: "", market: "ATL", trades: [], insuranceExp: "", wcExp: "", w9OnFile: false, rating: 0, notes: "" }
      );
      const [validationError, setValidationError] = useState("");
      const fs = { width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none", boxSizing: "border-box" };
      const ls = { fontSize: 11, fontWeight: 600, color: C.gray600, marginBottom: 3, display: "block" };
      const lsReq = { ...ls, color: C.navy };

      const isResidential = type === "property" && form.propertyType === "Residential";
      const propertyNeedsCompany = type === "property" && !isResidential;
      const contactIsB2B = type === "contact" && form.contactType === "B2B";
      const filteredContacts = form.companyId ? (contacts || []).filter(c => c.companyId === form.companyId) : (contacts || []);

      const validate = () => {
        if (type === "contact") {
          if (!form.firstName?.trim()) return "First name is required.";
          if (!form.lastName?.trim()) return "Last name is required.";
          if (!form.contactType) return "Contact type (B2C or B2B) is required.";
          if (contactIsB2B && !form.companyId) return "B2B contacts must have a company.";
        } else if (type === "subcontractor") {
          if (!form.companyName?.trim()) return "Company name is required.";
          if (!form.contactName?.trim()) return "Contact name is required.";
          if (!form.phone?.trim()) return "Phone is required.";
          if (!form.market) return "Market is required.";
        } else {
          if (!form.name?.trim()) return "Name is required.";
        }
        if (type === "property") {
          if (!form.propertyType) return "Property type is required.";
          if (propertyNeedsCompany && !form.companyId) return "Non-residential properties must have a company.";
          if (!form.contactId) return "A contact is required for every property.";
        }
        return "";
      };

      const handleSubmit = () => {
        const err = validate();
        if (err) { setValidationError(err); return; }
        setValidationError("");
        const submitData = type === "contact" ? { ...form, name: `${form.firstName.trim()} ${form.lastName.trim()}` } : form;
        onCreate(type, submitData);
      };

      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 2100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }} onClick={onClose}>
          <div style={{ background: C.white, borderRadius: 16, width: 520, maxHeight: "85vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${C.gray200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>New {labels[type]}</h2>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400 }}>{I.x}</button>
            </div>
            <div style={{ padding: "20px 28px 28px", display: "grid", gap: 12 }}>
              {type !== "contact" && <div><label style={lsReq}>Name *</label><input style={fs} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>}

              {/* ── COMPANY FIELDS ── */}
              {type === "company" && <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={ls}>Market</label><select style={fs} value={form.market} onChange={e => setForm(f => ({ ...f, market: e.target.value }))}>{MARKETS.map(m => <option key={m} value={m}>{MARKET_LABELS[m]}</option>)}</select></div>
                  <div><label style={ls}>Type</label><select style={fs} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                </div>
                <div><label style={ls}>Phone</label><input style={fs} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><label style={ls}>Address</label><input style={fs} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
              </>}

              {/* ── PROPERTY FIELDS ── */}
              {type === "property" && <>
                <div><label style={lsReq}>Property Type *</label><select style={fs} value={form.propertyType} onChange={e => setForm(f => ({ ...f, propertyType: e.target.value, companyId: e.target.value === "Residential" ? "" : f.companyId }))}>{PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                {!isResidential && <div><label style={lsReq}>Company *</label><SearchableSelect options={companies.map(c => ({ value: c.id, label: c.name, sub: `${c.market || ""} · ${c.type || ""}` }))} value={form.companyId} onChange={v => setForm(f => ({ ...f, companyId: v }))} placeholder="Type to search companies..." required emptyMsg="No companies found" /></div>}
                {isResidential && <div><label style={ls}>Company <span style={{ fontWeight: 400, color: C.gray400 }}>(optional for residential)</span></label><SearchableSelect options={companies.map(c => ({ value: c.id, label: c.name, sub: `${c.market || ""}` }))} value={form.companyId} onChange={v => setForm(f => ({ ...f, companyId: v }))} placeholder="Type to search companies..." /></div>}
                <div><label style={lsReq}>Contact *</label><SearchableSelect options={filteredContacts.map(c => ({ value: c.id, label: c.name, sub: [c.email, c.phone].filter(Boolean).join(" · ") }))} value={form.contactId} onChange={v => setForm(f => ({ ...f, contactId: v }))} placeholder="Type to search contacts..." required emptyMsg="No contacts — create one first" /></div>
                <div><label style={ls}>Address</label><input style={fs} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div><label style={ls}>Market</label><select style={fs} value={form.market} onChange={e => setForm(f => ({ ...f, market: e.target.value }))}>{MARKETS.map(m => <option key={m} value={m}>{MARKET_LABELS[m]}</option>)}</select></div>
                  <div><label style={ls}>Sq Ft</label><input style={fs} type="number" value={form.sqft} onChange={e => setForm(f => ({ ...f, sqft: Number(e.target.value) }))} /></div>
                  <div><label style={ls}>Roof Type</label><select style={fs} value={form.roofType} onChange={e => setForm(f => ({ ...f, roofType: e.target.value }))}><option value="">—</option>{ROOF_TYPES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                </div>
              </>}

              {/* ── CONTACT FIELDS ── */}
              {type === "contact" && <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={lsReq}>First Name *</label><input style={fs} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
                  <div><label style={lsReq}>Last Name *</label><input style={fs} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
                </div>
                <div><label style={lsReq}>Contact Type *</label><select style={fs} value={form.contactType} onChange={e => setForm(f => ({ ...f, contactType: e.target.value, companyId: e.target.value === "B2C" ? "" : f.companyId }))}>{CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                {contactIsB2B && <div><label style={lsReq}>Company *</label><SearchableSelect options={companies.map(c => ({ value: c.id, label: c.name, sub: `${c.market || ""} · ${c.type || ""}` }))} value={form.companyId} onChange={v => setForm(f => ({ ...f, companyId: v }))} placeholder="Type to search companies..." required emptyMsg="No companies found" /></div>}
                {!contactIsB2B && <div><label style={ls}>Company <span style={{ fontWeight: 400, color: C.gray400 }}>(optional for B2C)</span></label><SearchableSelect options={companies.map(c => ({ value: c.id, label: c.name, sub: `${c.market || ""}` }))} value={form.companyId} onChange={v => setForm(f => ({ ...f, companyId: v }))} placeholder="Type to search companies..." /></div>}
                <div><label style={ls}>Email</label><input style={fs} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={ls}>Office Phone</label><input style={fs} value={form.officePhone} onChange={e => setForm(f => ({ ...f, officePhone: e.target.value }))} /></div>
                  <div><label style={ls}>Mobile Phone</label><input style={fs} value={form.mobilePhone} onChange={e => setForm(f => ({ ...f, mobilePhone: e.target.value }))} /></div>
                </div>
                <div><label style={ls}>Title / Role</label><input style={fs} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              </>}

              {/* ── SUBCONTRACTOR FIELDS ── */}
              {type === "subcontractor" && <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={lsReq}>Company Name *</label><input style={fs} value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} /></div>
                  <div><label style={lsReq}>Contact Name *</label><input style={fs} value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={lsReq}>Phone *</label><input style={fs} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div><label style={ls}>Email</label><input style={fs} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                </div>
                <div><label style={lsReq}>Market *</label><select style={fs} value={form.market} onChange={e => setForm(f => ({ ...f, market: e.target.value }))}>{MARKETS.map(m => <option key={m} value={m}>{MARKET_LABELS[m]}</option>)}</select></div>
                <div><label style={ls}>Trades (comma-separated)</label><textarea style={{ ...fs, minHeight: 60, resize: "vertical" }} value={form.trades.join(", ")} onChange={e => setForm(f => ({ ...f, trades: e.target.value.split(",").map(t => t.trim()).filter(Boolean) }))} placeholder="e.g., TPO Install, Metal Panels, Sheet Metal" /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={ls}>Insurance Exp (YYYY-MM-DD)</label><input style={fs} type="date" value={form.insuranceExp} onChange={e => setForm(f => ({ ...f, insuranceExp: e.target.value }))} /></div>
                  <div><label style={ls}>W/C Exp (YYYY-MM-DD)</label><input style={fs} type="date" value={form.wcExp} onChange={e => setForm(f => ({ ...f, wcExp: e.target.value }))} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={form.w9OnFile} onChange={e => setForm(f => ({ ...f, w9OnFile: e.target.checked }))} style={{ width: 18, height: 18, cursor: "pointer" }} /><label style={{ ...ls, marginBottom: 0 }}>W9 on File</label></div>
                  <div><label style={ls}>Rating (1-5)</label><input style={fs} type="number" min="0" max="5" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: Number(e.target.value) }))} /></div>
                </div>
              </>}

              <div><label style={ls}>Notes</label><textarea style={{ ...fs, minHeight: 50, resize: "vertical" }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              {validationError && <div style={{ padding: "8px 12px", borderRadius: 6, background: C.redBg, color: C.red, fontSize: 12, fontWeight: 600 }}>{validationError}</div>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSubmit} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: C.green, color: C.white, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Create {labels[type]}</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ============================================================
    // SHARED: TASKS PANEL (can be added to any CRM object)
    // ============================================================


export default DirectoryModule;
