import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { C } from '../utils/constants';
import { I, StatusBadge, MarketTag, ProgressBar, StatCard } from '../components/shared';
import { generateId, formatCurrency, MARKETS, MARKET_LABELS } from '../utils/constants';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { getFirestoreDb } from '../utils/firebase';
import EmailCompose from '../components/EmailCompose';
import DocumentList from '../components/DocumentList';

// Constants - define default sales stages if not available
const SALES_STAGES = [
  { id: "new_lead", label: "New Lead", color: "#3B82F6" },
  { id: "being_estimated", label: "Being Estimated", color: "#F59E0B" },
  { id: "awarded", label: "Awarded", color: "#10B981" },
  { id: "closed_lost", label: "Closed Lost", color: "#EF4444" }
];

    function CreateLeadModal({ entities, onClose, onCreate, prefill }) {
      const { companies, properties, contacts } = entities;
      const [form, setForm] = useState({ jobName: "", projectType: prefill?.projectType || "Apartment Complex", constructionType: "Replacement", roofSlope: "Steep Slope", estimateMaterial: "Shingles", companyId: prefill?.companyId || "", propertyId: prefill?.propertyId || "", contactId: prefill?.contactId || "", market: "ATL", source: "ZoomInfo", estimatedValue: 0, notes: "" });
      const [validationError, setValidationError] = useState("");
      const fs = { width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none", boxSizing: "border-box" };
      const ls = { fontSize: 11, fontWeight: 600, color: C.gray600, marginBottom: 3, display: "block" };
      const lsReq = { ...ls, color: C.navy };

      const isResidential = form.projectType === "Residential";
      const needsCompany = !isResidential;

      // Auto-populate company when property or contact is selected
      useEffect(() => {
        if (!form.companyId) {
          if (form.propertyId) { const p = properties.find(x => x.id === form.propertyId); if (p?.companyId) setForm(f => ({ ...f, companyId: p.companyId })); }
          else if (form.contactId) { const c = contacts.find(x => x.id === form.contactId); if (c?.companyId) setForm(f => ({ ...f, companyId: c.companyId })); }
        }
      }, [form.propertyId, form.contactId]);

      const filteredProps = form.companyId ? properties.filter(p => p.companyId === form.companyId || !p.companyId) : properties;
      const filteredContacts = form.companyId ? contacts.filter(c => c.companyId === form.companyId || !c.companyId) : contacts;
      const selectedProp = properties.find(p => p.id === form.propertyId);
      const selectedContact = contacts.find(c => c.id === form.contactId);
      const selectedCompany = companies.find(c => c.id === form.companyId);

      const validate = () => {
        if (!form.jobName.trim()) return "Job name is required.";
        if (!form.projectType) return "Project type is required.";
        if (needsCompany && !form.companyId) return "Non-residential projects require a company.";
        if (!form.propertyId) return "A property is required for every project.";
        if (!form.contactId) return "A contact is required for every project.";
        return "";
      };

      const handleSubmit = () => {
        const err = validate();
        if (err) { setValidationError(err); return; }
        setValidationError("");
        onCreate({ ...form, company: selectedCompany?.name || "" });
      };

      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }} onClick={onClose}>
          <div style={{ background: C.white, borderRadius: 16, width: 560, maxHeight: "85vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${C.gray200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>New Project</h2>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400 }}>{I.x}</button>
            </div>
            <div style={{ padding: "20px 28px 28px", display: "grid", gap: 14 }}>
              <div><label style={lsReq}>Job Name *</label><input style={{ ...fs, fontWeight: 600 }} value={form.jobName} onChange={e => setForm(f => ({ ...f, jobName: e.target.value }))} placeholder="e.g. Preserve at Tampa Palms — Re-Roof Phase 1" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lsReq}>Project Type *</label><select style={fs} value={form.projectType} onChange={e => setForm(f => ({ ...f, projectType: e.target.value, companyId: e.target.value === "Residential" ? "" : f.companyId }))}>{PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label style={lsReq}>Construction Type *</label><select style={fs} value={form.constructionType} onChange={e => setForm(f => ({ ...f, constructionType: e.target.value }))}><option value="Replacement">Replacement</option><option value="New Construction">New Construction</option></select></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={ls}>Roof Slope</label><select style={fs} value={form.roofSlope} onChange={e => setForm(f => ({ ...f, roofSlope: e.target.value }))}><option value="Steep Slope">Steep Slope</option><option value="Low-Slope">Low-Slope</option></select></div>
                <div><label style={ls}>Material</label><select style={fs} value={form.estimateMaterial} onChange={e => setForm(f => ({ ...f, estimateMaterial: e.target.value }))}><option value="Shingles">Shingles</option><option value="Tile">Tile</option><option value="TPO">TPO</option><option value="Metal">Metal</option><option value="Modified Bitumen">Modified Bitumen</option><option value="Built-Up">Built-Up</option><option value="Single-Ply">Single-Ply</option><option value="Other">Other</option></select></div>
              </div>
              <div style={{ padding: "14px 16px", borderRadius: 10, background: C.gray50, border: `1px solid ${C.gray200}` }}>
                <h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>Link to Directory</h4>
                <div style={{ display: "grid", gap: 10 }}>
                  {needsCompany ? (
                    <div><label style={lsReq}>Company *</label><SearchableSelect options={companies.map(c => ({ value: c.id, label: c.name, sub: `${c.market || ""} · ${c.type || ""}` }))} value={form.companyId} onChange={v => setForm(f => ({ ...f, companyId: v, propertyId: "", contactId: "" }))} placeholder="Type to search companies..." required emptyMsg="No companies found" /></div>
                  ) : (
                    <div><label style={ls}>Company <span style={{ fontWeight: 400, color: C.gray400 }}>(optional)</span></label><SearchableSelect options={companies.map(c => ({ value: c.id, label: c.name, sub: `${c.market || ""} · ${c.type || ""}` }))} value={form.companyId} onChange={v => setForm(f => ({ ...f, companyId: v, propertyId: "", contactId: "" }))} placeholder="Type to search companies..." /></div>
                  )}
                  <div><label style={lsReq}>Property *</label><SearchableSelect options={filteredProps.map(p => ({ value: p.id, label: p.name, sub: p.address || "" }))} value={form.propertyId} onChange={v => setForm(f => ({ ...f, propertyId: v }))} placeholder="Type to search properties..." required emptyMsg="No properties — create in Directory" /></div>
                  <div><label style={lsReq}>Contact *</label><SearchableSelect options={filteredContacts.map(c => ({ value: c.id, label: c.name, sub: [c.email, c.phone].filter(Boolean).join(" · ") }))} value={form.contactId} onChange={v => setForm(f => ({ ...f, contactId: v }))} placeholder="Type to search contacts..." required emptyMsg="No contacts — create in Directory" /></div>
                </div>
              </div>
              {/* Selected summary */}
              {(selectedProp || selectedContact || selectedCompany) && <div style={{ padding: "10px 14px", borderRadius: 8, background: C.greenBg + "40", border: `1px solid ${C.green}30`, fontSize: 12 }}>
                {selectedCompany && <div style={{ marginBottom: 2 }}>🏢 <strong>{selectedCompany.name}</strong></div>}
                {selectedProp && <div style={{ marginBottom: 2 }}>🏠 {selectedProp.name} — {selectedProp.address || "No address"}</div>}
                {selectedContact && <div>👤 {selectedContact.name} — {selectedContact.email || selectedContact.phone || ""}</div>}
              </div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={ls}>Market</label><select style={fs} value={form.market} onChange={e => setForm(f => ({ ...f, market: e.target.value }))}>{MARKETS.map(m => <option key={m} value={m}>{MARKET_LABELS[m]}</option>)}</select></div>
                <div><label style={ls}>Source</label><select style={fs} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>{LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <div><label style={ls}>Notes</label><textarea style={{ ...fs, minHeight: 60, resize: "vertical" }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              {validationError && <div style={{ padding: "8px 12px", borderRadius: 6, background: C.redBg, color: C.red, fontSize: 12, fontWeight: 600 }}>{validationError}</div>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSubmit} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, color: C.white, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Create Project</button>
              </div>
            </div>
          </div>
        </div>
      );
    }


    function SovEditor({ leadId, projectName, estimatedValue, user }) {
      const [sovItems, setSovItems] = useState([]);
      const [existingSov, setExistingSov] = useState(null);
      const [loading, setLoading] = useState(true);
      const [newItem, setNewItem] = useState({ description: "", amount: "" });

      // Load existing SOV for this lead
      useEffect(() => {
        if (!firestoreDb || !leadId) { setLoading(false); return; }
        firestoreDb.collection("cr_schedule_of_values").where("leadId", "==", leadId).limit(1).get().then(snap => {
          if (!snap.empty) { const doc = snap.docs[0]; const data = doc.data(); setExistingSov({ ...data, _docId: doc.id }); setSovItems(data.items || []); }
          setLoading(false);
        }).catch(err => { console.warn("SOV load error:", err.message); setLoading(false); });
      }, [leadId]);

      const addItem = () => {
        if (!newItem.description.trim()) return;
        setSovItems(prev => [...prev, { id: generateId(), description: newItem.description.trim(), amount: Number(newItem.amount) || 0, completionPct: 0, invoiced: false }]);
        setNewItem({ description: "", amount: "" });
      };
      const removeItem = (id) => setSovItems(prev => prev.filter(i => i.id !== id));
      const updateItem = (id, field, val) => setSovItems(prev => prev.map(i => i.id === id ? { ...i, [field]: field === "amount" || field === "completionPct" ? Number(val) || 0 : val } : i));

      const handleSave = async () => {
        if (!firestoreDb || sovItems.length === 0) return;
        const sovData = { leadId, projectName, items: sovItems, totalValue: sovItems.reduce((s, i) => s + i.amount, 0), updatedAt: new Date().toISOString(), updatedBy: user.name };
        try {
          if (existingSov?._docId) { await firestoreDb.collection("cr_schedule_of_values").doc(existingSov._docId).update(sovData); }
          else { sovData.createdAt = new Date().toISOString(); sovData.createdBy = user.name; const ref = await firestoreDb.collection("cr_schedule_of_values").add(sovData); setExistingSov({ ...sovData, _docId: ref.id }); }
          alert("Schedule of Values saved!");
        } catch (e) { alert("Error saving SOV: " + e.message); }
      };

      const totalSov = sovItems.reduce((s, i) => s + i.amount, 0);
      const completedValue = sovItems.reduce((s, i) => s + (i.amount * (i.completionPct / 100)), 0);

      if (loading) return React.createElement("div", { style: { textAlign: "center", padding: 20, color: C.gray400, fontSize: 12 } }, "Loading...");

      return React.createElement("div", null,
        /* Summary cards */
        React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 16 } },
          React.createElement("div", { style: { flex: 1, padding: "10px 14px", borderRadius: 8, background: C.gray50, border: `1px solid ${C.gray200}`, textAlign: "center" } },
            React.createElement("div", { style: { fontSize: 10, color: C.gray400, fontWeight: 600 } }, "Contract Value"),
            React.createElement("div", { style: { fontSize: 16, fontWeight: 800, color: C.navy } }, formatCurrency(estimatedValue))
          ),
          React.createElement("div", { style: { flex: 1, padding: "10px 14px", borderRadius: 8, background: C.gray50, border: `1px solid ${C.gray200}`, textAlign: "center" } },
            React.createElement("div", { style: { fontSize: 10, color: C.gray400, fontWeight: 600 } }, "SOV Total"),
            React.createElement("div", { style: { fontSize: 16, fontWeight: 800, color: totalSov > 0 ? C.navy : C.gray400 } }, formatCurrency(totalSov))
          ),
          React.createElement("div", { style: { flex: 1, padding: "10px 14px", borderRadius: 8, background: C.gray50, border: `1px solid ${C.gray200}`, textAlign: "center" } },
            React.createElement("div", { style: { fontSize: 10, color: C.gray400, fontWeight: 600 } }, "Completed"),
            React.createElement("div", { style: { fontSize: 16, fontWeight: 800, color: C.green } }, formatCurrency(completedValue))
          )
        ),
        /* Line items */
        sovItems.length > 0 && React.createElement("div", { style: { borderRadius: 8, border: `1px solid ${C.gray200}`, overflow: "hidden", marginBottom: 12 } },
          React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 } },
            React.createElement("thead", null, React.createElement("tr", { style: { background: C.gray50 } },
              React.createElement("th", { style: { padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400 } }, "Description"),
              React.createElement("th", { style: { padding: "8px 10px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400 } }, "Amount"),
              React.createElement("th", { style: { padding: "8px 10px", textAlign: "center", fontSize: 10, fontWeight: 700, color: C.gray400 } }, "% Complete"),
              React.createElement("th", { style: { padding: "8px 10px", textAlign: "center", fontSize: 10, fontWeight: 700, color: C.gray400 } }, "")
            )),
            React.createElement("tbody", null, sovItems.map(item =>
              React.createElement("tr", { key: item.id, style: { borderTop: `1px solid ${C.gray100}` } },
                React.createElement("td", { style: { padding: "8px 10px" } }, React.createElement("input", { value: item.description, onChange: e => updateItem(item.id, "description", e.target.value), style: { width: "100%", border: "none", fontSize: 12, color: C.navy, background: "transparent", outline: "none" } })),
                React.createElement("td", { style: { padding: "8px 10px", textAlign: "right" } }, React.createElement("input", { type: "number", value: item.amount, onChange: e => updateItem(item.id, "amount", e.target.value), style: { width: 90, border: `1px solid ${C.gray200}`, borderRadius: 4, padding: "4px 6px", fontSize: 12, textAlign: "right", color: C.navy, outline: "none" } })),
                React.createElement("td", { style: { padding: "8px 10px", textAlign: "center" } }, React.createElement("input", { type: "number", min: 0, max: 100, value: item.completionPct, onChange: e => updateItem(item.id, "completionPct", e.target.value), style: { width: 50, border: `1px solid ${C.gray200}`, borderRadius: 4, padding: "4px 6px", fontSize: 12, textAlign: "center", color: C.navy, outline: "none" } })),
                React.createElement("td", { style: { padding: "8px 10px", textAlign: "center" } }, React.createElement("button", { onClick: () => removeItem(item.id), style: { background: "none", border: "none", cursor: "pointer", color: C.gray400, fontSize: 14 } }, "✕"))
              )
            ))
          )
        ),
        /* Add new item */
        React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 12 } },
          React.createElement("input", { placeholder: "Line item description...", value: newItem.description, onChange: e => setNewItem(p => ({ ...p, description: e.target.value })), style: { flex: 1, padding: "8px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.navy, outline: "none" } }),
          React.createElement("input", { type: "number", placeholder: "Amount", value: newItem.amount, onChange: e => setNewItem(p => ({ ...p, amount: e.target.value })), style: { width: 100, padding: "8px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.navy, outline: "none", textAlign: "right" } }),
          React.createElement("button", { onClick: addItem, style: { padding: "8px 14px", borderRadius: 6, border: "none", background: C.navy, color: C.white, fontSize: 11, fontWeight: 700, cursor: "pointer" } }, "+ Add")
        ),
        /* Save + Export buttons */
        sovItems.length > 0 && React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
          React.createElement("button", { onClick: handleSave, style: { padding: "10px 20px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, color: C.white, fontSize: 12, fontWeight: 700, cursor: "pointer" } }, existingSov ? "Update SOV" : "Save Schedule of Values"),
          React.createElement("button", { onClick: () => {
            const rows = [["Description", "Amount", "% Complete", "Completed Value"]];
            sovItems.forEach(item => {
              rows.push([item.description, item.amount.toFixed(2), item.completionPct, (item.amount * item.completionPct / 100).toFixed(2)]);
            });
            rows.push([]);
            rows.push(["Total", totalSov.toFixed(2), "", completedValue.toFixed(2)]);
            rows.push(["Project", projectName]);
            const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `SOV_${(projectName || "project").replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
          }, style: { padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.navy, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 } }, "📥 Export SOV")
        )
      );
    }

    function LeadDocumentsTab({ lead, onUpdate, user }) {
      const [selectedCategory, setSelectedCategory] = useState("Proposal");
      const fileInputRef = useRef(null);
      const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !firestoreDb || !firebaseStorage) return;
        try {
          const docId = generateId();
          const docPath = `leads/${lead.id}/documents/${Date.now()}_${file.name}`;
          const docRef = firebaseStorage.ref(docPath);
          await docRef.put(file);
          const downloadURL = await docRef.getDownloadURL();
          const newDoc = { id: docId, name: file.name, url: downloadURL, type: file.type, category: selectedCategory, uploadedAt: new Date().toISOString(), uploadedBy: user.name };
          onUpdate(lead.id, { documents: [...(lead.documents || []), newDoc] });
          if (fileInputRef.current) fileInputRef.current.value = "";
          setSelectedCategory("Proposal");
        } catch (err) { console.error("Upload failed:", err); alert("Failed to upload document"); }
      };
      const handleDelete = (docId) => { if (confirm("Delete this document?")) { onUpdate(lead.id, { documents: (lead.documents || []).filter(d => d.id !== docId) }); } };
      return (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ padding: "16px", borderRadius: 10, border: `1px solid ${C.gray200}`, background: C.gray50 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Upload Document</h4>
            <div style={{ display: "grid", gap: 10 }}>
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={{ padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 13, color: C.navy, outline: "none", background: C.white, cursor: "pointer" }}>
                <option value="Proposal">Proposal</option>
                <option value="Photos">Photos</option>
                <option value="Survey Report">Survey Report</option>
                <option value="Contract">Contract</option>
                <option value="Insurance">Insurance</option>
                <option value="Permit">Permit</option>
                <option value="Lien Waiver">Lien Waiver</option>
                <option value="Other">Other</option>
              </select>
              <div>
                <input ref={fileInputRef} type="file" onChange={handleFileUpload} style={{ display: "none" }} />
                <button onClick={() => fileInputRef.current?.click()} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.gray300}`, background: C.white, color: C.navy, fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer" }}>Choose File</button>
              </div>
            </div>
          </div>
          {(lead.documents || []).length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {(lead.documents || []).map(doc => (
                <div key={doc.id} style={{ padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.white, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 16 }}>{doc.type?.includes("image") ? "🖼️" : doc.type?.includes("pdf") ? "📄" : "📎"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <button onClick={() => window.open(doc.url, "_blank")} style={{ background: "none", border: "none", color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", textDecoration: "underline" }}>{doc.name}</button>
                      <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}><span style={{ padding: "2px 6px", background: C.gray100, borderRadius: 4, fontSize: 10, fontWeight: 600, marginRight: 6 }}>{doc.category}</span>{new Date(doc.uploadedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(doc.id)} style={{ padding: "4px 8px", borderRadius: 4, border: "none", background: C.redBg, color: C.red, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Delete</button>
                </div>
              ))}
            </div>
          ) : <p style={{ color: C.gray400, fontSize: 12, textAlign: "center", padding: "20px" }}>No documents yet. Upload files to track proposals, contracts, and other project materials.</p>}
        </div>
      );
    }

    function LeadDetailPanel({ lead, entities, onClose, onUpdate, onStageChange, onDelete, user, crmUsers, onMention, inspections, setInspections }) {
      const { companies, properties, contacts } = entities;
      const co = companies.find(c => c.id === lead.companyId);
      const pr = properties.find(p => p.id === lead.propertyId);
      const ct = contacts.find(c => c.id === lead.contactId);
      const [activeTab, setActiveTab] = useState("details");
      const [newNote, setNewNote] = useState("");
      const [newEmailSubject, setNewEmailSubject] = useState("");
      const [newEmailBody, setNewEmailBody] = useState("");
      const [showEmailForm, setShowEmailForm] = useState(false);
      const [showMentionSuggest, setShowMentionSuggest] = useState(false);
      const [mentionFilter, setMentionFilter] = useState("");
      const [editingInspection, setEditingInspection] = useState(null);
      const [leadSubmissions, setLeadSubmissions] = useState([]);
      const [expandedEstimate, setExpandedEstimate] = useState(null);
      const currentStage = SALES_STAGES.find(s => s.id === lead.stage);

      useEffect(() => {
        if (firestoreDb) {
          loadAllSubmissions().then(all => setLeadSubmissions(all.filter(s => s.leadId === lead.id)));
        }
      }, [lead.id]);

      const handleSaveInspection = (ins) => {
        if (setInspections) setInspections(prev => { const idx = prev.findIndex(i => i.id === ins.id); return idx >= 0 ? prev.map(i => i.id === ins.id ? ins : i) : [...prev, ins]; });
        setEditingInspection(null);
      };
      const handleCreateInspection = () => {
        setEditingInspection({ id: generateId(), entityType: "lead", entityId: lead.id, data: {}, status: "Draft", summary: "", createdAt: new Date().toISOString(), createdBy: user.name });
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
      const filteredUsers = (crmUsers || []).filter(u => u.name?.toLowerCase().includes(mentionFilter));

      const handleAddNote = () => {
        if (!newNote.trim()) return;
        // Parse @mentions by matching against known user names
        (crmUsers || []).forEach(u => {
          if (u.name && newNote.includes("@" + u.name) && u.email && onMention) {
            onMention(u.email, `mentioned you in a note on "${lead.jobName || "a project"}": "${newNote.trim().slice(0, 100)}"`);
          }
        });
        onUpdate(lead.id, { activities: [...(lead.activities || []), { type: "note", text: newNote.trim(), by: user.name, at: new Date().toISOString() }] });
        setNewNote("");
      };
      const handleSetAction = (a) => onUpdate(lead.id, { nextAction: a, activities: [...(lead.activities || []), { type: "action", text: `Next: ${a}`, by: user.name, at: new Date().toISOString() }] });
      const handleLogEmail = () => {
        if (!newEmailSubject.trim()) return;
        const emailEntry = { id: generateId(), subject: newEmailSubject.trim(), body: newEmailBody.trim(), to: ct?.email || "", by: user.name, at: new Date().toISOString() };
        onUpdate(lead.id, { emailLog: [...(lead.emailLog || []), emailEntry], activities: [...(lead.activities || []), { type: "email", text: `Email logged: ${newEmailSubject.trim()}`, by: user.name, at: new Date().toISOString() }] });
        setNewEmailSubject(""); setNewEmailBody(""); setShowEmailForm(false);
      };
      // Suggested next actions based on current stage
      const suggestedActions = {
        new_lead: ["Schedule appointment", "Send intro email", "Research property"],
        appointment_scheduled: ["Confirm appointment", "Prepare inspection checklist", "Send reminder"],
        inspected: ["Send to estimating", "Follow up on findings", "Request additional info"],
        being_estimated: ["Check estimate status", "Request update from estimator"],
        estimate_approved: ["Send proposal to client", "Schedule presentation meeting"],
        proposal_sent: ["Follow up on proposal", "Schedule negotiation call", "Send comparison"],
        negotiation: ["Revise proposal", "Schedule final meeting", "Send revised terms"],
        awarded: ["Kick off production", "Send contract", "Schedule start date"],
      };

      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(17,29,53,0.5)", display: "flex", justifyContent: "center", alignItems: "flex-start", overflowY: "auto" }} onClick={onClose}>
          <div style={{ width: "100%", maxWidth: 800, background: C.white, margin: "40px auto", borderRadius: 16, boxShadow: "0 25px 60px rgba(0,0,0,0.3)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", background: `linear-gradient(135deg, ${C.navyDark}, ${C.navy})`, color: C.white }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: C.white, padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600 }}>← Close</button>
                <button onClick={() => onDelete(lead.id)} style={{ background: "rgba(239,68,68,0.3)", border: "none", cursor: "pointer", color: "#FCA5A5", padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600 }}>Delete</button>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>{lead.jobName || co?.name || lead.company || "Untitled"}</h2>
              <p style={{ fontSize: 12, opacity: 0.7, margin: "0 0 12px" }}>{co && lead.jobName ? `🏢 ${co.name} · ` : ""}{ct?.name || lead.contactName} · {ct?.email || lead.contactEmail}</p>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: currentStage?.color + "30", color: currentStage?.color }}>{currentStage?.label}</span>
                <MarketTag market={lead.market} />
                <span style={{ fontSize: 16, fontWeight: 800, marginLeft: "auto" }}>{formatCurrency(lead.estimatedValue || 0)}</span>
              </div>
            </div>
            {/* Stage quick-move */}
            <div style={{ padding: "10px 24px", borderBottom: `1px solid ${C.gray200}`, display: "flex", gap: 3, overflowX: "auto" }}>
              {SALES_STAGES.map(s => <button key={s.id} onClick={() => onStageChange(lead.id, s.id)} style={{ padding: "5px 10px", borderRadius: 5, border: lead.stage === s.id ? `2px solid ${s.color}` : `1px solid ${C.gray200}`, background: lead.stage === s.id ? s.color + "15" : C.white, color: lead.stage === s.id ? s.color : C.gray500, fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{s.label}</button>)}
            </div>
            <div style={{ display: "flex", borderBottom: `1px solid ${C.gray200}`, overflowX: "auto" }}>
              {[{ id: "details", label: "Details" }, { id: "emails", label: `Emails (${(lead.emailLog || []).length})` }, { id: "estimates", label: `Estimates (${leadSubmissions.length})` }, { id: "sov", label: "SOV" }, { id: "inspections", label: `Inspections (${(inspections || []).filter(i => i.entityType === "lead" && i.entityId === lead.id).length})` }, { id: "tasks", label: "Tasks" }, { id: "activity", label: "Activity" }, { id: "actions", label: "Actions" }, { id: "documents", label: `Docs (${(lead.documents || []).length})` }].map(t => <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "10px 18px", border: "none", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: activeTab === t.id ? C.red : C.gray500, borderBottom: `2px solid ${activeTab === t.id ? C.red : "transparent"}`, whiteSpace: "nowrap" }}>{t.label}</button>)}
            </div>
            <div style={{ padding: "20px 24px" }}>
              {activeTab === "details" && (
                <div style={{ display: "grid", gap: 16 }}>
                  {/* Linked records — full detail cards */}
                  {(co || pr || ct) && <div>
                    <h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Linked Records</h4>
                    {co && <div style={{ padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.gray200}`, marginBottom: 8, background: C.gray50 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 4 }}>🏢 {co.name}</div>
                      <div style={{ fontSize: 11, color: C.gray500, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                        {co.type && <span>{co.type}</span>}{co.phone && <span>📞 {co.phone}</span>}{co.address && <span>📍 {co.address}</span>}{co.market && <span>🌐 {MARKET_LABELS[co.market] || co.market}</span>}
                      </div>
                    </div>}
                    {pr && <div style={{ padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.gray200}`, marginBottom: 8, background: C.gray50 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 4 }}>🏠 {pr.name}</div>
                      <div style={{ fontSize: 11, color: C.gray500 }}>
                        {pr.address && <div>📍 {pr.address}</div>}
                        <div>{pr.propertyType && `${pr.propertyType} · `}{pr.sqft ? `${pr.sqft.toLocaleString()} SF` : ""}{pr.roofType ? ` · ${pr.roofType}` : ""}</div>
                      </div>
                    </div>}
                    {ct && <div style={{ padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.gray200}`, marginBottom: 8, background: C.gray50 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 4 }}>👤 {ct.name} {ct.contactType && <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: ct.contactType === "B2B" ? C.blueBg : C.greenBg, color: ct.contactType === "B2B" ? C.blue : C.green, marginLeft: 6 }}>{ct.contactType}</span>}</div>
                      <div style={{ fontSize: 11, color: C.gray500 }}>
                        {ct.email && <div>✉ {ct.email}</div>}{ct.phone && <div>📞 {ct.phone}</div>}{ct.title && <div>💼 {ct.title}</div>}
                      </div>
                    </div>}
                  </div>}
                  <div style={{ display: "grid", gap: 4 }}>
                    {[["Source", lead.source], ["Market", MARKET_LABELS[lead.market]], ["Est. Value", formatCurrency(lead.estimatedValue || 0)], ["Created", new Date(lead.createdAt).toLocaleDateString()]].map(([l, v]) => <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.gray100}` }}><span style={{ fontSize: 12, color: C.gray500 }}>{l}</span><span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{v}</span></div>)}
                  </div>
                  {lead.notes && <div style={{ padding: "10px 12px", borderRadius: 8, background: C.gray50, fontSize: 12, color: C.gray600, lineHeight: 1.5 }}>{lead.notes}</div>}
                </div>
              )}
              {activeTab === "emails" && (<div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: C.navy, margin: 0 }}>Email Communications</h4>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowEmailForm(!showEmailForm)} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.navy, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>📝 Log Email</button>
                    {(ct?.email) && <button onClick={() => { if (window.__crm_openEmail) window.__crm_openEmail({ contactId: ct?.id, contactEmail: ct?.email, contactName: ct?.name, subject: `Colony Roofers — ${co?.name || ""}` }); }} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.navy, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>📧 Compose Email</button>}
                  </div>
                </div>
                {showEmailForm && <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${C.gray200}`, background: C.gray50, marginBottom: 16, display: "grid", gap: 10 }}>
                  <input value={newEmailSubject} onChange={e => setNewEmailSubject(e.target.value)} placeholder="Email subject..." style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 13, color: C.navy, outline: "none", boxSizing: "border-box" }} />
                  <textarea value={newEmailBody} onChange={e => setNewEmailBody(e.target.value)} placeholder="Email summary or paste body..." rows={3} style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 13, color: C.navy, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => { setShowEmailForm(false); setNewEmailSubject(""); setNewEmailBody(""); }} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    <button onClick={handleLogEmail} disabled={!newEmailSubject.trim()} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: newEmailSubject.trim() ? C.navy : C.gray200, color: newEmailSubject.trim() ? C.white : C.gray400, fontSize: 11, fontWeight: 600, cursor: newEmailSubject.trim() ? "pointer" : "default" }}>Log Email</button>
                  </div>
                </div>}
                {(lead.emailLog || []).length > 0 ? (lead.emailLog || []).slice().reverse().map(em => (
                  <div key={em.id} style={{ padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.gray200}`, marginBottom: 8, background: C.white }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{em.subject}</div>
                      <div style={{ fontSize: 10, color: C.gray400 }}>{new Date(em.at).toLocaleString()}</div>
                    </div>
                    {em.to && <div style={{ fontSize: 11, color: C.gray500, marginBottom: 4 }}>To: {em.to}</div>}
                    {em.body && <div style={{ fontSize: 12, color: C.gray600, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{em.body}</div>}
                    <div style={{ fontSize: 10, color: C.gray400, marginTop: 4 }}>Logged by {em.by}</div>
                  </div>
                )) : <div style={{ padding: 32, textAlign: "center", background: C.gray50, borderRadius: 8 }}><div style={{ fontSize: 28, opacity: 0.2, marginBottom: 8 }}>📧</div><p style={{ fontSize: 12, color: C.gray400 }}>No emails logged yet</p></div>}
              </div>)}
              {activeTab === "estimates" && (<div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Estimates for this Job</h4>
                {/* Estimate status summary */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <div style={{ padding: "8px 14px", borderRadius: 8, background: C.gray50, border: `1px solid ${C.gray200}`, flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: C.gray400, fontWeight: 600 }}>Current Stage</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: currentStage?.color || C.navy, marginTop: 2 }}>{currentStage?.label || "—"}</div>
                  </div>
                  <div style={{ padding: "8px 14px", borderRadius: 8, background: C.gray50, border: `1px solid ${C.gray200}`, flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: C.gray400, fontWeight: 600 }}>Estimator</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginTop: 2 }}>{lead.estimator || "Unassigned"}</div>
                  </div>
                  <div style={{ padding: "8px 14px", borderRadius: 8, background: C.gray50, border: `1px solid ${C.gray200}`, flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: C.gray400, fontWeight: 600 }}>Est. Value</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginTop: 2 }}>{formatCurrency(lead.estimatedValue || 0)}</div>
                  </div>
                </div>
                {(() => {
                  const subs = leadSubmissions;
                  if (subs.length === 0) return <div style={{ padding: 32, textAlign: "center", background: C.gray50, borderRadius: 8 }}><div style={{ fontSize: 28, opacity: 0.2, marginBottom: 8 }}>📐</div><p style={{ fontSize: 12, color: C.gray400 }}>No estimates yet{lead.stage === "being_estimated" ? " — estimates will appear here once submitted" : ""}</p></div>;
                  return subs.map(s => (
                    <div key={s.id} style={{ padding: "14px 16px", borderRadius: 8, border: `1px solid ${expandedEstimate === s.id ? C.navy + "40" : C.gray200}`, marginBottom: 8, background: C.white }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{formatCurrency(s.totalPrice || 0)}</div>
                        <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: { pending: C.yellowBg, approved: C.greenBg, awarded: C.greenBg + "80", rejected: C.redBg, not_selected: C.gray100 }[s.status] || C.gray100, color: { pending: C.yellow, approved: C.green, awarded: C.green, rejected: C.red, not_selected: C.gray400 }[s.status] || C.gray400 }}>{s.status}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.gray500, cursor: "pointer" }} onClick={() => setExpandedEstimate(expandedEstimate === s.id ? null : s.id)}>
                        <span>Submitted by {s.submittedBy} · {new Date(s.submittedAt || s.createdAt).toLocaleDateString()}</span>
                        {s.buildings && <span> · {s.buildings.length} building{s.buildings.length > 1 ? "s" : ""}</span>}
                        {s.buildings && <span> · {s.buildings.reduce((sum, b) => sum + (b.totalArea || 0), 0).toLocaleString()} SF</span>}
                        <span style={{ color: C.blue, fontWeight: 600, marginLeft: 6 }}>{expandedEstimate === s.id ? "▲ Hide Details" : "▼ View Details"}</span>
                      </div>
                      {s.submittedForApproval && <div style={{ fontSize: 10, color: C.blue, fontWeight: 600, marginTop: 4 }}>📤 Submitted for approval {s.submittedForApprovalAt ? new Date(s.submittedForApprovalAt).toLocaleDateString() : ""} by {s.submittedForApprovalBy || "—"}</div>}
                      {s.approvedAt && <div style={{ fontSize: 10, color: C.green, marginTop: 4 }}>✅ Approved {new Date(s.approvedAt).toLocaleDateString()} by {s.approvedBy}</div>}
                      {s.awardedAt && <div style={{ fontSize: 10, color: C.blue, marginTop: 4 }}>🏆 Awarded {new Date(s.awardedAt).toLocaleDateString()} by {s.awardedBy}</div>}
                      {expandedEstimate === s.id && <div style={{ marginTop: 12, borderTop: `1px solid ${C.gray100}`, paddingTop: 12 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 12 }}>
                          <div style={{ padding: "8px 10px", borderRadius: 6, background: C.gray50, border: `1px solid ${C.gray200}` }}><div style={{ fontSize: 9, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Roof Type</div><div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginTop: 2 }}>{s.estimateRoofType || "—"}</div></div>
                          <div style={{ padding: "8px 10px", borderRadius: 6, background: C.gray50, border: `1px solid ${C.gray200}` }}><div style={{ fontSize: 9, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Market</div><div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginTop: 2 }}>{s.market || "—"}</div></div>
                          <div style={{ padding: "8px 10px", borderRadius: 6, background: C.greenBg, border: `1px solid ${C.green}30` }}><div style={{ fontSize: 9, fontWeight: 700, color: C.green, textTransform: "uppercase" }}>Total Price</div><div style={{ fontSize: 14, fontWeight: 800, color: C.green, marginTop: 2 }}>{formatCurrency(s.totalPrice || 0)}</div></div>
                        </div>
                        {s.buildings && s.buildings.length > 0 && <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Buildings ({s.buildings.length})</div>
                          {s.buildings.map((b, i) => <div key={i} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.gray100}`, marginBottom: 3, fontSize: 11, display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 600, color: C.navy }}>{b.siteplanNum || `Bldg ${i+1}`}</span><span style={{ color: C.gray500 }}>{(b.totalArea || 0).toLocaleString()} sf · Pitch: {b.predominantPitch || "—"}</span></div>)}
                        </div>}
                      </div>}
                    </div>
                  ));
                })()}
                {/* Estimate-related activity timeline */}
                {(lead.activities || []).filter(a => a.type === "estimate" || a.type === "assigned" || a.text?.toLowerCase().includes("estimat")).length > 0 && <div style={{ marginTop: 16 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 8px" }}>Estimate Activity</h4>
                  {(lead.activities || []).filter(a => a.type === "estimate" || a.type === "assigned" || a.type === "stage_change" || a.text?.toLowerCase().includes("estimat") || a.text?.toLowerCase().includes("approv")).slice().reverse().map((a, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: `1px solid ${C.gray100}`, fontSize: 11 }}><span style={{ fontWeight: 600, color: C.navy }}>{a.by}</span> <span style={{ color: C.gray500 }}>— {a.text}</span> <span style={{ color: C.gray400, marginLeft: 4 }}>{new Date(a.at).toLocaleDateString()}</span></div>
                  ))}
                </div>}
              </div>)}
              {activeTab === "sov" && (<div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Schedule of Values</h4>
                <p style={{ fontSize: 12, color: C.gray500, marginBottom: 16 }}>Create a Schedule of Values for progress billing on this project. Line items track completion % and generate invoices in Finance.</p>
                <SovEditor leadId={lead.id} projectName={lead.jobName || co?.name || "Project"} estimatedValue={lead.estimatedValue || 0} user={user} />
              </div>)}
              {activeTab === "inspections" && (<div>
                <InspectionsList inspections={inspections || []} entityType="lead" entityId={lead.id} onOpen={ins => setEditingInspection(ins)} onCreate={handleCreateInspection} />
                {editingInspection && <InspectionForm inspection={editingInspection} onSave={handleSaveInspection} onClose={() => setEditingInspection(null)} user={user} crmUsers={crmUsers} />}
              </div>)}
              {activeTab === "tasks" && (<TasksPanel objectType="project" objectId={lead.id} user={user} crmUsers={crmUsers} />)}
              {activeTab === "activity" && (<div>
                <div style={{ position: "relative", display: "flex", gap: 8, marginBottom: 20 }}>
                  <input value={newNote} onChange={e => handleNoteChange(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAddNote(); }} placeholder="Add a note... (use @name to mention)" style={{ flex: 1, padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none" }} />
                  <button onClick={handleAddNote} disabled={!newNote.trim()} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: newNote.trim() ? C.navy : C.gray200, color: newNote.trim() ? C.white : C.gray400, fontSize: 12, fontWeight: 600, cursor: newNote.trim() ? "pointer" : "default" }}>Add</button>
                  {showMentionSuggest && filteredUsers.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 99, background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 160, overflowY: "auto", width: 200, marginTop: 4 }}>
                      {filteredUsers.slice(0, 6).map(u => (
                        <div key={u.email} onClick={() => insertMention(u)} style={{ padding: "8px 12px", cursor: "pointer", fontSize: 12, color: C.navy, fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = C.white}>
                          {u.name} <span style={{ color: C.gray400, fontSize: 10 }}>{u.role}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {(lead.activities || []).slice().reverse().map((a, i) => <div key={a.at + '_' + i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.gray100}` }}><span style={{ fontSize: 14 }}>{{ created: "🆕", stage_change: "📋", note: "📝", action: "🎯" }[a.type] || "📌"}</span><div><div style={{ fontSize: 12, color: C.navy }}>{a.text}</div><div style={{ fontSize: 10, color: C.gray400 }}>{a.by} · {new Date(a.at).toLocaleString()}</div></div></div>)}
              </div>)}
              {activeTab === "actions" && (<div style={{ display: "grid", gap: 14 }}>
                <div><h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 10px" }}>Suggested Next Actions</h4>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{(suggestedActions[lead.stage] || ["Follow Up", "Schedule Meeting"]).map(a => <button key={a} onClick={() => handleSetAction(a)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${lead.nextAction === a ? C.red + "60" : C.gray300}`, background: lead.nextAction === a ? C.redBg : C.white, color: lead.nextAction === a ? C.red : C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{a}</button>)}</div></div>
                {(ct?.email || lead.contactEmail) && <div><h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 10px" }}>Email</h4>
                <div style={{ marginTop: 4 }}><EmailCompose to={ct?.email || lead.contactEmail || ""} defaultSubject={`Colony Roofers — ${co?.name || lead.company}`} defaultBody={`Hey ${((ct?.name || lead.contactName || "").split(" ")[0]) || "there"},\n\nHope all is well.\n\n\n\nZach Reece, Owner\nColony Roofers\n404-806-0956`} contacts={contacts} entityType="lead" entityId={lead.id} entityName={leadName(lead)} onSent={(emailData) => { onUpdate(lead.id, { activities: [...(lead.activities || []), { type: "email", text: `Email sent to ${emailData.to}: ${emailData.subject}`, by: user.name, at: new Date().toISOString() }] }); }} /></div></div>}
                {lead.stage === "awarded" && <div style={{ padding: "16px", borderRadius: 10, border: `2px solid ${C.green}40`, background: C.greenBg + "40" }}><h4 style={{ fontSize: 13, fontWeight: 700, color: C.green, margin: "0 0 6px" }}>Awarded — Moving to Production</h4><p style={{ fontSize: 12, color: C.gray600, margin: "0 0 8px" }}>This project has been awarded and will appear on the Production board.</p></div>}
              </div>)}
              {activeTab === "documents" && <LeadDocumentsTab lead={lead} onUpdate={onUpdate} user={user} />}
            </div>
          </div>
        </div>
      );
    }

    // ============================================================
    // MODULE: DIRECTORY (Companies, Properties, Contacts)
    // ============================================================
    const COMPANY_TYPES = ["Property Manager", "HOA / Condo", "Owner / Investor", "General Contractor", "Government", "Non-Profit", "Other"];

    function SalesModule({ user, role, entities, crmUsers, onMention, inspections, setInspections }) {
      const { companies, properties, contacts, setCompanies } = entities;
      const [leadsData, saveLeads] = useFirestoreCollection("cr_sales_leads", []);
      const leadsRef = useRef(leadsData); leadsRef.current = leadsData;
      const setLeads = useCallback(u => { const n = typeof u === "function" ? u(leadsRef.current) : u; saveLeads(n); }, [saveLeads]);
      const leads = leadsData;

      const co = (id) => companies.find(c => c.id === id);
      const pr = (id) => properties.find(p => p.id === id);
      const ct = (id) => contacts.find(c => c.id === id);
      const leadName = (l) => l.jobName || co(l.companyId)?.name || l.company || "—";
      const leadContact = (l) => ct(l.contactId)?.name || l.contactName || "—";

      const [viewMode, setViewMode] = useState("kanban");
      const [selectedLead, setSelectedLead] = useState(null);
      const [showCreate, setShowCreate] = useState(false);
      const [showBidDatePrompt, setShowBidDatePrompt] = useState(null);
      const [bidDateInput, setBidDateInput] = useState("");
      const [bidScopeInput, setBidScopeInput] = useState("");
      const [bidNotesInput, setBidNotesInput] = useState("");
      const [search, setSearch] = useState("");
      const [marketFilter, setMarketFilter] = useState("All");
      const [dragLead, setDragLead] = useState(null);
      const [showWinModal, setShowWinModal] = useState(null);
      const [showLossModal, setShowLossModal] = useState(null);
      const [closeReason, setCloseReason] = useState("");
      const [closeNotes, setCloseNotes] = useState("");
      const [lostToCompetitor, setLostToCompetitor] = useState("");
      const [finalContractValue, setFinalContractValue] = useState("");

      const filtered = useMemo(() => leads.filter(l => {
        if (marketFilter !== "All" && l.market !== marketFilter) return false;
        if (search) { const s = search.toLowerCase(); if (!leadName(l).toLowerCase().includes(s) && !leadContact(l).toLowerCase().includes(s)) return false; }
        return true;
      }), [leads, marketFilter, search]);
      const { totalPipeline, wonValue, openLeads } = useMemo(() => {
        let tp = 0, wv = 0, ol = 0;
        filtered.forEach(l => {
          if (l.stage === "awarded") { wv += l.estimatedValue || 0; }
          else if (l.stage !== "closed_lost") { tp += l.estimatedValue || 0; ol++; }
        });
        return { totalPipeline: tp, wonValue: wv, openLeads: ol };
      }, [filtered]);
      const stageGroups = useMemo(() => {
        const g = {}; SALES_STAGES.forEach(s => g[s.id] = { items: [], total: 0 });
        filtered.forEach(l => { if (g[l.stage]) { g[l.stage].items.push(l); g[l.stage].total += l.estimatedValue || 0; } });
        return g;
      }, [filtered]);

      const handleCreate = (lead) => { setLeads(prev => [{ ...lead, id: generateId(), stage: "new_lead", createdAt: new Date().toISOString(), activities: [{ type: "created", text: "Project created", by: user.name, at: new Date().toISOString() }] }, ...prev]); setShowCreate(false); };
      const handleUpdate = (id, updates) => setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
      const handleStageChange = (leadId, newStage) => {
        if (newStage === "being_estimated") { setShowBidDatePrompt(leadId); setBidDateInput(""); setBidScopeInput(""); setBidNotesInput(""); return; }
        if (newStage === "awarded") { setShowWinModal(leadId); setCloseReason(""); setCloseNotes(""); setFinalContractValue(""); return; }
        if (newStage === "closed_lost") { setShowLossModal(leadId); setCloseReason(""); setCloseNotes(""); setLostToCompetitor(""); return; }
        setLeads(prev => prev.map(l => l.id !== leadId ? l : { ...l, stage: newStage, activities: [...(l.activities || []), { type: "stage_change", text: `Moved to ${SALES_STAGES.find(s => s.id === newStage)?.label}`, by: user.name, at: new Date().toISOString() }] }));
      };
      const handleConfirmBidDate = async () => {
        if (!bidDateInput) return;
        const scopeText = bidScopeInput.trim();
        const notesText = bidNotesInput.trim();
        const leadId = showBidDatePrompt;
        const theLead = leads.find(l => l.id === leadId);
        setLeads(prev => prev.map(l => l.id !== leadId ? l : {
          ...l, stage: "being_estimated", bidDueDate: bidDateInput,
          scopeOfWork: scopeText || l.scopeOfWork || "",
          estimatingNotes: notesText || l.estimatingNotes || "",
          activities: [...(l.activities || []),
            { type: "stage_change", text: `Moved to Being Estimated — Bid due ${new Date(bidDateInput).toLocaleDateString()}${scopeText ? `\nScope: ${scopeText}` : ""}${notesText ? `\nNotes: ${notesText}` : ""}`, by: user.name, at: new Date().toISOString() }
          ]
        }));
        // Auto-create first draft estimate for this job
        if (theLead && firestoreDb) {
          try {
            const leadCo = co(theLead.companyId);
            const leadPr = pr(theLead.propertyId);
            const draftEstimate = {
              id: "sub_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
              leadId: leadId,
              leadName: theLead.jobName || leadCo?.name || "Untitled",
              project: { jobName: theLead.jobName || "", companyName: leadCo?.name || "", address: leadPr?.address || "", market: theLead.market },
              companyId: theLead.companyId, propertyId: theLead.propertyId, contactId: theLead.contactId,
              market: theLead.market,
              buildings: [{ ...{ siteplanNum: "", roofRNum: "", phase: "", pipes: 0, totalArea: 0, pitchedArea: 0, flatArea: 0, predominantPitch: "", eaves: 0, valleys: 0, hips: 0, ridges: 0, rakes: 0, wallFlashing: 0, stepFlashing: 0 }, id: "b1" }],
              status: "draft", totalPrice: 0, submittedBy: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            };
            await firestoreDb.collection("submissions").doc(draftEstimate.id).set(draftEstimate);
          } catch (e) { console.error("Auto-create estimate failed:", e); }
        }
        setShowBidDatePrompt(null); setBidDateInput(""); setBidScopeInput(""); setBidNotesInput("");
      };
      const handleConfirmWin = () => {
        if (!closeReason) return;
        const leadId = showWinModal;
        const finalValue = finalContractValue ? parseFloat(finalContractValue) : (leads.find(l => l.id === leadId)?.estimatedValue || 0);
        setLeads(prev => prev.map(l => l.id !== leadId ? l : {
          ...l, stage: "awarded", closeReason, closeNotes, awardedDate: new Date().toISOString(), estimatedValue: finalValue,
          activities: [...(l.activities || []), { type: "stage_change", text: `Moved to Awarded — Reason: ${closeReason}${closeNotes ? `\nNotes: ${closeNotes}` : ""}\nFinal Contract Value: ${formatCurrency(finalValue)}`, by: user.name, at: new Date().toISOString() }]
        }));
        setShowWinModal(null); setCloseReason(""); setCloseNotes(""); setFinalContractValue("");
      };
      const handleConfirmLoss = () => {
        if (!closeReason) return;
        const leadId = showLossModal;
        setLeads(prev => prev.map(l => l.id !== leadId ? l : {
          ...l, stage: "closed_lost", closeReason, lostToCompetitor, closeNotes, closedDate: new Date().toISOString(),
          activities: [...(l.activities || []), { type: "stage_change", text: `Moved to Closed Lost — Reason: ${closeReason}${lostToCompetitor ? `\nLost to: ${lostToCompetitor}` : ""}${closeNotes ? `\nNotes: ${closeNotes}` : ""}`, by: user.name, at: new Date().toISOString() }]
        }));
        setShowLossModal(null); setCloseReason(""); setCloseNotes(""); setLostToCompetitor("");
      };
      const handleDrop = (stageId, e) => { e.preventDefault(); if (dragLead && dragLead.stage !== stageId) handleStageChange(dragLead.id, stageId); setDragLead(null); };
      const handleDelete = (id) => { if (confirm("Delete this lead?")) { setLeads(prev => prev.filter(l => l.id !== id)); setSelectedLead(null); } };

      const leadCardMouseDown = useRef(null);
      const LeadCard = ({ lead }) => {
        const propName = pr(lead.propertyId)?.name;
        return (
        <div draggable onDragStart={() => setDragLead(lead)}
          onClick={() => setSelectedLead(lead)}
          onMouseDown={e => { leadCardMouseDown.current = { x: e.clientX, y: e.clientY }; }}
          onMouseUp={e => { const d = leadCardMouseDown.current; if (d && Math.abs(e.clientX - d.x) < 5 && Math.abs(e.clientY - d.y) < 5) { setSelectedLead(lead); } leadCardMouseDown.current = null; }}
          style={{ padding: "12px 14px", background: C.white, borderRadius: 8, border: `1px solid ${C.gray200}`, cursor: "pointer", marginBottom: 8, transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.red + "60"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.gray200; }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 2 }}>{leadName(lead)}</div>
          {propName && <div style={{ fontSize: 11, color: C.gray600, marginBottom: 2 }}>🏠 {propName}</div>}
          <div style={{ fontSize: 11, color: C.gray500, marginBottom: 6 }}>{leadContact(lead)}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <MarketTag market={lead.market} />
              {lead.constructionType && <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: lead.constructionType === "New Construction" ? "#DBEAFE" : "#FEF3C7", color: lead.constructionType === "New Construction" ? "#2563EB" : "#D97706" }}>{lead.constructionType}</span>}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{formatCurrency(lead.estimatedValue || 0)}</span>
          </div>
          {lead.nextAction && <div style={{ marginTop: 6, fontSize: 10, color: C.blue, fontWeight: 600, padding: "2px 6px", background: C.blueBg, borderRadius: 4, display: "inline-block" }}>{lead.nextAction}</div>}
        </div>);
      };

      return (
        <div style={{ background: C.gray50, minHeight: "calc(100vh - 56px)" }}>
          <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, margin: 0 }}>Project Sales</h1>
                <p style={{ fontSize: 14, color: C.gray500, margin: "4px 0 0" }}>Jobs linked to your client database</p>
              </div>
              <button onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, color: C.white, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 12px ${C.red}30` }}>{I.plus} New Project</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              <StatCard label="Open Leads" value={openLeads} icon={I.user} accent={C.blue} />
              <StatCard label="Pipeline Value" value={formatCurrency(totalPipeline)} icon={I.dollar} accent={C.navy} />
              <StatCard label="Won" value={formatCurrency(wonValue)} icon={I.check} accent={C.green} />
              <StatCard label="Total Leads" value={leads.length} icon={I.layers} accent={C.gray500} />
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "0 0 240px" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.gray400 }}>{I.search}</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..." style={{ width: "100%", padding: "8px 10px 8px 34px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none", background: C.white }} />
              </div>
              <select value={marketFilter} onChange={e => setMarketFilter(e.target.value)} style={{ padding: "8px 28px 8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 12, color: C.navy, outline: "none", background: C.white, fontWeight: 500, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
                <option value="All">All Markets</option>{MARKETS.map(m => <option key={m} value={m}>{MARKET_LABELS[m]}</option>)}
              </select>
              <div style={{ marginLeft: "auto", display: "flex", gap: 2, background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: 2 }}>
                <button onClick={() => setViewMode("kanban")} style={{ padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, background: viewMode === "kanban" ? C.navy : "transparent", color: viewMode === "kanban" ? C.white : C.gray500, cursor: "pointer" }}>Board</button>
                <button onClick={() => setViewMode("list")} style={{ padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, background: viewMode === "list" ? C.navy : "transparent", color: viewMode === "list" ? C.white : C.gray500, cursor: "pointer" }}>List</button>
              </div>
            </div>
            {/* Kanban */}
            {viewMode === "kanban" ? (
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
                {SALES_STAGES.map(stage => { const sg = stageGroups[stage.id] || { items: [], total: 0 }; return (
                  <div key={stage.id} style={{ minWidth: 260, maxWidth: 280, flex: "0 0 260px" }} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(stage.id, e)}>
                    <div style={{ padding: "10px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: stage.color }} /><span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{stage.label}</span><span style={{ fontSize: 10, fontWeight: 600, color: C.gray400, background: C.gray100, padding: "1px 6px", borderRadius: 8 }}>{sg.items.length}</span></div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.gray400 }}>{formatCurrency(sg.total)}</span>
                    </div>
                    <div style={{ minHeight: 100, padding: 4, borderRadius: 8, background: C.gray100 + "80" }}>{sg.items.map(l => <LeadCard key={l.id} lead={l} />)}</div>
                  </div>
                ); })}
              </div>
            ) : (
              <div style={{ borderRadius: 10, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: C.gray50 }}>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Company</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Contact</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Stage</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Market</th>
                    <th style={{ padding: "10px 8px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Value</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Source</th>
                  </tr></thead>
                  <tbody>{filtered.map(l => { const stg = SALES_STAGES.find(s => s.id === l.stage); return (
                    <tr key={l.id} onClick={() => setSelectedLead(l)} style={{ cursor: "pointer", borderTop: `1px solid ${C.gray100}` }} onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "10px 12px" }}><div style={{ fontWeight: 700, color: C.navy }}>{leadName(l)}</div></td>
                      <td style={{ padding: "10px 8px", color: C.gray600 }}>{leadContact(l)}</td>
                      <td style={{ padding: "10px 8px" }}><span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: stg?.color + "20", color: stg?.color }}>{stg?.label}</span></td>
                      <td style={{ padding: "10px 8px" }}><MarketTag market={l.market} /></td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, color: C.navy }}>{formatCurrency(l.estimatedValue || 0)}</td>
                      <td style={{ padding: "10px 8px", fontSize: 11, color: C.gray500 }}>{l.source}</td>
                    </tr>
                  ); })}</tbody>
                </table>
                {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.gray400 }}>No leads found</div>}
              </div>
            )}
          </div>
          {showCreate && <CreateLeadModal entities={entities} onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
          {showBidDatePrompt && (() => {
            const promptLead = leads.find(l => l.id === showBidDatePrompt);
            const promptCo = promptLead ? co(promptLead.companyId) : null;
            const promptPr = promptLead ? pr(promptLead.propertyId) : null;
            return (
            <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }} onClick={() => { setShowBidDatePrompt(null); setBidDateInput(""); setBidScopeInput(""); setBidNotesInput(""); }}>
              <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 16, width: 520, maxHeight: "85vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}>
                <div style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${C.gray200}` }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: "0 0 4px" }}>Send to Estimating</h3>
                  <p style={{ fontSize: 13, color: C.gray500, margin: 0 }}>Provide bid details and scope info for the estimating team.</p>
                </div>
                {/* Job summary */}
                {promptLead && <div style={{ padding: "12px 28px", background: C.gray50, borderBottom: `1px solid ${C.gray200}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{promptLead.jobName || promptCo?.name || "—"}</div>
                  <div style={{ fontSize: 11, color: C.gray500 }}>{promptCo?.name && promptLead.jobName ? `🏢 ${promptCo.name} · ` : ""}{promptPr?.name || "—"}{promptPr?.address ? ` · ${promptPr.address}` : ""}</div>
                </div>}
                <div style={{ padding: "20px 28px 28px", display: "grid", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.navy, display: "block", marginBottom: 4 }}>Bid Due Date *</label>
                    <input type="date" value={bidDateInput} onChange={e => setBidDateInput(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 14, color: C.navy, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.navy, display: "block", marginBottom: 4 }}>Scope of Work</label>
                    <textarea value={bidScopeInput} onChange={e => setBidScopeInput(e.target.value)} placeholder="Describe the scope — e.g. Full tear-off and re-roof, 12 buildings, asphalt shingles, includes gutters..." rows={4} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.navy, display: "block", marginBottom: 4 }}>Additional Notes for Estimating</label>
                    <textarea value={bidNotesInput} onChange={e => setBidNotesInput(e.target.value)} placeholder="Special requirements, access issues, client preferences, competing bids, urgency level..." rows={3} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => { setShowBidDatePrompt(null); setBidDateInput(""); setBidScopeInput(""); setBidNotesInput(""); }} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    <button onClick={handleConfirmBidDate} disabled={!bidDateInput} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: bidDateInput ? `linear-gradient(135deg, #6366F1, #4F46E5)` : C.gray200, color: bidDateInput ? C.white : C.gray400, fontSize: 13, fontWeight: 600, cursor: bidDateInput ? "pointer" : "default" }}>Send to Estimating</button>
                  </div>
                </div>
              </div>
            </div>);
          })()}
          {showWinModal && (() => {
            const winLead = leads.find(l => l.id === showWinModal);
            const winCo = winLead ? co(winLead.companyId) : null;
            return (
            <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }} onClick={() => { setShowWinModal(null); setCloseReason(""); setCloseNotes(""); setFinalContractValue(""); }}>
              <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 16, width: 520, maxHeight: "85vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}>
                <div style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${C.gray200}` }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: C.green, margin: "0 0 4px" }}>🎉 Congratulations! Won</h3>
                  <p style={{ fontSize: 13, color: C.gray500, margin: 0 }}>Record the winning details for this project.</p>
                </div>
                {winLead && <div style={{ padding: "12px 28px", background: C.gray50, borderBottom: `1px solid ${C.gray200}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{winLead.jobName || winCo?.name || "—"}</div>
                </div>}
                <div style={{ padding: "20px 28px 28px", display: "grid", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.navy, display: "block", marginBottom: 4 }}>What was the deciding factor? *</label>
                    <select value={closeReason} onChange={e => setCloseReason(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 14, color: C.navy, outline: "none", boxSizing: "border-box", background: C.white, cursor: "pointer" }}>
                      <option value="">Select a reason</option>
                      <option value="Price">Price</option>
                      <option value="Relationship">Relationship</option>
                      <option value="Reputation">Reputation</option>
                      <option value="Speed">Speed</option>
                      <option value="Scope/Approach">Scope/Approach</option>
                      <option value="Referral">Referral</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.navy, display: "block", marginBottom: 4 }}>Final Contract Value</label>
                    <input type="number" value={finalContractValue} onChange={e => setFinalContractValue(e.target.value)} placeholder={winLead ? `${winLead.estimatedValue || 0}` : "Enter final contract value"} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 14, color: C.navy, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.navy, display: "block", marginBottom: 4 }}>Notes</label>
                    <textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} placeholder="Optional notes about the win..." rows={3} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => { setShowWinModal(null); setCloseReason(""); setCloseNotes(""); setFinalContractValue(""); }} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    <button onClick={handleConfirmWin} disabled={!closeReason} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: closeReason ? `linear-gradient(135deg, ${C.green}, #059669)` : C.gray200, color: closeReason ? C.white : C.gray400, fontSize: 13, fontWeight: 600, cursor: closeReason ? "pointer" : "default" }}>Record Win</button>
                  </div>
                </div>
              </div>
            </div>);
          })()}
          {showLossModal && (() => {
            const lossLead = leads.find(l => l.id === showLossModal);
            const lossCo = lossLead ? co(lossLead.companyId) : null;
            return (
            <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }} onClick={() => { setShowLossModal(null); setCloseReason(""); setCloseNotes(""); setLostToCompetitor(""); }}>
              <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 16, width: 520, maxHeight: "85vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}>
                <div style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${C.gray200}` }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: C.red, margin: "0 0 4px" }}>Closed Lost</h3>
                  <p style={{ fontSize: 13, color: C.gray500, margin: 0 }}>Document why we lost this opportunity.</p>
                </div>
                {lossLead && <div style={{ padding: "12px 28px", background: C.gray50, borderBottom: `1px solid ${C.gray200}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{lossLead.jobName || lossCo?.name || "—"}</div>
                </div>}
                <div style={{ padding: "20px 28px 28px", display: "grid", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.navy, display: "block", marginBottom: 4 }}>Why did we lose? *</label>
                    <select value={closeReason} onChange={e => setCloseReason(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 14, color: C.navy, outline: "none", boxSizing: "border-box", background: C.white, cursor: "pointer" }}>
                      <option value="">Select a reason</option>
                      <option value="Price Too High">Price Too High</option>
                      <option value="Lost to Competitor">Lost to Competitor</option>
                      <option value="Timing/Delayed">Timing/Delayed</option>
                      <option value="Went with Internal Team">Went with Internal Team</option>
                      <option value="Project Cancelled">Project Cancelled</option>
                      <option value="No Response/Ghosted">No Response/Ghosted</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {closeReason === "Lost to Competitor" && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: C.navy, display: "block", marginBottom: 4 }}>Competitor Name</label>
                      <input type="text" value={lostToCompetitor} onChange={e => setLostToCompetitor(e.target.value)} placeholder="Which competitor won this bid?" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 14, color: C.navy, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.navy, display: "block", marginBottom: 4 }}>Notes</label>
                    <textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} placeholder="Optional notes about the loss..." rows={3} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => { setShowLossModal(null); setCloseReason(""); setCloseNotes(""); setLostToCompetitor(""); }} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    <button onClick={handleConfirmLoss} disabled={!closeReason} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: closeReason ? `linear-gradient(135deg, ${C.red}, #DC2626)` : C.gray200, color: closeReason ? C.white : C.gray400, fontSize: 13, fontWeight: 600, cursor: closeReason ? "pointer" : "default" }}>Record Loss</button>
                  </div>
                </div>
              </div>
            </div>);
          })()}
          {selectedLead && <LeadDetailPanel lead={leads.find(l => l.id === selectedLead.id) || selectedLead} entities={entities} onClose={() => setSelectedLead(null)} onUpdate={handleUpdate} onStageChange={handleStageChange} onDelete={handleDelete} user={user} crmUsers={crmUsers || []} onMention={onMention} inspections={inspections || []} setInspections={setInspections} />}
        </div>
      );
    }

export default SalesModule;
