import React, { useState } from 'react';
import { C } from '../utils/constants';
import { generateId } from '../utils/helpers';

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


export default CreateTicketModal;
