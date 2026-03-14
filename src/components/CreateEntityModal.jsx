import React, { useState } from 'react';
import { C } from '../utils/constants';

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


export default CreateEntityModal;
