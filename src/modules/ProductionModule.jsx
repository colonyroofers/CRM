import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { C } from '../utils/constants';
import { StatusBadge, MarginBadge, MarketTag, ProgressBar, StatCard } from '../components/shared';
import { generateId, formatCurrency, fmt, MARKETS, MARKET_LABELS, MODULE_ICONS } from '../utils/constants';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { getFirestoreDb } from '../utils/firebase';
import DocumentList from '../components/DocumentList';
import DocumentUpload from '../components/DocumentUpload';
import ActivityTimeline from '../components/ActivityTimeline';

// Helper functions and components
const stripDocsForStorage = (docs) => docs;
const CreateProjectModal = ({ onClose, onCreate, supers }) => null;

    function SafetyTab({ project, onUpdateProject, user }) {
      const [showLogIncident, setShowLogIncident] = useState(false);
      const [incForm, setIncForm] = useState({ date: new Date().toISOString().split('T')[0], type: "near_miss", description: "", correctiveAction: "" });
      const incidents = project.safetyIncidents || [];
      const handleProjectUpdate = (updates) => onUpdateProject(updates);
      return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: "0 0 4px" }}>Safety Incidents</h3>
              <p style={{ fontSize: 13, color: C.gray500, margin: 0 }}>Track near misses, first aid, recordable and lost time incidents</p>
            </div>
            <button onClick={() => setShowLogIncident(!showLogIncident)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, color: C.white, border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{I.plus} Log Incident</button>
          </div>
          {showLogIncident && (
            <div style={{ background: C.gray50, border: `1px solid ${C.gray200}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Date</label>
                  <input style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12 }} type="date" value={incForm.date} onChange={e => setIncForm({...incForm, date: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Type</label>
                  <select style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12 }} value={incForm.type} onChange={e => setIncForm({...incForm, type: e.target.value})}>
                    <option value="near_miss">Near Miss</option>
                    <option value="first_aid">First Aid</option>
                    <option value="recordable">Recordable</option>
                    <option value="lost_time">Lost Time</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Description</label>
                <textarea style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, fontFamily: "inherit", minHeight: 60 }} value={incForm.description} onChange={e => setIncForm({...incForm, description: e.target.value})} placeholder="What happened..." />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Corrective Action</label>
                <textarea style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, fontFamily: "inherit", minHeight: 60 }} value={incForm.correctiveAction} onChange={e => setIncForm({...incForm, correctiveAction: e.target.value})} placeholder="Steps to prevent recurrence..." />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setShowLogIncident(false)} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={() => {
                  if (incForm.description?.trim()) {
                    handleProjectUpdate({ safetyIncidents: [...incidents, { ...incForm, id: generateId(), reportedBy: user.name, resolved: false, createdAt: new Date().toISOString() }] });
                    setIncForm({ date: new Date().toISOString().split('T')[0], type: "near_miss", description: "", correctiveAction: "" });
                    setShowLogIncident(false);
                  }
                }} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: incForm.description?.trim() ? `linear-gradient(135deg, ${C.red}, ${C.redDark})` : C.gray300, color: C.white, fontSize: 12, fontWeight: 600, cursor: incForm.description?.trim() ? "pointer" : "default", opacity: incForm.description?.trim() ? 1 : 0.6 }}>Log Incident</button>
              </div>
            </div>
          )}
          {incidents.length > 0 ? (
            <div style={{ borderRadius: 10, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
              {incidents.slice().reverse().map((inc) => {
                const typeColors = { near_miss: C.yellow, first_aid: "#F97316", recordable: C.red, lost_time: "#991B1B" };
                return (
                  <div key={inc.id} style={{ padding: 16, borderBottom: `1px solid ${C.gray100}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 10, flex: 1 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, background: typeColors[inc.type] + "20", color: typeColors[inc.type], padding: "3px 8px", borderRadius: 4, textTransform: "uppercase", whiteSpace: "nowrap" }}>{inc.type.replace('_', ' ')}</span>
                        <span style={{ fontSize: 12, color: C.gray500 }}>{new Date(inc.date).toLocaleDateString()}</span>
                      </div>
                      <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="checkbox" checked={inc.resolved || false} onChange={e => handleProjectUpdate({ safetyIncidents: incidents.map(x => x.id === inc.id ? {...x, resolved: e.target.checked} : x) })} style={{ cursor: "pointer" }} />
                        <span style={{ fontSize: 11, color: C.gray500 }}>Resolved</span>
                      </label>
                    </div>
                    <p style={{ fontSize: 12, color: C.navy, margin: "0 0 6px", fontWeight: 500 }}>{inc.description}</p>
                    {inc.correctiveAction && <p style={{ fontSize: 11, color: C.gray600, margin: 0 }}>Action: {inc.correctiveAction}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: "40px 20px", textAlign: "center", background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}` }}>
              <p style={{ fontSize: 13, color: C.gray500, fontWeight: 500, margin: 0 }}>No incidents recorded</p>
              <p style={{ fontSize: 11, color: C.gray400, margin: "4px 0 0" }}>This project has maintained a safe workplace</p>
            </div>
          )}
        </div>
      );
    }

    function ChangeOrderTab({ project, onUpdateProject, user }) {
      const [contractFile, setContractFile] = useState(null);
      const [contractText, setContractText] = useState(project?.contractTemplate || "");
      const [uploading, setUploading] = useState(false);
      const [parsing, setParsing] = useState(false);
      const [contractFormat, setContractFormat] = useState(project?.changeOrderFormat || null);
      const fileRef = useRef(null);
      const role = user?.role || "admin";

      const handleContractUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setContractFile(file);
        setUploading(true);
        setParsing(true);
        try {
          // Upload contract to Firebase Storage
          let downloadURL = "";
          if (firebaseStorage) {
            const storageRef = firebaseStorage.ref(`contracts/${project.id}/${file.name}`);
            const snap = await storageRef.put(file);
            downloadURL = await snap.ref.getDownloadURL();
          }
          // Extract text from PDF or doc
          let extractedText = "";
          if (file.type === "application/pdf" && window.pdfjsLib) {
            const arrayBuf = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
            for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              extractedText += content.items.map(item => item.str).join(" ") + "\n";
            }
          } else {
            extractedText = await file.text();
          }
          // Parse change order format from contract
          const coSections = extractContractCOFormat(extractedText);
          setContractText(extractedText);
          setContractFormat(coSections);
          // Save to project
          onUpdateProject(project.id, {
            contractTemplate: extractedText,
            contractFileURL: downloadURL,
            contractFileName: file.name,
            changeOrderFormat: coSections
          });
        } catch (err) {
          console.error("Contract upload error:", err);
          alert("Error processing contract: " + err.message);
        } finally {
          setUploading(false);
          setParsing(false);
        }
      };

      // Simple parser to extract change order requirements from contract text
      function extractContractCOFormat(text) {
        const lower = text.toLowerCase();
        const format = {
          detected: true,
          requiresWrittenNotice: lower.includes("written notice") || lower.includes("written request"),
          requiresOwnerApproval: lower.includes("owner approval") || lower.includes("owner's approval") || lower.includes("approved by owner"),
          noticePeriodDays: null,
          requiredFields: ["description", "reason", "amount"],
          pricing_method: null,
          formatNotes: []
        };
        // Detect notice period
        const noticeMatch = text.match(/(\d+)\s*(?:calendar\s*)?days?\s*(?:prior|advance|written)\s*notice/i);
        if (noticeMatch) { format.noticePeriodDays = parseInt(noticeMatch[1]); format.formatNotes.push(`Requires ${noticeMatch[1]}-day advance notice`); }
        // Detect pricing method
        if (lower.includes("time and materials") || lower.includes("t&m")) { format.pricing_method = "time_and_materials"; format.requiredFields.push("laborHours", "materialCost"); format.formatNotes.push("Pricing: Time & Materials"); }
        if (lower.includes("unit price") || lower.includes("per square")) { format.pricing_method = "unit_price"; format.requiredFields.push("unitQuantity", "unitPrice"); format.formatNotes.push("Pricing: Unit Price"); }
        if (lower.includes("lump sum")) { format.pricing_method = "lump_sum"; format.formatNotes.push("Pricing: Lump Sum"); }
        // Detect required documentation
        if (lower.includes("photo") || lower.includes("photograph")) { format.requiredFields.push("photos"); format.formatNotes.push("Photos required"); }
        if (lower.includes("scope of work") || lower.includes("detailed scope")) { format.requiredFields.push("scopeOfWork"); format.formatNotes.push("Detailed scope of work required"); }
        if (lower.includes("schedule impact") || lower.includes("time extension")) { format.requiredFields.push("scheduleImpact"); format.formatNotes.push("Schedule impact assessment required"); }
        if (lower.includes("architect") || lower.includes("engineer")) {
          if (lower.includes("architect approval") || lower.includes("engineer approval")) { format.requiresArchitectApproval = true; format.formatNotes.push("Requires architect/engineer approval"); }
        }
        if (lower.includes("aia g701") || lower.includes("g701")) { format.formatNotes.push("AIA G701 format required"); format.aiaFormat = true; }
        if (lower.includes("aia g702") || lower.includes("g702")) { format.formatNotes.push("AIA G702 continuation sheet"); }
        if (format.formatNotes.length === 0) { format.formatNotes.push("Standard change order format (no specific contract requirements detected)"); }
        return format;
      }

      return React.createElement("div", null,
        // Contract Upload Section
        React.createElement("div", { style: { marginBottom: 24, padding: 20, borderRadius: 10, border: "2px dashed " + (contractFormat ? C.green + "60" : C.gray300), background: contractFormat ? C.greenBg : C.gray50 } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 } },
            React.createElement("div", null,
              React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 4px" } }, "📄 Contract Template"),
              React.createElement("p", { style: { fontSize: 12, color: C.gray500, margin: 0 } },
                contractFormat ? "Contract uploaded — change order format detected" : "Upload the project contract to auto-enforce change order format"
              )
            ),
            React.createElement("button", {
              onClick: () => fileRef.current?.click(),
              style: { padding: "8px 16px", borderRadius: 6, border: "none", background: contractFormat ? C.gray200 : C.navy, color: contractFormat ? C.navy : C.white, fontSize: 12, fontWeight: 600, cursor: "pointer" }
            }, uploading ? "Processing..." : (contractFormat ? "Replace Contract" : "Upload Contract"))
          ),
          React.createElement("input", { ref: fileRef, type: "file", accept: ".pdf,.doc,.docx,.txt", style: { display: "none" }, onChange: handleContractUpload }),
          project?.contractFileName && React.createElement("div", { style: { fontSize: 11, color: C.gray500, marginBottom: 8 } }, "📎 " + project.contractFileName),
          // Show detected format requirements
          contractFormat && contractFormat.formatNotes?.length > 0 && React.createElement("div", { style: { marginTop: 8, padding: 12, borderRadius: 8, background: C.white, border: "1px solid " + C.gray200 } },
            React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 6 } }, "Detected Change Order Requirements:"),
            contractFormat.formatNotes.map((note, i) =>
              React.createElement("div", { key: i, style: { fontSize: 11, color: C.gray600, padding: "2px 0", display: "flex", alignItems: "center", gap: 6 } },
                React.createElement("span", { style: { color: C.green } }, "✓"), note
              )
            ),
            contractFormat.requiredFields && React.createElement("div", { style: { marginTop: 8, fontSize: 11, color: C.gray500 } },
              "Required fields: " + contractFormat.requiredFields.join(", ")
            )
          )
        ),
        // Render existing ChangeOrderPanel with format enforcement
        React.createElement(ChangeOrderPanel, { project, onUpdateProject: (updatedProject) => {
          // ChangeOrderPanel passes full project object; extract just the changed fields
          const { id, ...updates } = updatedProject;
          onUpdateProject(project.id, updates);
        }, user, role, contractFormat })
      );
    }

    // ============================================================
    // CHANGE ORDER TRACKING COMPONENT
    // ============================================================


    function ChangeOrderPanel({ project, onUpdateProject, user, role, contractFormat }) {
      const [showForm, setShowForm] = useState(false);
      const defaultFormData = { description: "", reason: "scope_change", amount: 0, costImpact: 0, notes: "", scopeOfWork: "", scheduleImpact: "", laborHours: 0, materialCost: 0, unitQuantity: 0, unitPrice: 0, photos: [] };
      const [formData, setFormData] = useState(defaultFormData);
      const changeOrders = project?.changeOrders || [];
      const approvedTotal = changeOrders.filter(co => co.status === "approved").reduce((s, co) => s + (co.amount || 0), 0);
      const pendingCount = changeOrders.filter(co => co.status === "pending_approval").length;

      // Validate required fields from contract format
      const validateContractFormat = () => {
        if (!contractFormat?.requiredFields) return true;
        const rf = contractFormat.requiredFields;
        if (rf.includes("scopeOfWork") && !formData.scopeOfWork.trim()) { alert("Contract requires a detailed Scope of Work."); return false; }
        if (rf.includes("scheduleImpact") && !formData.scheduleImpact.trim()) { alert("Contract requires a Schedule Impact assessment."); return false; }
        if (rf.includes("laborHours") && contractFormat.pricing_method === "time_and_materials" && !formData.laborHours) { alert("Contract requires labor hours (T&M pricing)."); return false; }
        return true;
      };

      const handleCreate = () => {
        if (!validateContractFormat()) return;
        const co = {
          id: generateId(), number: "CO-" + String(changeOrders.length + 1).padStart(3, "0"), ...formData,
          status: contractFormat?.requiresOwnerApproval ? "pending_owner_approval" : "pending_approval",
          requestedBy: user.name, requestDate: new Date().toISOString(), approvedBy: null, approvalDate: null,
          pricingMethod: contractFormat?.pricing_method || "lump_sum",
          contractFormatApplied: !!contractFormat
        };
        onUpdateProject({ ...project, changeOrders: [...changeOrders, co] });
        setShowForm(false);
        setFormData(defaultFormData);
      };

      const handleApprove = (coId) => {
        const updated = changeOrders.map(co => co.id === coId ? { ...co, status: "approved", approvedBy: user.name, approvalDate: new Date().toISOString() } : co);
        const newApprovedTotal = updated.filter(co => co.status === "approved").reduce((s, co) => s + (co.amount || 0), 0);
        const origContract = project.originalContractValue || project.contractValue || 0;
        onUpdateProject({ ...project, changeOrders: updated, originalContractValue: origContract, contractValue: origContract + newApprovedTotal });
      };

      const reasons = { scope_change: "Scope Change", client_request: "Client Request", unforeseen_conditions: "Unforeseen Conditions", material_change: "Material Change", weather_damage: "Weather Damage", code_requirement: "Code Requirement", other: "Other" };
      const statusColors = { draft: C.gray400, pending_approval: C.yellow, approved: C.green, rejected: C.red };

      return React.createElement("div", null,
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 } },
          React.createElement("div", { style: { padding: 12, borderRadius: 8, background: C.gray50, textAlign: "center" } },
            React.createElement("div", { style: { fontSize: 20, fontWeight: 700, color: C.navy } }, changeOrders.length),
            React.createElement("div", { style: { fontSize: 10, color: C.gray500 } }, "Total COs")
          ),
          React.createElement("div", { style: { padding: 12, borderRadius: 8, background: approvedTotal >= 0 ? C.greenBg : C.redBg, textAlign: "center" } },
            React.createElement("div", { style: { fontSize: 20, fontWeight: 700, color: approvedTotal >= 0 ? C.green : C.red } }, formatCurrency(approvedTotal)),
            React.createElement("div", { style: { fontSize: 10, color: C.gray500 } }, "Net Impact")
          ),
          React.createElement("div", { style: { padding: 12, borderRadius: 8, background: C.yellowBg, textAlign: "center" } },
            React.createElement("div", { style: { fontSize: 20, fontWeight: 700, color: C.yellow } }, pendingCount),
            React.createElement("div", { style: { fontSize: 10, color: C.gray500 } }, "Pending Approval")
          )
        ),
        React.createElement("button", { onClick: () => setShowForm(true), style: { padding: "8px 16px", borderRadius: 6, border: "none", background: C.navy, color: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 16 } }, "+ New Change Order"),
        changeOrders.length ? changeOrders.map(co =>
          React.createElement("div", { key: co.id, style: { padding: "12px 16px", borderRadius: 8, border: "1px solid " + C.gray200, background: C.white, marginBottom: 8 } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
              React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: C.navy } }, co.number + ": " + co.description),
              React.createElement("span", { style: { padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: (statusColors[co.status] || C.gray400) + "20", color: statusColors[co.status] || C.gray400 } }, co.status?.replace("_", " "))
            ),
            React.createElement("div", { style: { fontSize: 11, color: C.gray500, marginBottom: 4 } }, "Reason: " + (reasons[co.reason] || co.reason) + " · Amount: " + formatCurrency(co.amount || 0) + " · Requested by " + co.requestedBy),
            co.status === "pending_approval" && (role === "admin" || role === "coordinator") ?
              React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 8 } },
                React.createElement("button", { onClick: () => handleApprove(co.id), style: { padding: "4px 12px", borderRadius: 4, border: "none", background: C.green, color: C.white, fontSize: 11, fontWeight: 600, cursor: "pointer" } }, "✓ Approve"),
                React.createElement("button", { onClick: () => { const updated = changeOrders.map(c => c.id === co.id ? { ...c, status: "rejected" } : c); onUpdateProject({ ...project, changeOrders: updated }); }, style: { padding: "4px 12px", borderRadius: 4, border: "none", background: C.red, color: C.white, fontSize: 11, fontWeight: 600, cursor: "pointer" } }, "✕ Reject")
              ) : null
          )
        ) : React.createElement("div", { style: { padding: 16, textAlign: "center", color: C.gray400, fontSize: 12 } }, "No change orders yet"),
        showForm ? React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }, onClick: () => setShowForm(false) },
          React.createElement("div", { style: { width: 480, background: C.white, borderRadius: 12, padding: 24 }, onClick: e => e.stopPropagation() },
            React.createElement("h3", { style: { fontSize: 16, fontWeight: 700, color: C.navy, margin: "0 0 16px" } }, "New Change Order"),
            React.createElement("div", { style: { display: "grid", gap: 12 } },
              React.createElement("div", null,
                React.createElement("label", { style: { fontSize: 11, fontWeight: 600, color: C.gray600, display: "block", marginBottom: 4 } }, "Description"),
                React.createElement("textarea", { value: formData.description, onChange: e => setFormData({...formData, description: e.target.value}), style: { width: "100%", padding: 8, borderRadius: 6, border: "1px solid " + C.gray300, fontSize: 12, minHeight: 60 } })
              ),
              React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
                React.createElement("div", null,
                  React.createElement("label", { style: { fontSize: 11, fontWeight: 600, color: C.gray600, display: "block", marginBottom: 4 } }, "Reason"),
                  React.createElement("select", { value: formData.reason, onChange: e => setFormData({...formData, reason: e.target.value}), style: { width: "100%", padding: 8, borderRadius: 6, border: "1px solid " + C.gray300, fontSize: 12 } },
                    Object.entries(reasons).map(([k, v]) => React.createElement("option", { key: k, value: k }, v))
                  )
                ),
                React.createElement("div", null,
                  React.createElement("label", { style: { fontSize: 11, fontWeight: 600, color: C.gray600, display: "block", marginBottom: 4 } }, "Amount ($)"),
                  React.createElement("input", { type: "number", value: formData.amount, onChange: e => setFormData({...formData, amount: parseFloat(e.target.value) || 0}), style: { width: "100%", padding: 8, borderRadius: 6, border: "1px solid " + C.gray300, fontSize: 12 } })
                )
              ),
              React.createElement("div", null,
                React.createElement("label", { style: { fontSize: 11, fontWeight: 600, color: C.gray600, display: "block", marginBottom: 4 } }, "Notes"),
                React.createElement("textarea", { value: formData.notes, onChange: e => setFormData({...formData, notes: e.target.value}), style: { width: "100%", padding: 8, borderRadius: 6, border: "1px solid " + C.gray300, fontSize: 12, minHeight: 40 } })
              ),
              // Contract-required extra fields
              contractFormat?.requiredFields?.includes("scopeOfWork") ? React.createElement("div", null,
                React.createElement("label", { style: { fontSize: 11, fontWeight: 600, color: C.red, display: "block", marginBottom: 4 } }, "Scope of Work (Required by Contract)"),
                React.createElement("textarea", { value: formData.scopeOfWork, onChange: e => setFormData({...formData, scopeOfWork: e.target.value}), placeholder: "Detailed description of work to be performed...", style: { width: "100%", padding: 8, borderRadius: 6, border: "1px solid " + C.red + "40", fontSize: 12, minHeight: 60 } })
              ) : null,
              contractFormat?.requiredFields?.includes("scheduleImpact") ? React.createElement("div", null,
                React.createElement("label", { style: { fontSize: 11, fontWeight: 600, color: C.red, display: "block", marginBottom: 4 } }, "Schedule Impact (Required by Contract)"),
                React.createElement("textarea", { value: formData.scheduleImpact, onChange: e => setFormData({...formData, scheduleImpact: e.target.value}), placeholder: "Impact on project timeline, any time extensions needed...", style: { width: "100%", padding: 8, borderRadius: 6, border: "1px solid " + C.red + "40", fontSize: 12, minHeight: 40 } })
              ) : null,
              contractFormat?.pricing_method === "time_and_materials" ? React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
                React.createElement("div", null,
                  React.createElement("label", { style: { fontSize: 11, fontWeight: 600, color: C.red, display: "block", marginBottom: 4 } }, "Labor Hours (T&M)"),
                  React.createElement("input", { type: "number", value: formData.laborHours, onChange: e => setFormData({...formData, laborHours: parseFloat(e.target.value) || 0}), style: { width: "100%", padding: 8, borderRadius: 6, border: "1px solid " + C.red + "40", fontSize: 12 } })
                ),
                React.createElement("div", null,
                  React.createElement("label", { style: { fontSize: 11, fontWeight: 600, color: C.red, display: "block", marginBottom: 4 } }, "Material Cost (T&M)"),
                  React.createElement("input", { type: "number", value: formData.materialCost, onChange: e => setFormData({...formData, materialCost: parseFloat(e.target.value) || 0}), style: { width: "100%", padding: 8, borderRadius: 6, border: "1px solid " + C.red + "40", fontSize: 12 } })
                )
              ) : null,
              contractFormat?.pricing_method === "unit_price" ? React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
                React.createElement("div", null,
                  React.createElement("label", { style: { fontSize: 11, fontWeight: 600, color: C.red, display: "block", marginBottom: 4 } }, "Unit Quantity"),
                  React.createElement("input", { type: "number", value: formData.unitQuantity, onChange: e => setFormData({...formData, unitQuantity: parseFloat(e.target.value) || 0}), style: { width: "100%", padding: 8, borderRadius: 6, border: "1px solid " + C.red + "40", fontSize: 12 } })
                ),
                React.createElement("div", null,
                  React.createElement("label", { style: { fontSize: 11, fontWeight: 600, color: C.red, display: "block", marginBottom: 4 } }, "Unit Price ($)"),
                  React.createElement("input", { type: "number", value: formData.unitPrice, onChange: e => setFormData({...formData, unitPrice: parseFloat(e.target.value) || 0}), style: { width: "100%", padding: 8, borderRadius: 6, border: "1px solid " + C.red + "40", fontSize: 12 } })
                )
              ) : null,
              // Contract format reminder
              contractFormat ? React.createElement("div", { style: { padding: 10, borderRadius: 6, background: C.yellowBg, border: "1px solid " + C.yellow + "40", fontSize: 11, color: C.gray600 } },
                "📋 This change order will follow the format specified in the uploaded contract" + (contractFormat.aiaFormat ? " (AIA G701)" : "") + "."
              ) : null,
              React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" } },
                React.createElement("button", { onClick: () => setShowForm(false), style: { padding: "8px 16px", borderRadius: 6, border: "1px solid " + C.gray300, background: C.white, fontSize: 12, cursor: "pointer" } }, "Cancel"),
                React.createElement("button", { onClick: handleCreate, style: { padding: "8px 16px", borderRadius: 6, border: "none", background: C.navy, color: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "Create Change Order")
              )
            )
          )
        ) : null
      );
    }

    // ============================================================
    // MODULE: PRODUCTION — Full Components
    // ============================================================

    // --- Production Constants ---
    const USERS = [
      { id: "u1", name: "Zach", email: "zach@colonyroofers.com", role: "admin", initials: "ZC" },
      { id: "u2", name: "Brayleigh Gardner", email: "brayleigh@colonyroofers.com", role: "coordinator", initials: "BG" },
      { id: "u3", name: "Lucio Martinez", email: "lucio@colonyroofers.com", role: "superintendent", initials: "LM" },
      { id: "u4", name: "Derrick Newsome", email: "derrick@colonyroofers.com", role: "superintendent", initials: "DN" },
    ];
    const STATUSES = ["Pre-Construction", "In Progress", "Delayed", "Complete"];
    const ROOF_TYPES = ["TPO", "Asphalt Shingles", "Single-Ply Membrane", "Modified Bitumen", "Built-Up Roofing"];

    // Vendor Catalog
    const VENDOR_CATALOG = {
      materials: [
        { name: "ABC Supply", type: "Distributor", notes: "Primary shingle & accessories" },
        { name: "Beacon Roofing Supply", type: "Distributor", notes: "Full line distributor" },
        { name: "SRS Distribution", type: "Distributor", notes: "Commercial & residential" },
        { name: "GAF", type: "Manufacturer", notes: "President's Club — Shingles" },
        { name: "Carlisle", type: "Manufacturer", notes: "TPO & single-ply membranes" },
        { name: "Johns Manville", type: "Manufacturer", notes: "TPO & insulation" },
        { name: "Elevate (Firestone)", type: "Manufacturer", notes: "Low slope systems" },
        { name: "CertainTeed", type: "Manufacturer", notes: "Shingles" },
        { name: "Owens Corning", type: "Manufacturer", notes: "Shingles & insulation" },
        { name: "Other", type: "Other", notes: "" },
      ],
      labor: [
        { name: "TBD — From Approved List", type: "Subcontractor" },
        { name: "Other — Pending Approval", type: "Subcontractor" },
      ],
      equipment: [
        { name: "Sunbelt Rentals", type: "Equipment Rental" },
        { name: "United Rentals", type: "Equipment Rental" },
        { name: "Other", type: "Other" },
      ],
    };

    const INITIAL_PROJECTS = [
      {
        id: "p1", name: "Preserve at Tampa Palms — Re-Roof", client: "Preserve at Tampa Palms HOA",
        market: "TPA", status: "In Progress", roofType: "TPO", sqft: 48500,
        contractValue: 285000, estimatedCost: 199500, estimatedMargin: 30,
        currentCost: 112000, currentMargin: 60.7, assignedSuper: "u3",
        address: "15800 Tampa Palms Blvd, Tampa, FL 33647",
        startDate: "2026-03-01", estCompletion: "2026-04-15", progress: 42,
        buildings: 19, createdAt: "2026-02-15", documents: {}
      },
      {
        id: "p2", name: "Brookhaven Towers — Flat Roof Replacement", client: "Brookhaven Capital Partners",
        market: "ATL", status: "Pre-Construction", roofType: "Single-Ply Membrane", sqft: 32000,
        contractValue: 195000, estimatedCost: 140400, estimatedMargin: 28,
        currentCost: 0, currentMargin: 28, assignedSuper: "u4",
        address: "3400 Peachtree Rd NE, Atlanta, GA 30326",
        startDate: "2026-04-01", estCompletion: "2026-05-10", progress: 0,
        buildings: 1, createdAt: "2026-03-05", documents: {}
      },
      {
        id: "p3", name: "Legacy Hills Apartments — Full Re-Roof", client: "Greystar Property Mgmt",
        market: "DFW", status: "In Progress", roofType: "Asphalt Shingles", sqft: 67200,
        contractValue: 412000, estimatedCost: 288400, estimatedMargin: 30,
        currentCost: 195000, currentMargin: 52.7, assignedSuper: "u3",
        address: "2100 Legacy Dr, Plano, TX 75024",
        startDate: "2026-02-10", estCompletion: "2026-04-20", progress: 68,
        buildings: 24, createdAt: "2026-01-28", documents: {}
      },
      {
        id: "p4", name: "Midtown 400 — Leak Remediation & Overlay", client: "Cousins Properties",
        market: "ATL", status: "Delayed", roofType: "Modified Bitumen", sqft: 18500,
        contractValue: 89000, estimatedCost: 64080, estimatedMargin: 28,
        currentCost: 58200, currentMargin: 34.6, assignedSuper: "u4",
        address: "400 17th St NW, Atlanta, GA 30363",
        startDate: "2026-02-20", estCompletion: "2026-03-25", progress: 75,
        buildings: 1, createdAt: "2026-02-10", documents: {}
      },
      {
        id: "p5", name: "Channelside Commons — Roof Replacement", client: "ZRS Management",
        market: "TPA", status: "Complete", roofType: "TPO", sqft: 54000,
        contractValue: 340000, estimatedCost: 238000, estimatedMargin: 30,
        currentCost: 231000, currentMargin: 32.1, assignedSuper: "u3",
        address: "801 Channelside Dr, Tampa, FL 33602",
        startDate: "2026-01-05", estCompletion: "2026-02-28", progress: 100,
        buildings: 12, createdAt: "2025-12-20", documents: {}
      },
    ];

    // --- Production Utilities ---
    // --- Utilities ---
    const getMarginHealth = (estimated, current) => {
      const drop = estimated - current;
      if (drop >= 10) return "critical";
      if (drop >= 5) return "warning";
      return "healthy";
    };
    // formatCurrency already defined in shared section
    const formatDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    // --- Icons ---
    // --- Icons ---
    const Ic = ({ d, size = 20 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{typeof d === "string" ? <path d={d} /> : d}</svg>
    );
    const I = {
      plus: <Ic d="M12 5v14M5 12h14" />,
      search: <Ic d={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>} />,
      building: <Ic d={<><path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18"/><path d="M6 12H4a2 2 0 00-2 2v6a2 2 0 002 2h2"/><path d="M18 9h2a2 2 0 012 2v9a2 2 0 01-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></>} />,
      calendar: <Ic d={<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>} />,
      dollar: <Ic d={<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>} />,
      alert: <Ic d={<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>} />,
      check: <Ic d={<><polyline points="20 6 9 17 4 12"/></>} />,
      clock: <Ic d={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />,
      logout: <Ic d={<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>} />,
      x: <Ic d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />,
      layers: <Ic d={<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>} />,
      barChart: <Ic d={<><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></>} />,
      upload: <Ic d={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>} />,
      file: <Ic d={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>} />,
      fileText: <Ic d={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>} />,
      zap: <Ic d={<><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>} />,
      trash: <Ic d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></>} />,
      user: <Ic d={<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>} />,
    };

    function DocumentsTab({ project, onUpdateProject }) {
      const [docs, setDocs] = useState(() => {
        const d = project.documents || {};
        return { budget: d.budget || null, contract: Array.isArray(d.contract) ? d.contract : d.contract ? [d.contract] : [], planSet: Array.isArray(d.planSet) ? d.planSet : d.planSet ? [d.planSet] : [] };
      });
      const [extractionData, setExtractionData] = useState(null);
      const [processing, setProcessing] = useState(false);
      const [error, setError] = useState(null);

      const handleUpload = (type, file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newDoc = { name: file.name, size: file.size, type: file.type, status: "uploaded", data: e.target.result, uploadedAt: new Date().toISOString() };
          if (MULTI_FILE_TYPES.includes(type)) {
            setDocs(prev => ({ ...prev, [type]: [...(prev[type] || []), newDoc] }));
          } else {
            setDocs(prev => ({ ...prev, [type]: newDoc }));
          }
          setExtractionData(null);
        };
        reader.readAsDataURL(file);
      };

      const handleRemove = (type, idx) => {
        if (MULTI_FILE_TYPES.includes(type)) {
          setDocs(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== idx) }));
        } else {
          setDocs(prev => ({ ...prev, [type]: null }));
        }
        setExtractionData(null);
      };

      const allDocs = () => {
        const list = [];
        if (docs.budget) list.push({ type: "budget", doc: docs.budget });
        (docs.contract || []).forEach(d => list.push({ type: "contract", doc: d }));
        (docs.planSet || []).forEach(d => list.push({ type: "planSet", doc: d }));
        return list;
      };
      const uploadedCount = allDocs().length;
      const canProcess = uploadedCount >= 1;

      // Extract text from PDF using pdf.js
      const extractPdfText = async (base64Data) => {
        try {
          const binaryStr = atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
          let fullText = "";
          for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const tc = await page.getTextContent();
            fullText += "=== Page " + p + " ===\n" + tc.items.map(i => i.str).join(" ") + "\n\n";
          }
          if (fullText.length > 60000) fullText = fullText.substring(0, 60000) + "\n...[truncated]";
          return fullText;
        } catch (e) { return "[Could not extract PDF text: " + e.message + "]"; }
      };

      const docToContentParts = async (label, doc) => {
        const parts = [];
        const base64Data = doc.data.split(",")[1];
        const mediaType = doc.type || "application/pdf";
        const isExcel = mediaType.includes("spreadsheet") || mediaType.includes("excel") || doc.name.match(/\.(xlsx|xls|csv)$/i);
        if (isExcel) {
          try {
            const binaryStr = atob(base64Data);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
            const workbook = XLSX.read(bytes, { type: "array" });
            let csvText = "";
            workbook.SheetNames.forEach(sheetName => { csvText += "=== Sheet: " + sheetName + " ===\n" + XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]) + "\n\n"; });
            if (csvText.length > 30000) csvText = csvText.substring(0, 30000) + "\n...[truncated]";
            parts.push({ type: "text", text: "[" + label + ": \"" + doc.name + "\" \u2014 Spreadsheet]\n\n" + csvText });
          } catch (xlsErr) { parts.push({ type: "text", text: "[" + label + ": \"" + doc.name + "\" \u2014 Could not parse]" }); }
        } else if (mediaType.startsWith("image/")) {
          parts.push({ type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } });
          parts.push({ type: "text", text: "[Image: " + label + " \"" + doc.name + "\"]" });
        } else if (mediaType === "application/pdf") {
          // PDFs > 2MB: extract text client-side to avoid Netlify payload limits
          if (doc.size > 2000000) {
            const pdfText = await extractPdfText(base64Data);
            parts.push({ type: "text", text: "[" + label + ": \"" + doc.name + "\" \u2014 PDF text extracted]\n\n" + pdfText });
          } else {
            parts.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } });
            parts.push({ type: "text", text: "[PDF: " + label + " \"" + doc.name + "\"]" });
          }
        } else {
          parts.push({ type: "text", text: "[" + label + ": \"" + doc.name + "\" \u2014 unsupported format]" });
        }
        return parts;
      };

      const setAllDocsStatus = (status) => {
        setDocs(prev => ({
          budget: prev.budget ? { ...prev.budget, status } : null,
          contract: (prev.contract || []).map(d => ({ ...d, status })),
          planSet: (prev.planSet || []).map(d => ({ ...d, status })),
        }));
      };

      // Batch documents by size (~2MB per batch to stay under Netlify limits)
      const buildBatches = () => {
        const MAX_BATCH_BYTES = 2 * 1024 * 1024;
        const all = allDocs();
        const batches = [];
        let currentBatch = [];
        let currentSize = 0;
        for (const item of all) {
          const docSize = item.doc.size || 0;
          // Large PDFs get text-extracted so they're much smaller — treat as 50KB
          const effectiveSize = (item.doc.type === "application/pdf" && docSize > 2000000) ? 50000 : docSize;
          if (currentBatch.length > 0 && currentSize + effectiveSize > MAX_BATCH_BYTES) {
            batches.push(currentBatch);
            currentBatch = [];
            currentSize = 0;
          }
          currentBatch.push(item);
          currentSize += effectiveSize;
        }
        if (currentBatch.length > 0) batches.push(currentBatch);
        return batches;
      };

      const EXTRACT_PROMPT = "You are an AI assistant for Colony Roofers, a GAF President's Club roofing contractor. Analyze the uploaded documents and extract relevant data.\n\nReturn ONLY valid JSON (no markdown fences):\n{\"contract\":{\"value\":null,\"scopeSummary\":\"\",\"startDate\":null,\"duration\":null},\"budget\":{\"totalCost\":null,\"materialCost\":null,\"laborCost\":null,\"otherCost\":null,\"estimatedMargin\":null,\"lineItems\":[]},\"specs\":{\"roofType\":null,\"sqft\":null,\"buildingCount\":null,\"primaryMaterial\":null,\"system\":null}}\n\nExtract what you can. Use null for unknown. Calculate estimatedMargin as ((contractValue - totalCost) / contractValue * 100) if both available.";

      const processBatch = async (batch) => {
        const contentParts = [];
        for (const { type, doc } of batch) {
          const parts = await docToContentParts(DOC_TYPES[type]?.label || type, doc);
          contentParts.push(...parts);
        }
        contentParts.push({ type: "text", text: EXTRACT_PROMPT });
        const response = await fetch("/api/ai", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, messages: [{ role: "user", content: contentParts }] }),
        });
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.error?.message || "API error " + response.status);
        }
        const result = await response.json();
        const text = result.content?.find(c => c.type === "text")?.text || "";
        try { return JSON.parse(text.replace(/```json|```/g, "").trim()); }
        catch (parseErr) { console.error("AI response parse error:", parseErr, "Raw:", text); throw new Error("Failed to parse AI response. Please try again."); }
      };

      // Merge multiple extraction results
      const mergeResults = (results) => {
        const merged = { contract: { value: null, scopeSummary: "", startDate: null, duration: null }, budget: { totalCost: null, materialCost: null, laborCost: null, otherCost: null, estimatedMargin: null, lineItems: [] }, specs: { roofType: null, sqft: null, buildingCount: null, primaryMaterial: null, system: null } };
        for (const r of results) {
          if (r.contract) {
            if (r.contract.value) merged.contract.value = r.contract.value;
            if (r.contract.scopeSummary) merged.contract.scopeSummary = r.contract.scopeSummary;
            if (r.contract.startDate) merged.contract.startDate = r.contract.startDate;
            if (r.contract.duration) merged.contract.duration = r.contract.duration;
          }
          if (r.budget) {
            if (r.budget.totalCost) merged.budget.totalCost = r.budget.totalCost;
            if (r.budget.materialCost) merged.budget.materialCost = r.budget.materialCost;
            if (r.budget.laborCost) merged.budget.laborCost = r.budget.laborCost;
            if (r.budget.otherCost) merged.budget.otherCost = r.budget.otherCost;
            if (r.budget.estimatedMargin) merged.budget.estimatedMargin = r.budget.estimatedMargin;
            if (r.budget.lineItems?.length) merged.budget.lineItems = [...merged.budget.lineItems, ...r.budget.lineItems];
          }
          if (r.specs) {
            if (r.specs.roofType) merged.specs.roofType = r.specs.roofType;
            if (r.specs.sqft) merged.specs.sqft = r.specs.sqft;
            if (r.specs.buildingCount) merged.specs.buildingCount = r.specs.buildingCount;
            if (r.specs.primaryMaterial) merged.specs.primaryMaterial = r.specs.primaryMaterial;
            if (r.specs.system) merged.specs.system = r.specs.system;
          }
        }
        return merged;
      };

      const handleAIProcess = async () => {
        setProcessing(true); setError(null);
        setAllDocsStatus("processing");
        try {
          const batches = buildBatches();
          const results = [];
          for (let i = 0; i < batches.length; i++) {
            const batchResult = await processBatch(batches[i]);
            results.push(batchResult);
          }
          const finalResult = results.length === 1 ? results[0] : mergeResults(results);
          // Auto-apply: save document metadata + extracted data to project immediately
          const savedDocs = {
            budget: docs.budget ? { name: docs.budget.name, size: docs.budget.size, type: docs.budget.type, uploadedAt: docs.budget.uploadedAt, status: "processed" } : (project.documents?.budget || null),
            contract: [
              ...(Array.isArray(project.documents?.contract) ? project.documents.contract : []),
              ...(docs.contract || []).map(d => ({ name: d.name, size: d.size, type: d.type, uploadedAt: d.uploadedAt, status: "processed" })),
            ],
            planSet: [
              ...(Array.isArray(project.documents?.planSet) ? project.documents.planSet : []),
              ...(docs.planSet || []).map(d => ({ name: d.name, size: d.size, type: d.type, uploadedAt: d.uploadedAt, status: "processed" })),
            ],
          };
          const u = { documents: savedDocs, extractionData: finalResult };
          if (finalResult.contract?.value) u.contractValue = finalResult.contract.value;
          if (finalResult.budget?.totalCost) u.estimatedCost = finalResult.budget.totalCost;
          if (finalResult.budget?.estimatedMargin) { u.estimatedMargin = finalResult.budget.estimatedMargin; u.currentMargin = finalResult.budget.estimatedMargin; }
          if (finalResult.specs?.roofType) u.roofType = finalResult.specs.roofType;
          if (finalResult.specs?.sqft) u.sqft = finalResult.specs.sqft;
          if (finalResult.specs?.buildingCount) u.buildings = finalResult.specs.buildingCount;
          if (finalResult.contract?.startDate) u.startDate = finalResult.contract.startDate;
          if (finalResult.budget?.lineItems?.length) u.budgetLineItems = finalResult.budget.lineItems.map((li, i) => ({ ...li, id: generateId(), category: li.category || "Materials" }));
          onUpdateProject(u);
          // Show results briefly, then clear upload area
          setExtractionData(finalResult);
          setDocs({ budget: null, contract: [], planSet: [] });
        } catch (err) {
          console.error("AI processing error:", err);
          setError("AI processing failed: " + (err.message || "Unknown error") + ". Try processing fewer documents at once.");
          setAllDocsStatus("error");
        } finally { setProcessing(false); }
      };

      const handleApply = () => {
        // Data already auto-applied during processing — just dismiss the results view
        setExtractionData(null);
        setError(null);
      };

      return (
        <div>
          {/* Previously processed documents */}
          {(() => {
            const pd = project.documents || {};
            const savedDocs = [
              ...(pd.budget ? [pd.budget] : []),
              ...(Array.isArray(pd.contract) ? pd.contract : []),
              ...(Array.isArray(pd.planSet) ? pd.planSet : []),
            ].filter(d => d && d.name && d.status === "processed");
            if (savedDocs.length === 0) return null;
            return (
              <div style={{ marginBottom: 24, padding: "16px 18px", borderRadius: 12, background: C.gray50, border: `1px solid ${C.gray200}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ color: C.green }}>{I.check}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>Processed Documents ({savedDocs.length})</span>
                </div>
                {savedDocs.map((doc, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < savedDocs.length - 1 ? `1px solid ${C.gray200}` : "none" }}>
                    <span style={{ color: C.green }}>{I.file}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: C.gray600 }}>{doc.name}</span>
                    <span style={{ fontSize: 10, color: C.gray400 }}>({(doc.size / 1024).toFixed(0)} KB)</span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Upload new documents */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            <DocumentUploadCard type="budget" files={docs.budget} onUpload={handleUpload} onRemove={handleRemove} />
            <DocumentUploadCard type="contract" files={docs.contract} onUpload={handleUpload} onRemove={handleRemove} />
            <DocumentUploadCard type="planSet" files={docs.planSet} onUpload={handleUpload} onRemove={handleRemove} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <button onClick={handleAIProcess} disabled={!canProcess || processing} style={{ width: "100%", padding: "14px 0", borderRadius: 10, border: "none", background: canProcess && !processing ? `linear-gradient(135deg, ${C.navy}, ${C.navyLight})` : C.gray200, color: canProcess && !processing ? C.white : C.gray400, fontSize: 14, fontWeight: 600, cursor: canProcess && !processing ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: canProcess && !processing ? `0 4px 16px ${C.navy}30` : "none" }}>
              {processing ? <><Spinner size={16} /> Processing with AI...</> : <>{I.zap} Process Documents with AI</>}
            </button>
            <p style={{ fontSize: 11, color: C.gray400, textAlign: "center", marginTop: 6 }}>{uploadedCount} document{uploadedCount !== 1 ? "s" : ""} uploaded</p>
          </div>
          {error && <div style={{ padding: "12px 16px", borderRadius: 8, background: C.redBg, marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 8 }}><span style={{ color: C.red, flexShrink: 0, marginTop: 1 }}>{I.alert}</span><span style={{ fontSize: 12, color: C.red, fontWeight: 500 }}>{error}</span></div>}
          <ExtractionResults data={extractionData} onApply={handleApply} />
          {!extractionData && project.extractionData && (
            <div style={{ border: `1px solid ${C.gray200}`, borderRadius: 12, padding: "14px 18px", background: C.gray50, marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ color: C.green }}>{I.zap}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.gray600 }}>Previously extracted data has been applied to this project.</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ============================================================
    // SCHEDULE / GANTT CHART (Phase 3)
    // ============================================================
    const DEFAULT_PHASES = [
      { id: "mob", name: "Mobilization / Setup", color: "#6366F1", daysOffset: 0, durationDays: 2 },
      { id: "tear", name: "Tear-Off", color: "#EF4444", daysOffset: 2, durationDays: 5 },
      { id: "dry", name: "Dry-In", color: "#F59E0B", daysOffset: 7, durationDays: 3 },
      { id: "inst", name: "Installation", color: "#10B981", daysOffset: 10, durationDays: 10 },
      { id: "detail", name: "Detail Work / Flashing", color: "#3B82F6", daysOffset: 20, durationDays: 4 },
      { id: "clean", name: "Cleanup & Final Inspection", color: "#8B5CF6", daysOffset: 24, durationDays: 2 },
    ];

    const DELAY_REASONS = ["Weather", "Material Backorder", "Labor Shortage", "Access Issue", "Permit Delay", "Other"];

    function GanttChart({ phases, projectStart, projectEnd, onPhaseClick }) {
      const totalDays = Math.max(daysBetween(projectStart, projectEnd), 7);
      const today = new Date().toISOString().split("T")[0];
      const todayOffset = daysBetween(projectStart, today);

      // Generate week markers
      const weeks = [];
      for (let d = 0; d <= totalDays; d += 7) {
        weeks.push({ day: d, label: fmtShort(addDays(projectStart, d)) });
      }

      return (
        <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${C.gray200}`, background: C.white }}>
          <div style={{ minWidth: Math.max(totalDays * 14 + 200, 500) }}>
            {/* Header row with week markers */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.gray200}`, position: "sticky", top: 0, background: C.gray50, zIndex: 2 }}>
              <div style={{ width: 200, minWidth: 200, padding: "10px 14px", fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", borderRight: `1px solid ${C.gray200}` }}>Phase</div>
              <div style={{ flex: 1, position: "relative", height: 36 }}>
                {weeks.map((w, i) => (
                  <div key={i} style={{ position: "absolute", left: w.day * 14, top: 0, bottom: 0, borderLeft: `1px solid ${C.gray200}`, padding: "10px 6px", fontSize: 10, fontWeight: 600, color: C.gray400, whiteSpace: "nowrap" }}>{w.label}</div>
                ))}
              </div>
            </div>

            {/* Phase rows */}
            {phases.map((phase, idx) => {
              const startOffset = daysBetween(projectStart, phase.startDate);
              const duration = daysBetween(phase.startDate, phase.endDate);
              const barLeft = startOffset * 14;
              const barWidth = Math.max(duration * 14, 14);
              const pct = phase.progress || 0;

              return (
                <div key={phase.id} onClick={() => onPhaseClick && onPhaseClick(phase)}
                  style={{ display: "flex", borderBottom: `1px solid ${C.gray100}`, cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.gray50}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ width: 200, minWidth: 200, padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, borderRight: `1px solid ${C.gray200}` }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: phase.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.navy, lineHeight: 1.2 }}>{phase.name}</div>
                      <div style={{ fontSize: 10, color: C.gray400 }}>{fmtShort(phase.startDate)} – {fmtShort(phase.endDate)}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, position: "relative", padding: "8px 0", minHeight: 48 }}>
                    {/* Grid lines */}
                    {weeks.map((w, i) => <div key={i} style={{ position: "absolute", left: w.day * 14, top: 0, bottom: 0, borderLeft: `1px solid ${C.gray100}` }} />)}
                    {/* Today marker */}
                    {todayOffset >= 0 && todayOffset <= totalDays && (
                      <div style={{ position: "absolute", left: todayOffset * 14, top: 0, bottom: 0, width: 2, background: C.red + "60", zIndex: 1 }} />
                    )}
                    {/* Phase bar */}
                    <div style={{ position: "absolute", left: barLeft, top: 10, height: 28, width: barWidth, borderRadius: 6, background: phase.color + "20", border: `1px solid ${phase.color}40`, overflow: "hidden", display: "flex", alignItems: "center" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: phase.color + "50", borderRadius: "5px 0 0 5px", transition: "width 0.3s" }} />
                      <span style={{ position: "absolute", left: 8, fontSize: 10, fontWeight: 700, color: phase.color, zIndex: 1 }}>{pct}%</span>
                      {phase.delay && <span style={{ position: "absolute", right: 6, fontSize: 9, background: C.yellowBg, color: C.yellow, padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>⚠</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Today legend */}
            <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 12, borderTop: `1px solid ${C.gray200}`, background: C.gray50 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 2, background: C.red + "60" }} /><span style={{ fontSize: 10, color: C.gray400 }}>Today</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 8, borderRadius: 2, background: C.green + "50" }} /><span style={{ fontSize: 10, color: C.gray400 }}>Progress</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 10, background: C.yellowBg, color: C.yellow, padding: "0 4px", borderRadius: 2, fontWeight: 700 }}>⚠</span><span style={{ fontSize: 10, color: C.gray400 }}>Delay</span></div>
            </div>
          </div>
        </div>
      );
    }


    function PhaseEditModal({ phase, onSave, onClose, onDelete }) {
      const [form, setForm] = useState({ ...phase });
      const [showDelay, setShowDelay] = useState(!!phase.delay);
      const fs = { width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 14, color: C.navy, outline: "none", boxSizing: "border-box" };
      const ls = { fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4, display: "block" };

      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }} onClick={onClose}>
          <div style={{ background: C.white, borderRadius: 14, width: 420, maxHeight: "85vh", overflow: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.gray200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: form.color }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: 0 }}>Edit Phase</h3>
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400 }}>{I.x}</button>
            </div>
            <div style={{ padding: "20px 24px 24px" }}>
              <div style={{ display: "grid", gap: 14 }}>
                <div><label style={ls}>Phase Name</label><input style={fs} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={ls}>Start Date</label><input style={fs} type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                  <div><label style={ls}>End Date</label><input style={fs} type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
                </div>
                <div><label style={ls}>Progress (%)</label><input style={fs} type="number" min="0" max="100" value={form.progress || 0} onChange={e => setForm(f => ({ ...f, progress: Math.min(100, Math.max(0, Number(e.target.value))) }))} /></div>

                {/* Delay section */}
                <div style={{ borderTop: `1px solid ${C.gray200}`, paddingTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showDelay ? 12 : 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.gray600 }}>Report a Delay</span>
                    <button onClick={() => { setShowDelay(!showDelay); if (showDelay) setForm(f => ({ ...f, delay: null })); }}
                      style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${showDelay ? C.red : C.gray300}`, background: showDelay ? C.redBg : C.white, color: showDelay ? C.red : C.gray500, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      {showDelay ? "Remove Delay" : "Add Delay"}
                    </button>
                  </div>
                  {showDelay && (
                    <div style={{ display: "grid", gap: 10 }}>
                      <div>
                        <label style={ls}>Reason</label>
                        <select style={fs} value={form.delay?.reason || ""} onChange={e => setForm(f => ({ ...f, delay: { ...(f.delay || {}), reason: e.target.value, date: f.delay?.date || new Date().toISOString().split("T")[0] } }))}>
                          <option value="">Select reason...</option>
                          {DELAY_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={ls}>Notes</label>
                        <textarea style={{ ...fs, minHeight: 60, resize: "vertical" }} value={form.delay?.notes || ""} placeholder="Additional details about the delay..."
                          onChange={e => setForm(f => ({ ...f, delay: { ...(f.delay || {}), notes: e.target.value } }))} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "space-between" }}>
                <button onClick={() => onDelete(form.id)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${C.red}40`, background: C.redBg, color: C.red, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{I.trash} Delete</button>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button onClick={() => onSave(form)} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: C.red, color: C.white, fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: `0 2px 8px ${C.red}30` }}>Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }


    function AddPhaseModal({ onAdd, onClose, existingPhases }) {
      const lastPhase = existingPhases[existingPhases.length - 1];
      const defaultStart = lastPhase ? addDays(lastPhase.endDate, 1) : new Date().toISOString().split("T")[0];
      const [form, setForm] = useState({ name: "", startDate: defaultStart, endDate: addDays(defaultStart, 3), color: "#6366F1", progress: 0 });
      const fs = { width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 14, color: C.navy, outline: "none", boxSizing: "border-box" };
      const ls = { fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4, display: "block" };
      const phaseColors = ["#6366F1", "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }} onClick={onClose}>
          <div style={{ background: C.white, borderRadius: 14, width: 400, boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.gray200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: 0 }}>Add Phase</h3>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400 }}>{I.x}</button>
            </div>
            <div style={{ padding: "20px 24px 24px" }}>
              <div style={{ display: "grid", gap: 14 }}>
                <div><label style={ls}>Phase Name</label><input style={fs} placeholder="e.g. Parapet Coping" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={ls}>Start Date</label><input style={fs} type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                  <div><label style={ls}>End Date</label><input style={fs} type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
                </div>
                <div><label style={ls}>Color</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {phaseColors.map(c => <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: 28, height: 28, borderRadius: 6, background: c, border: form.color === c ? `3px solid ${C.navy}` : `2px solid transparent`, cursor: "pointer", transition: "all 0.15s" }} />)}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
                <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={() => { if (form.name) onAdd({ ...form, id: generateId(), progress: 0 }); }} disabled={!form.name}
                  style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: form.name ? C.red : C.gray300, color: form.name ? C.white : C.gray400, fontSize: 13, fontWeight: 600, cursor: form.name ? "pointer" : "default" }}>Add Phase</button>
              </div>
            </div>
          </div>
        </div>
      );
    }


    function ScheduleTab({ project, onUpdateProject }) {
      const [phases, setPhases] = useState(project.schedule || []);
      const [editPhase, setEditPhase] = useState(null);
      const [showAddPhase, setShowAddPhase] = useState(false);
      const [generating, setGenerating] = useState(false);
      const [genError, setGenError] = useState(null);
      const hasSchedule = phases.length > 0;

      // AI Chat state
      const [chatInput, setChatInput] = useState("");
      const [chatHistory, setChatHistory] = useState([]);
      const [chatProcessing, setChatProcessing] = useState(false);
      const chatEndRef = useRef(null);
      const chatInputRef = useRef(null);

      // Project dates (editable here)
      const [startDate, setStartDate] = useState(project.startDate || "");
      const [estCompletion, setEstCompletion] = useState(project.estCompletion || "");

      const handleDateChange = (field, value) => {
        if (field === "startDate") { setStartDate(value); onUpdateProject({ startDate: value }); }
        else { setEstCompletion(value); onUpdateProject({ estCompletion: value }); }
      };

      useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

      const projectStart = hasSchedule ? phases.reduce((min, p) => p.startDate < min ? p.startDate : min, phases[0].startDate) : startDate || new Date().toISOString().split("T")[0];
      const projectEnd = hasSchedule ? phases.reduce((max, p) => p.endDate > max ? p.endDate : max, phases[0].endDate) : estCompletion || addDays(projectStart, 30);

      const handleGenerateAI = async () => {
        setGenerating(true); setGenError(null);
        try {
          const sd = startDate || new Date().toISOString().split("T")[0];
          const prompt = "Generate a roofing construction schedule. Project: " + (project.name || "Roofing Project") + ", Type: " + (project.roofType || "Asphalt Shingles") + ", SqFt: " + (project.sqft || "Unknown") + ", Buildings: " + (project.buildings || 1) + ", Start: " + sd + (estCompletion ? ", End: " + estCompletion : "") + ". Return ONLY JSON array (no markdown): [{\"name\":\"Phase\",\"startDate\":\"YYYY-MM-DD\",\"endDate\":\"YYYY-MM-DD\",\"color\":\"#hex\"}]. Include: Mobilization, Tear-Off, Dry-In, Installation, Detail/Flashing, Cleanup. Colors: #6366F1,#EF4444,#F59E0B,#10B981,#3B82F6,#8B5CF6.";

          const response = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
          });
          if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(errBody.error?.message || "API error " + response.status);
          }
          const result = await response.json();
          const text = result.content?.find(c => c.type === "text")?.text || "";
          const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
          const arr = Array.isArray(parsed) ? parsed : parsed.schedule || [];
          const withIds = arr.map(p => ({ ...p, id: generateId(), progress: 0 }));
          setPhases(withIds);
          const newStart = withIds[0]?.startDate;
          const newEnd = withIds[withIds.length - 1]?.endDate;
          if (newStart) setStartDate(newStart);
          if (newEnd) setEstCompletion(newEnd);
          onUpdateProject({ schedule: withIds, startDate: newStart, estCompletion: newEnd });
        } catch (err) {
          console.error("Schedule generation error:", err);
          setGenError("AI generation failed (" + (err.message || "network error") + "). Using default phases.");
          const start = startDate || new Date().toISOString().split("T")[0];
          const fallback = DEFAULT_PHASES.map(p => ({ ...p, id: generateId(), startDate: addDays(start, p.daysOffset), endDate: addDays(start, p.daysOffset + p.durationDays), progress: 0 }));
          setPhases(fallback);
          onUpdateProject({ schedule: fallback });
        } finally { setGenerating(false); }
      };

      const handleSavePhase = (updated) => {
        const newPhases = phases.map(p => p.id === updated.id ? updated : p);
        setPhases(newPhases);
        onUpdateProject({ schedule: newPhases });
        setEditPhase(null);
      };

      const handleDeletePhase = (id) => {
        const newPhases = phases.filter(p => p.id !== id);
        setPhases(newPhases);
        onUpdateProject({ schedule: newPhases });
        setEditPhase(null);
      };

      const handleAddPhase = (phase) => {
        const newPhases = [...phases, phase].sort((a, b) => a.startDate.localeCompare(b.startDate));
        setPhases(newPhases);
        onUpdateProject({ schedule: newPhases });
        setShowAddPhase(false);
      };

      // AI Schedule Chat
      const handleChatSubmit = async () => {
        const msg = chatInput.trim();
        if (!msg || chatProcessing) return;
        setChatInput("");
        setChatHistory(prev => [...prev, { role: "user", text: msg }]);
        setChatProcessing(true);

        try {
          // Compact schedule representation to minimize payload
          const scheduleText = phases.map(p =>
            p.name + "|" + p.startDate + "|" + p.endDate + "|" + p.color + "|" + (p.progress || 0) + "%" + (p.delay ? "|DELAY:" + p.delay.reason : "")
          ).join("\n");

          const prompt = "You modify roofing construction schedules. Current schedule:\n" + scheduleText + "\n\nRespond with ONLY JSON (no markdown):\n{\"message\":\"what you changed\",\"schedule\":[{\"name\":\"...\",\"startDate\":\"YYYY-MM-DD\",\"endDate\":\"YYYY-MM-DD\",\"color\":\"#hex\",\"progress\":0}]}\n\nReturn ALL phases. Keep colors. User request: " + msg;

          const response = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 1000,
              messages: [{ role: "user", content: prompt }],
            }),
          });

          if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(errBody.error?.message || "API error " + response.status);
          }

          const result = await response.json();
          const text = result.content?.find(c => c.type === "text")?.text || "";
          if (!text) throw new Error("Empty response");

          const cleaned = text.replace(/```json|```/g, "").trim();
          let parsed;
          try { parsed = JSON.parse(cleaned); } catch (parseErr) {
            setChatHistory(prev => [...prev, { role: "assistant", text: cleaned || "Couldn't parse the response. Try a simpler request.", error: false }]);
            setChatProcessing(false);
            return;
          }

          if (parsed.schedule && Array.isArray(parsed.schedule)) {
            const updatedPhases = parsed.schedule.map(p => ({ ...p, id: p.id || generateId(), progress: p.progress || 0, delay: p.delay || null }));
            setPhases(updatedPhases);
            onUpdateProject({ schedule: updatedPhases, startDate: updatedPhases[0]?.startDate, estCompletion: updatedPhases[updatedPhases.length - 1]?.endDate });
            setChatHistory(prev => [...prev, { role: "assistant", text: parsed.message || "Schedule updated." }]);
          } else {
            setChatHistory(prev => [...prev, { role: "assistant", text: parsed.message || "No schedule changes returned.", error: false }]);
          }
        } catch (err) {
          console.error("Chat error:", err);
          setChatHistory(prev => [...prev, { role: "assistant", text: "Error: " + (err.message || "Unknown error") + ". Try rephrasing your instruction.", error: true }]);
        } finally { setChatProcessing(false); }
      };

      const overallProgress = hasSchedule ? Math.round(phases.reduce((s, p) => s + (p.progress || 0), 0) / phases.length) : 0;
      const delayedPhases = phases.filter(p => p.delay);

      return (
        <div>
          {/* Project Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20, padding: "16px 18px", borderRadius: 10, background: C.white, border: `1px solid ${C.gray200}` }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.gray600, marginBottom: 4, display: "block" }}>Project Start Date</label>
              <input type="date" value={startDate} onChange={e => handleDateChange("startDate", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 14, color: C.navy, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.gray600, marginBottom: 4, display: "block" }}>Estimated Completion</label>
              <input type="date" value={estCompletion} onChange={e => handleDateChange("estCompletion", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 14, color: C.navy, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Summary bar */}
          {hasSchedule && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ padding: "14px 16px", borderRadius: 10, background: C.white, border: `1px solid ${C.gray200}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Overall Progress</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{overallProgress}%</span>
                  <div style={{ flex: 1 }}><ProgressBar value={overallProgress} /></div>
                </div>
              </div>
              <div style={{ padding: "14px 16px", borderRadius: 10, background: C.white, border: `1px solid ${C.gray200}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Phases</p>
                <span style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{phases.length}</span>
              </div>
              <div style={{ padding: "14px 16px", borderRadius: 10, background: C.white, border: `1px solid ${delayedPhases.length > 0 ? C.yellow + "60" : C.gray200}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Delays</p>
                <span style={{ fontSize: 20, fontWeight: 800, color: delayedPhases.length > 0 ? C.yellow : C.green }}>{delayedPhases.length}</span>
              </div>
            </div>
          )}

          {/* Gantt chart or empty state */}
          {hasSchedule ? (
            <>
              <GanttChart phases={phases} projectStart={projectStart} projectEnd={projectEnd} onPhaseClick={setEditPhase} />
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={() => setShowAddPhase(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{I.plus} Add Phase</button>
                <button onClick={handleGenerateAI} disabled={generating} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.navy}30`, background: C.navy + "08", color: C.navy, fontSize: 12, fontWeight: 600, cursor: generating ? "default" : "pointer" }}>
                  {generating ? <Spinner size={12} color={C.navy} /> : I.zap} Regenerate
                </button>
              </div>
              <p style={{ fontSize: 11, color: C.gray400, marginTop: 8 }}>Click any phase to edit dates, progress, or report delays.</p>

              {/* Delay log */}
              {delayedPhases.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Active Delays</h4>
                  {delayedPhases.map(p => (
                    <div key={p.id} style={{ padding: "10px 14px", borderRadius: 8, background: C.yellowBg + "60", border: `1px solid ${C.yellow}30`, marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color, marginTop: 4, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: C.yellow, fontWeight: 600 }}>{p.delay.reason}</div>
                        {p.delay.notes && <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>{p.delay.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Schedule Assistant */}
              <div style={{ marginTop: 24, borderRadius: 12, border: `1px solid ${C.navy}20`, background: C.white, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", background: `linear-gradient(135deg, ${C.navyDark}, ${C.navy})`, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: C.white }}>{I.zap}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.white }}>Schedule Assistant</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginLeft: "auto" }}>Powered by AI</span>
                </div>

                {/* Chat history */}
                {chatHistory.length > 0 && (
                  <div style={{ maxHeight: 220, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, background: C.gray50 }}>
                    {chatHistory.map((msg, i) => (
                      <div key={msg.role + '_' + i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                        <div style={{
                          maxWidth: "85%", padding: "8px 12px", borderRadius: msg.role === "user" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                          background: msg.role === "user" ? C.navy : msg.error ? C.redBg : C.greenBg,
                          color: msg.role === "user" ? C.white : msg.error ? C.red : C.navy,
                          fontSize: 12, lineHeight: 1.5,
                        }}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {chatProcessing && (
                      <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <div style={{ padding: "8px 16px", borderRadius: "10px 10px 10px 2px", background: C.gray200, display: "flex", alignItems: "center", gap: 6 }}>
                          <Spinner size={10} color={C.gray500} />
                          <span style={{ fontSize: 12, color: C.gray500 }}>Updating schedule...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}

                {/* Input */}
                <div style={{ padding: "12px 16px", borderTop: chatHistory.length > 0 ? `1px solid ${C.gray200}` : "none", display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <textarea
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSubmit(); } }}
                    placeholder="e.g. &quot;Push installation back 5 days for weather&quot; or &quot;Add a 3-day insulation phase before dry-in&quot;"
                    rows={2}
                    style={{ flex: 1, padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none", resize: "none", lineHeight: 1.4, background: C.gray50 }}
                  />
                  <button onClick={handleChatSubmit} disabled={!chatInput.trim() || chatProcessing}
                    style={{
                      padding: "8px 16px", borderRadius: 8, border: "none", flexShrink: 0,
                      background: chatInput.trim() && !chatProcessing ? `linear-gradient(135deg, ${C.red}, ${C.redDark})` : C.gray200,
                      color: chatInput.trim() && !chatProcessing ? C.white : C.gray400,
                      fontSize: 12, fontWeight: 600, cursor: chatInput.trim() && !chatProcessing ? "pointer" : "default",
                      height: 36, display: "flex", alignItems: "center", gap: 4,
                    }}>
                    {chatProcessing ? <Spinner size={12} /> : "Send"}
                  </button>
                </div>

                {chatHistory.length === 0 && (
                  <div style={{ padding: "0 16px 14px" }}>
                    <p style={{ fontSize: 11, color: C.gray400, margin: "0 0 8px" }}>Try something like:</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {["Push tear-off back 3 days", "Add a weather delay to installation", "Extend cleanup by 2 days", "Move everything forward 1 week", "Split installation into 2 phases"].map(s => (
                        <button key={s} onClick={() => { setChatInput(s); chatInputRef.current?.focus(); }}
                          style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${C.gray200}`, background: C.gray50, color: C.gray500, fontSize: 10, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = C.red + "60"; e.currentTarget.style.color = C.red; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = C.gray200; e.currentTarget.style.color = C.gray500; }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: "40px 20px", textAlign: "center", background: C.white, borderRadius: 12, border: `2px dashed ${C.gray300}` }}>
              <div style={{ color: C.gray300, marginBottom: 12 }}>{I.calendar}</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: C.gray500, margin: "0 0 6px" }}>No schedule yet</p>
              <p style={{ fontSize: 13, color: C.gray400, margin: "0 0 20px" }}>Generate a schedule with AI based on the project details, or add phases manually.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={handleGenerateAI} disabled={generating} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`, color: C.white, fontSize: 14, fontWeight: 600, cursor: generating ? "default" : "pointer", boxShadow: `0 4px 12px ${C.navy}30` }}>
                  {generating ? <Spinner size={16} /> : I.zap} Generate with AI
                </button>
                <button onClick={() => setShowAddPhase(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{I.plus} Add Manually</button>
              </div>
            </div>
          )}

          {genError && <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: C.yellowBg, display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: C.yellow }}>{I.alert}</span><span style={{ fontSize: 12, color: C.yellow, fontWeight: 500 }}>{genError}</span></div>}

          {editPhase && <PhaseEditModal phase={editPhase} onSave={handleSavePhase} onDelete={handleDeletePhase} onClose={() => setEditPhase(null)} />}
          {showAddPhase && <AddPhaseModal existingPhases={phases} onAdd={handleAddPhase} onClose={() => setShowAddPhase(false)} />}
        </div>
      );
    }

    // ============================================================
    // MATERIAL & LABOR ORDERS (Phase 4)
    // ============================================================

    // Material Order Line Item Row

    function MaterialLineItem({ item, idx, onUpdate, onRemove }) {
      const fs = { padding: "6px 8px", border: `1px solid ${C.gray200}`, borderRadius: 6, fontSize: 12, color: C.navy, outline: "none", boxSizing: "border-box", width: "100%", background: C.white };
      const STATUSES_MAT = ["Pending", "Ordered", "Partial", "Received", "Backordered"];
      const statusColors = { Pending: C.gray400, Ordered: C.blue, Partial: C.yellow, Received: C.green, Backordered: C.red };

      return (
        <tr style={{ borderBottom: `1px solid ${C.gray100}` }}>
          <td style={{ padding: "8px 6px" }}><input style={fs} value={item.material} onChange={e => onUpdate(idx, "material", e.target.value)} /></td>
          <td style={{ padding: "8px 6px" }}><input style={fs} value={item.spec} onChange={e => onUpdate(idx, "spec", e.target.value)} /></td>
          <td style={{ padding: "8px 4px", width: 130 }}>
            <select style={{ ...fs, fontSize: 11 }} value={item.vendor || ""} onChange={e => onUpdate(idx, "vendor", e.target.value)}>
              <option value="">Select vendor...</option>
              {VENDOR_CATALOG.materials.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
            </select>
          </td>
          <td style={{ padding: "8px 4px", width: 70 }}><input style={{ ...fs, textAlign: "right" }} type="number" value={item.qty} onChange={e => onUpdate(idx, "qty", Number(e.target.value))} /></td>
          <td style={{ padding: "8px 4px", width: 60 }}><input style={fs} value={item.unit} onChange={e => onUpdate(idx, "unit", e.target.value)} /></td>
          <td style={{ padding: "8px 4px", width: 85 }}><input style={{ ...fs, textAlign: "right" }} type="number" value={item.unitCost} onChange={e => onUpdate(idx, "unitCost", Number(e.target.value))} /></td>
          <td style={{ padding: "8px 4px", width: 80, textAlign: "right", fontSize: 12, fontWeight: 600, color: C.navy }}>{formatCurrency((item.qty || 0) * (item.unitCost || 0))}</td>
          <td style={{ padding: "8px 4px", width: 95 }}>
            <select style={{ ...fs, color: statusColors[item.status] || C.gray400, fontWeight: 600, fontSize: 11 }} value={item.status || "Pending"} onChange={e => onUpdate(idx, "status", e.target.value)}>
              {STATUSES_MAT.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </td>
          <td style={{ padding: "8px 2px", width: 32 }}><button onClick={() => onRemove(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray300, padding: 2 }}>{I.trash}</button></td>
        </tr>
      );
    }


    function MaterialOrder({ project, materials, setMaterials, onUpdateProject }) {
      const [generating, setGenerating] = useState(false);
      const hasMaterials = materials.length > 0;
      const hasBudget = (project.budgetLineItems || []).length > 0;

      const handleUpdate = (idx, field, value) => {
        const updated = [...materials];
        updated[idx] = { ...updated[idx], [field]: value };
        setMaterials(updated);
      };
      const handleRemove = (idx) => { setMaterials(materials.filter((_, i) => i !== idx)); };
      const handleAdd = () => { setMaterials([...materials, { material: "", spec: "", qty: 0, unit: "sq ft", unitCost: 0, status: "Pending", vendor: "", notes: "" }]); };
      const totalCost = materials.reduce((s, m) => s + (m.qty || 0) * (m.unitCost || 0), 0);

      const handleSave = () => { onUpdateProject({ materialOrder: materials }); };

      // Create from Budget — pull material-related budget line items
      const handleCreateFromBudget = () => {
        const budgetItems = project.budgetLineItems || [];
        const materialItems = budgetItems.filter(li => li.category === "Materials" || li.category === "Equipment" || (!li.category || li.category === "Other"));
        const newMaterials = materialItems.map(li => ({
          material: li.description || "",
          spec: "",
          qty: 1,
          unit: "each",
          unitCost: li.amount || 0,
          status: "Pending",
          vendor: "",
          notes: "From job budget",
        }));
        setMaterials(newMaterials);
      };

      const handleGenerate = async () => {
        setGenerating(true);
        try {
          const prompt = `You are a material estimator for Colony Roofers, a GAF President's Club roofing contractor. Generate a detailed material order for this project:

Project: ${project.name}
Roof Type: ${project.roofType}
Square Footage: ${project.sqft || "Unknown"}
Buildings: ${project.buildings || 1}
Contract Value: ${project.contractValue ? formatCurrency(project.contractValue) : "Unknown"}
Estimated Cost: ${project.estimatedCost ? formatCurrency(project.estimatedCost) : "Unknown"}

Return ONLY valid JSON (no markdown, no preamble) as an array:
[{"material":"Item Name","spec":"Brand/Specification","qty":<number>,"unit":"unit","unitCost":<number>,"status":"Pending","notes":""}]

Include all materials needed: primary roofing material, underlayment, insulation (if applicable), fasteners, adhesives, flashing, edge metal, caulk/sealant, pipe boots, drains, and any accessories. Use realistic quantities based on the sq ft and roof type. Use realistic contractor pricing. Units can be: sq ft, rolls, sheets, bundles, boxes, gallons, tubes, each, linear ft.`;

          const response = await fetch("/api/ai", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
          });
          if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(e.error?.message || "API error"); }
          const result = await response.json();
          const text = result.content?.find(c => c.type === "text")?.text || "";
          const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
          const arr = Array.isArray(parsed) ? parsed : parsed.materials || [];
          setMaterials(arr);
        } catch (err) {
          console.error("Material generation error:", err);
          alert("Material order generation failed: " + (err.message || "Unknown error"));
        } finally { setGenerating(false); }
      };

      // Export to printable format
      const handleExport = () => {
        const rows = materials.map(m => `${m.material}\t${m.spec}\t${m.qty}\t${m.unit}\t$${m.unitCost}\t$${(m.qty * m.unitCost).toFixed(0)}`);
        const header = `MATERIAL ORDER — ${project.name}\nDate: ${new Date().toLocaleDateString()}\nRoof Type: ${project.roofType} | Sq Ft: ${project.sqft?.toLocaleString() || "N/A"}\n${"—".repeat(80)}\nMaterial\tSpec\tQty\tUnit\tUnit Cost\tTotal`;
        const footer = `${"—".repeat(80)}\nTOTAL: ${formatCurrency(totalCost)}`;
        const content = [header, ...rows, footer].join("\n");
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `Material_Order_${(project.name || "Export").replace(/[^a-zA-Z0-9]/g, "_")}.txt`; a.click();
        URL.revokeObjectURL(url);
      };

      return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: 0 }}>Material Order</h4>
            <div style={{ display: "flex", gap: 6 }}>
              {hasMaterials && <button onClick={handleExport} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Export</button>}
              {hasBudget && <button onClick={handleCreateFromBudget} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.green}50`, background: C.greenBg, color: C.green, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{I.dollar} From Budget</button>}
              <button onClick={handleGenerate} disabled={generating} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.navy}30`, background: C.navy + "08", color: C.navy, fontSize: 11, fontWeight: 600, cursor: generating ? "default" : "pointer" }}>
                {generating ? <Spinner size={10} color={C.navy} /> : I.zap} {hasMaterials ? "Regenerate" : "Generate"} with AI
              </button>
            </div>
          </div>

          {hasMaterials ? (
            <>
              <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${C.gray200}`, background: C.white }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: C.gray50 }}>
                      <th style={{ padding: "10px 6px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.05em" }}>Material</th>
                      <th style={{ padding: "10px 6px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Spec</th>
                      <th style={{ padding: "10px 4px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", width: 130 }}>Vendor</th>
                      <th style={{ padding: "10px 4px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", width: 70 }}>Qty</th>
                      <th style={{ padding: "10px 4px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", width: 60 }}>Unit</th>
                      <th style={{ padding: "10px 4px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", width: 85 }}>Unit $</th>
                      <th style={{ padding: "10px 4px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", width: 80 }}>Total</th>
                      <th style={{ padding: "10px 4px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", width: 95 }}>Status</th>
                      <th style={{ width: 32 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m, i) => <MaterialLineItem key={m.id || ('mat_' + i)} item={m} idx={i} onUpdate={handleUpdate} onRemove={handleRemove} />)}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: C.gray50 }}>
                      <td colSpan="6" style={{ padding: "10px 6px", textAlign: "right", fontSize: 12, fontWeight: 700, color: C.gray500 }}>Total Material Cost:</td>
                      <td style={{ padding: "10px 4px", textAlign: "right", fontSize: 14, fontWeight: 800, color: C.navy }}>{formatCurrency(totalCost)}</td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={handleAdd} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{I.plus} Add Line</button>
                <button onClick={handleSave} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: C.green, color: C.white, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Save Order</button>
              </div>
            </>
          ) : (
            <div style={{ padding: "32px 16px", textAlign: "center", background: C.white, borderRadius: 10, border: `2px dashed ${C.gray300}` }}>
              <p style={{ fontSize: 13, color: C.gray400, margin: "0 0 12px" }}>No material order yet. Create from your job budget, generate with AI, or add items manually.</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {hasBudget && <button onClick={handleCreateFromBudget} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: C.green, color: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{I.dollar} Create from Budget</button>}
                <button onClick={handleGenerate} disabled={generating} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`, color: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {generating ? <Spinner size={12} /> : I.zap} Generate with AI
                </button>
                <button onClick={handleAdd} style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{I.plus} Add Manually</button>
              </div>
            </div>
          )}
        </div>
      );
    }


    function LaborOrder({ project, laborOrders, setLaborOrders, onUpdateProject, supers }) {
      const [generating, setGenerating] = useState(false);
      const [editIdx, setEditIdx] = useState(null);
      const hasOrders = laborOrders.length > 0;
      const hasBudget = (project.budgetLineItems || []).length > 0;

      // Create from Budget — pull labor-related budget line items
      const handleCreateFromBudget = () => {
        const budgetItems = project.budgetLineItems || [];
        const laborItems = budgetItems.filter(li => li.category === "Labor");
        if (laborItems.length === 0) {
          alert("No labor line items found in the job budget. Categorize budget items as 'Labor' in the Budget tab first.");
          return;
        }
        const newOrders = laborItems.map(li => ({
          id: generateId(),
          title: li.description || "Labor Order",
          scope: "Scope from budget: " + (li.description || ""),
          sqft: project.sqft || 0,
          minPay: li.amount || 0,
          subcontractor: "TBD — From Approved List",
          startDate: project.startDate || "",
          endDate: "",
          notes: "Created from job budget",
        }));
        setLaborOrders(newOrders);
      };

      const handleGenerate = async () => {
        setGenerating(true);
        try {
          const prompt = `You are a production coordinator for Colony Roofers, a GAF President's Club roofing contractor. Generate labor orders for this project:

Project: ${project.name}
Roof Type: ${project.roofType}
Square Footage: ${project.sqft || "Unknown"}
Buildings: ${project.buildings || 1}
Contract Value: ${project.contractValue ? formatCurrency(project.contractValue) : "Unknown"}

Return ONLY valid JSON (no markdown) as an array of labor orders:
[{"title":"Order Title","scope":"Detailed scope of work description","sqft":${project.sqft || 0},"minPay":<number>,"subcontractor":"TBD — From Approved List","startDate":"${project.startDate || "TBD"}","endDate":"TBD","notes":""}]

Generate separate labor orders for each major work phase (e.g., Tear-Off, Installation, Detail Work). Each order should have a clear scope of work describing exactly what labor is expected. Use realistic minimum pay rates based on the roof type and square footage. The scope should be very detailed — include specific tasks, quality expectations, and cleanup requirements.`;

          const response = await fetch("/api/ai", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
          });
          if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(e.error?.message || "API error"); }
          const result = await response.json();
          const text = result.content?.find(c => c.type === "text")?.text || "";
          const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
          const arr = Array.isArray(parsed) ? parsed : parsed.orders || [];
          const withIds = arr.map(o => ({ ...o, id: generateId() }));
          setLaborOrders(withIds);
        } catch (err) {
          console.error("Labor order generation error:", err);
          alert("Labor order generation failed: " + (err.message || "Unknown error"));
        } finally { setGenerating(false); }
      };

      const handleSave = () => { onUpdateProject({ laborOrders }); };

      const handleAddOrder = () => {
        const newOrder = { id: generateId(), title: "New Labor Order", scope: "", sqft: project.sqft || 0, minPay: 0, subcontractor: "TBD — From Approved List", startDate: project.startDate || "", endDate: "", notes: "" };
        setLaborOrders([...laborOrders, newOrder]);
        setEditIdx(laborOrders.length);
      };

      const handleUpdateOrder = (idx, field, value) => {
        const updated = [...laborOrders];
        updated[idx] = { ...updated[idx], [field]: value };
        setLaborOrders(updated);
      };

      const handleDeleteOrder = (idx) => {
        setLaborOrders(laborOrders.filter((_, i) => i !== idx));
        setEditIdx(null);
      };

      const handleExport = (order) => {
        const content = `LABOR ORDER — ${project.name}
${"═".repeat(60)}
Order: ${order.title}
Date: ${new Date().toLocaleDateString()}
${"─".repeat(60)}

PROJECT INFORMATION
  Project:       ${project.name}
  Address:       ${project.address || "TBD"}
  Roof Type:     ${project.roofType}
  Market:        ${MARKET_LABELS[project.market] || project.market}

ORDER DETAILS
  Square Footage:  ${(order.sqft || 0).toLocaleString()} sq ft
  Minimum Pay:     ${formatCurrency(order.minPay || 0)}
  Subcontractor:   ${order.subcontractor}
  Start Date:      ${order.startDate || "TBD"}
  End Date:        ${order.endDate || "TBD"}

SCOPE OF WORK
${"─".repeat(60)}
${order.scope || "No scope defined."}

${order.notes ? `NOTES\n${"─".repeat(60)}\n${order.notes}` : ""}
${"═".repeat(60)}
Colony Roofers LLC — GAF President's Club Contractor
`;
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `Labor_Order_${order.title.replace(/[^a-zA-Z0-9]/g, "_")}.txt`; a.click();
        URL.revokeObjectURL(url);
      };

      const fs = { width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 14, color: C.navy, outline: "none", boxSizing: "border-box" };
      const ls = { fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4, display: "block" };

      return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: 0 }}>Labor Orders</h4>
            <div style={{ display: "flex", gap: 6 }}>
              {hasBudget && <button onClick={handleCreateFromBudget} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.green}50`, background: C.greenBg, color: C.green, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{I.dollar} From Budget</button>}
              <button onClick={handleGenerate} disabled={generating} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.navy}30`, background: C.navy + "08", color: C.navy, fontSize: 11, fontWeight: 600, cursor: generating ? "default" : "pointer" }}>
                {generating ? <Spinner size={10} color={C.navy} /> : I.zap} {hasOrders ? "Regenerate" : "Generate"} with AI
              </button>
            </div>
          </div>

          {hasOrders ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {laborOrders.map((order, idx) => (
                  <div key={order.id} style={{ borderRadius: 10, border: `1px solid ${editIdx === idx ? C.red + "60" : C.gray200}`, background: C.white, overflow: "hidden" }}>
                    {/* Order header - always visible */}
                    <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: editIdx === idx ? C.redBg + "30" : "transparent" }}
                      onClick={() => setEditIdx(editIdx === idx ? null : idx)}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{order.title}</div>
                        <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>
                          {order.sqft?.toLocaleString()} sq ft · {formatCurrency(order.minPay || 0)} min pay · {order.subcontractor}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={(e) => { e.stopPropagation(); handleExport(order); }} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray500, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Export</button>
                        <span style={{ color: C.gray400, transform: editIdx === idx ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", fontSize: 10 }}>▼</span>
                      </div>
                    </div>

                    {/* Expanded edit form */}
                    {editIdx === idx && (
                      <div style={{ padding: "16px", borderTop: `1px solid ${C.gray200}` }}>
                        <div style={{ display: "grid", gap: 12 }}>
                          <div><label style={ls}>Order Title</label><input style={fs} value={order.title} onChange={e => handleUpdateOrder(idx, "title", e.target.value)} /></div>
                          <div><label style={ls}>Scope of Work</label><textarea style={{ ...fs, minHeight: 100, resize: "vertical" }} value={order.scope} onChange={e => handleUpdateOrder(idx, "scope", e.target.value)} placeholder="Detailed description of labor tasks, quality expectations, and cleanup requirements..." /></div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <div><label style={ls}>Square Footage</label><input style={fs} type="number" value={order.sqft || 0} onChange={e => handleUpdateOrder(idx, "sqft", Number(e.target.value))} /></div>
                            <div><label style={ls}>Minimum Pay</label><input style={fs} type="number" value={order.minPay || 0} onChange={e => handleUpdateOrder(idx, "minPay", Number(e.target.value))} /></div>
                          </div>
                          <div><label style={ls}>Subcontractor</label><select style={fs} value={order.subcontractor || ""} onChange={e => handleUpdateOrder(idx, "subcontractor", e.target.value)}><option value="">Select subcontractor...</option>{VENDOR_CATALOG.labor.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}</select></div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <div><label style={ls}>Start Date</label><input style={fs} type="date" value={order.startDate || ""} onChange={e => handleUpdateOrder(idx, "startDate", e.target.value)} /></div>
                            <div><label style={ls}>End Date</label><input style={fs} type="date" value={order.endDate || ""} onChange={e => handleUpdateOrder(idx, "endDate", e.target.value)} /></div>
                          </div>
                          <div><label style={ls}>Notes</label><textarea style={{ ...fs, minHeight: 50, resize: "vertical" }} value={order.notes || ""} onChange={e => handleUpdateOrder(idx, "notes", e.target.value)} placeholder="Additional notes..." /></div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                          <button onClick={() => handleDeleteOrder(idx)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.red}40`, background: C.redBg, color: C.red, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Delete Order</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={handleAddOrder} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{I.plus} Add Order</button>
                <button onClick={handleSave} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: C.green, color: C.white, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Save All Orders</button>
              </div>
            </>
          ) : (
            <div style={{ padding: "32px 16px", textAlign: "center", background: C.white, borderRadius: 10, border: `2px dashed ${C.gray300}` }}>
              <p style={{ fontSize: 13, color: C.gray400, margin: "0 0 12px" }}>No labor orders yet. Create from your job budget, generate with AI, or add manually.</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {hasBudget && <button onClick={handleCreateFromBudget} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: C.green, color: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{I.dollar} Create from Budget</button>}
                <button onClick={handleGenerate} disabled={generating} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`, color: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {generating ? <Spinner size={12} /> : I.zap} Generate with AI
                </button>
                <button onClick={handleAddOrder} style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{I.plus} Add Manually</button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Orders Tab (combines Material + Labor)

    function OrdersTab({ project, onUpdateProject, supers }) {
      const [activeSection, setActiveSection] = useState("materials");
      const [materials, setMaterials] = useState(project.materialOrder || []);
      const [laborOrders, setLaborOrders] = useState(project.laborOrders || []);

      const handleProjectUpdate = (updates) => { onUpdateProject(updates); };

      const matTotal = materials.reduce((s, m) => s + (m.qty || 0) * (m.unitCost || 0), 0);
      const laborTotal = laborOrders.reduce((s, o) => s + (o.minPay || 0), 0);

      return (
        <div>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ padding: "14px 16px", borderRadius: 10, background: C.white, border: `1px solid ${C.gray200}`, cursor: "pointer", transition: "all 0.15s", borderLeftWidth: 3, borderLeftColor: activeSection === "materials" ? C.blue : C.gray200 }}
              onClick={() => setActiveSection("materials")}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Material Order</p>
              <span style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>{materials.length > 0 ? formatCurrency(matTotal) : "—"}</span>
              <p style={{ fontSize: 11, color: C.gray400, margin: "2px 0 0" }}>{materials.length} line items</p>
            </div>
            <div style={{ padding: "14px 16px", borderRadius: 10, background: C.white, border: `1px solid ${C.gray200}`, cursor: "pointer", transition: "all 0.15s", borderLeftWidth: 3, borderLeftColor: activeSection === "labor" ? C.green : C.gray200 }}
              onClick={() => setActiveSection("labor")}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Labor Orders</p>
              <span style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>{laborOrders.length > 0 ? formatCurrency(laborTotal) : "—"}</span>
              <p style={{ fontSize: 11, color: C.gray400, margin: "2px 0 0" }}>{laborOrders.length} orders</p>
            </div>
          </div>

          {/* Section toggle */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: 3 }}>
            <button onClick={() => setActiveSection("materials")} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, background: activeSection === "materials" ? C.navy : "transparent", color: activeSection === "materials" ? C.white : C.gray500, cursor: "pointer", transition: "all 0.2s" }}>Materials</button>
            <button onClick={() => setActiveSection("labor")} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, background: activeSection === "labor" ? C.navy : "transparent", color: activeSection === "labor" ? C.white : C.gray500, cursor: "pointer", transition: "all 0.2s" }}>Labor</button>
          </div>

          {activeSection === "materials" && <MaterialOrder project={project} materials={materials} setMaterials={setMaterials} onUpdateProject={handleProjectUpdate} />}
          {activeSection === "labor" && <LaborOrder project={project} laborOrders={laborOrders} setLaborOrders={setLaborOrders} onUpdateProject={handleProjectUpdate} supers={supers} />}
        </div>
      );
    }

    // ============================================================
    // DAILY LOGS (Phase 5)
    // ============================================================
    const WEATHER_OPTIONS = ["Clear", "Partly Cloudy", "Overcast", "Light Rain", "Heavy Rain", "Storms", "Wind", "Extreme Heat", "Extreme Cold"];
    const DELAY_CATS = ["Weather", "Material", "Labor", "Access", "Other"];

    function DailyLogEntry({ log, idx, isExpanded, onToggle, phases }) {
      const phaseName = phases?.find(p => p.id === log.phaseId)?.name;
      return (
        <div style={{ borderRadius: 10, border: `1px solid ${C.gray200}`, background: C.white, overflow: "hidden", marginBottom: 8 }}>
          <div onClick={onToggle} style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: isExpanded ? C.gray50 : "transparent" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                {new Date(log.date + "T00:00:00").getDate()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{formatDate(log.date)}</div>
                <div style={{ fontSize: 11, color: C.gray500 }}>
                  {log.crewCount} crew · {log.weather}
                  {log.issues && log.issues.length > 0 && <span style={{ color: C.yellow, fontWeight: 600 }}> · {log.issues.length} issue{log.issues.length > 1 ? "s" : ""}</span>}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {log.photos && log.photos.length > 0 && <span style={{ fontSize: 10, color: C.gray400, background: C.gray100, padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>{log.photos.length} photos</span>}
              <span style={{ color: C.gray400, transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", fontSize: 10 }}>▼</span>
            </div>
          </div>
          {isExpanded && (
            <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.gray100}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12, marginBottom: 14 }}>
                <div style={{ padding: "8px 12px", borderRadius: 8, background: C.gray50 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 2px" }}>Crew</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.navy, margin: 0 }}>{log.crewCount} workers</p>
                  {log.crewNames && <p style={{ fontSize: 11, color: C.gray500, margin: "2px 0 0" }}>{log.crewNames}</p>}
                </div>
                <div style={{ padding: "8px 12px", borderRadius: 8, background: C.gray50 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 2px" }}>Weather</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.navy, margin: 0 }}>{log.weather}</p>
                </div>
              </div>
              {phaseName && <p style={{ fontSize: 11, color: C.blue, fontWeight: 600, marginBottom: 8 }}>Phase: {phaseName}</p>}
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 4px" }}>Work Completed</p>
                <p style={{ fontSize: 12, color: C.navy, margin: 0, lineHeight: 1.5 }}>{log.workCompleted || "—"}</p>
              </div>
              {log.materialsReceived && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 4px" }}>Materials Received</p>
                  <p style={{ fontSize: 12, color: C.navy, margin: 0, lineHeight: 1.5 }}>{log.materialsReceived}</p>
                </div>
              )}
              {log.safetyObs && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 4px" }}>Safety Observations</p>
                  <p style={{ fontSize: 12, color: C.navy, margin: 0, lineHeight: 1.5 }}>{log.safetyObs}</p>
                </div>
              )}
              {log.issues && log.issues.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: C.yellow, textTransform: "uppercase", margin: "0 0 6px" }}>Issues / Delays</p>
                  {log.issues.map((issue, i) => (
                    <div key={i} style={{ padding: "6px 10px", borderRadius: 6, background: C.yellowBg + "60", marginBottom: 4, fontSize: 12 }}>
                      <span style={{ fontWeight: 600, color: C.yellow }}>{issue.category}:</span> <span style={{ color: C.navy }}>{issue.description}</span>
                    </div>
                  ))}
                </div>
              )}
              {log.photos && log.photos.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 6px" }}>Photos ({log.photos.length})</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {log.photos.map((photo, i) => (
                      <div key={i} style={{ width: 72, height: 72, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.gray200}`, position: "relative" }}>
                        <img src={photo.data} alt={photo.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        {photo.caption && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "2px 4px", background: "rgba(0,0,0,0.6)", color: C.white, fontSize: 8, textAlign: "center" }}>{photo.caption}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    function NewLogForm({ onSubmit, onCancel, phases }) {
      const today = new Date().toISOString().split("T")[0];
      const [form, setForm] = useState({ date: today, crewCount: "", crewNames: "", weather: "Clear", workCompleted: "", materialsReceived: "", safetyObs: "", phaseId: phases?.[0]?.id || "", issues: [], photos: [] });
      const [newIssue, setNewIssue] = useState({ category: "Weather", description: "" });
      const photoInputRef = useRef(null);

      const fs = { width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none", boxSizing: "border-box" };
      const ls = { fontSize: 11, fontWeight: 600, color: C.gray600, marginBottom: 4, display: "block" };
      const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

      const addIssue = () => {
        if (!newIssue.description.trim()) return;
        update("issues", [...form.issues, { ...newIssue }]);
        setNewIssue({ category: newIssue.category, description: "" });
      };
      const removeIssue = (i) => update("issues", form.issues.filter((_, idx) => idx !== i));

      const handlePhotos = (files) => {
        Array.from(files).forEach(file => {
          const reader = new FileReader();
          reader.onload = (e) => {
            setForm(f => ({ ...f, photos: [...f.photos, { data: e.target.result, name: file.name, caption: "" }] }));
          };
          reader.readAsDataURL(file);
        });
      };
      const removePhoto = (i) => update("photos", form.photos.filter((_, idx) => idx !== i));
      const updatePhotoCaption = (i, cap) => {
        const p = [...form.photos]; p[i] = { ...p[i], caption: cap };
        update("photos", p);
      };

      const canSubmit = form.date && form.crewCount && form.workCompleted;

      return (
        <div style={{ borderRadius: 12, border: `1px solid ${C.red}40`, background: C.white, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", background: `linear-gradient(135deg, ${C.redDark}, ${C.red})`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>New Daily Log</span>
            <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)" }}>{I.x}</button>
          </div>
          <div style={{ padding: "18px" }}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div><label style={ls}>Date *</label><input style={fs} type="date" value={form.date} onChange={e => update("date", e.target.value)} /></div>
                <div><label style={ls}>Crew Count *</label><input style={fs} type="number" placeholder="0" value={form.crewCount} onChange={e => update("crewCount", e.target.value)} /></div>
                <div><label style={ls}>Weather</label>
                  <select style={fs} value={form.weather} onChange={e => update("weather", e.target.value)}>
                    {WEATHER_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div><label style={ls}>Crew Names</label><input style={fs} placeholder="e.g. Carlos, Miguel, David" value={form.crewNames} onChange={e => update("crewNames", e.target.value)} /></div>
              {phases && phases.length > 0 && (
                <div><label style={ls}>Active Phase</label>
                  <select style={fs} value={form.phaseId} onChange={e => update("phaseId", e.target.value)}>
                    <option value="">— Select phase —</option>
                    {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div><label style={ls}>Work Completed *</label><textarea style={{ ...fs, minHeight: 70, resize: "vertical" }} placeholder="Describe work accomplished today..." value={form.workCompleted} onChange={e => update("workCompleted", e.target.value)} /></div>
              <div><label style={ls}>Materials Received On-Site</label><textarea style={{ ...fs, minHeight: 50, resize: "vertical" }} placeholder="Items, quantities, and condition..." value={form.materialsReceived} onChange={e => update("materialsReceived", e.target.value)} /></div>
              <div><label style={ls}>Safety Observations</label><textarea style={{ ...fs, minHeight: 50, resize: "vertical" }} placeholder="Any safety notes or concerns..." value={form.safetyObs} onChange={e => update("safetyObs", e.target.value)} /></div>

              {/* Issues */}
              <div style={{ borderTop: `1px solid ${C.gray200}`, paddingTop: 12 }}>
                <label style={ls}>Issues / Delays</label>
                {form.issues.map((issue, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, padding: "6px 10px", borderRadius: 6, background: C.yellowBg + "60" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.yellow }}>{issue.category}:</span>
                    <span style={{ fontSize: 11, color: C.navy, flex: 1 }}>{issue.description}</span>
                    <button onClick={() => removeIssue(i)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400, padding: 0, fontSize: 10 }}>✕</button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <select style={{ ...fs, width: 110, flexShrink: 0, fontSize: 11 }} value={newIssue.category} onChange={e => setNewIssue(n => ({ ...n, category: e.target.value }))}>
                    {DELAY_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input style={{ ...fs, fontSize: 11 }} placeholder="Describe the issue..." value={newIssue.description}
                    onChange={e => setNewIssue(n => ({ ...n, description: e.target.value }))}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addIssue(); } }} />
                  <button onClick={addIssue} disabled={!newIssue.description.trim()} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: newIssue.description.trim() ? C.yellow : C.gray200, color: newIssue.description.trim() ? C.white : C.gray400, fontSize: 11, fontWeight: 600, cursor: newIssue.description.trim() ? "pointer" : "default", flexShrink: 0 }}>Add</button>
                </div>
              </div>

              {/* Photos */}
              <div style={{ borderTop: `1px solid ${C.gray200}`, paddingTop: 12 }}>
                <label style={ls}>Photos</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {form.photos.map((photo, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <div style={{ width: 72, height: 72, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.gray200}` }}>
                        <img src={photo.data} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <button onClick={() => removePhoto(i)} style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: C.red, color: C.white, border: "none", cursor: "pointer", fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                      <input style={{ width: 72, padding: "2px 4px", border: `1px solid ${C.gray200}`, borderRadius: 4, fontSize: 9, marginTop: 2, boxSizing: "border-box" }} placeholder="Caption" value={photo.caption} onChange={e => updatePhotoCaption(i, e.target.value)} />
                    </div>
                  ))}
                  <div onClick={() => photoInputRef.current?.click()} style={{ width: 72, height: 72, borderRadius: 6, border: `2px dashed ${C.gray300}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.gray400 }}>
                    <span style={{ fontSize: 18 }}>+</span>
                    <span style={{ fontSize: 9 }}>Photo</span>
                  </div>
                </div>
                <input ref={photoInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => handlePhotos(e.target.files)} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { if (canSubmit) onSubmit({ ...form, id: generateId(), crewCount: Number(form.crewCount) }); }} disabled={!canSubmit}
                style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: canSubmit ? C.red : C.gray300, color: canSubmit ? C.white : C.gray400, fontSize: 13, fontWeight: 600, cursor: canSubmit ? "pointer" : "default", boxShadow: canSubmit ? `0 2px 8px ${C.red}30` : "none" }}>Submit Log</button>
            </div>
          </div>
        </div>
      );
    }

    function DailyLogsTab({ project, onUpdateProject, user }) {
      const [logs, setLogs] = useState(project.dailyLogs || []);
      const [showNewLog, setShowNewLog] = useState(false);
      const [expandedIdx, setExpandedIdx] = useState(null);
      const [viewMode, setViewMode] = useState("list"); // list or gallery
      const phases = project.schedule || [];
      const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));

      const handleSubmit = (log) => {
        const newLogs = [...logs, log];
        setLogs(newLogs);
        onUpdateProject({ dailyLogs: newLogs });
        setShowNewLog(false);
      };

      // Stats
      const totalCrewDays = logs.reduce((s, l) => s + (l.crewCount || 0), 0);
      const totalIssues = logs.reduce((s, l) => s + (l.issues?.length || 0), 0);
      const totalPhotos = logs.reduce((s, l) => s + (l.photos?.length || 0), 0);
      const allPhotos = logs.flatMap(l => (l.photos || []).map(p => ({ ...p, date: l.date })));

      return (
        <div>
          {/* Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: C.white, border: `1px solid ${C.gray200}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2px" }}>Logs</p>
              <span style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{logs.length}</span>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: C.white, border: `1px solid ${C.gray200}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2px" }}>Crew-Days</p>
              <span style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{totalCrewDays}</span>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: C.white, border: `1px solid ${C.gray200}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2px" }}>Issues</p>
              <span style={{ fontSize: 20, fontWeight: 800, color: totalIssues > 0 ? C.yellow : C.green }}>{totalIssues}</span>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: C.white, border: `1px solid ${C.gray200}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2px" }}>Photos</p>
              <span style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{totalPhotos}</span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 4, background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: 3 }}>
              <button onClick={() => setViewMode("list")} style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600, background: viewMode === "list" ? C.navy : "transparent", color: viewMode === "list" ? C.white : C.gray500, cursor: "pointer" }}>Log View</button>
              <button onClick={() => setViewMode("gallery")} style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600, background: viewMode === "gallery" ? C.navy : "transparent", color: viewMode === "gallery" ? C.white : C.gray500, cursor: "pointer" }}>Photo Gallery</button>
            </div>
            {!showNewLog && (
              <button onClick={() => setShowNewLog(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "none", background: C.red, color: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: `0 2px 8px ${C.red}30` }}>{I.plus} New Log</button>
            )}
          </div>

          {/* New log form */}
          {showNewLog && <div style={{ marginBottom: 16 }}><NewLogForm onSubmit={handleSubmit} onCancel={() => setShowNewLog(false)} phases={phases} /></div>}

          {/* Content */}
          {viewMode === "list" ? (
            sortedLogs.length > 0 ? (
              sortedLogs.map((log, i) => (
                <DailyLogEntry key={log.id || i} log={log} idx={i} phases={phases}
                  isExpanded={expandedIdx === i} onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)} />
              ))
            ) : !showNewLog ? (
              <div style={{ padding: "40px 16px", textAlign: "center", background: C.white, borderRadius: 12, border: `2px dashed ${C.gray300}` }}>
                <div style={{ color: C.gray300, marginBottom: 10 }}>{I.clock}</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.gray500, margin: "0 0 6px" }}>No daily logs yet</p>
                <p style={{ fontSize: 12, color: C.gray400, margin: "0 0 16px" }}>Superintendents submit logs for each day of active work.</p>
                <button onClick={() => setShowNewLog(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, border: "none", background: C.red, color: C.white, fontSize: 13, fontWeight: 600, cursor: "pointer", margin: "0 auto" }}>{I.plus} Submit First Log</button>
              </div>
            ) : null
          ) : (
            /* Photo Gallery */
            allPhotos.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
                {allPhotos.map((photo, i) => (
                  <div key={i} style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${C.gray200}`, position: "relative", paddingBottom: "100%" }}>
                    <img src={photo.data} alt={photo.caption || ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 6px", background: "linear-gradient(transparent, rgba(0,0,0,0.7))", color: C.white }}>
                      <p style={{ fontSize: 9, margin: 0, fontWeight: 600 }}>{fmtShort(photo.date)}</p>
                      {photo.caption && <p style={{ fontSize: 8, margin: 0, opacity: 0.8 }}>{photo.caption}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "32px 16px", textAlign: "center", background: C.white, borderRadius: 10, border: `2px dashed ${C.gray300}` }}>
                <p style={{ fontSize: 13, color: C.gray400, margin: 0 }}>No photos yet. Photos will appear here when added to daily logs.</p>
              </div>
            )
          )}
        </div>
      );
    }

    // ============================================================
    // BUDGET TRACKING + MARGIN ALERTS (Phase 6)

    function ExpenseUploader({ onUpload, processing }) {
      const inputRef = useRef(null);
      const [dragOver, setDragOver] = useState(false);
      const handleFiles = (files) => { if (files && files.length > 0) Array.from(files).forEach(f => onUpload(f)); };
      return (
        <div style={{ border: `2px ${dragOver ? "solid" : "dashed"} ${dragOver ? C.red : C.gray300}`, borderRadius: 10, padding: "20px 16px", textAlign: "center", cursor: "pointer", background: dragOver ? C.redBg + "30" : C.white, transition: "all 0.2s" }}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}>
          {processing ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Spinner size={16} color={C.navy} />
              <span style={{ fontSize: 13, color: C.navy, fontWeight: 600 }}>Processing expense document...</span>
            </div>
          ) : (
            <>
              <div style={{ color: C.gray300, marginBottom: 6 }}>{I.upload}</div>
              <p style={{ fontSize: 13, color: C.gray500, margin: "0 0 4px" }}>Upload expense documents (PDF or Excel)</p>
              <p style={{ fontSize: 11, color: C.gray400, margin: 0 }}>From Sage, Ramp, or other sources · AI will parse and categorize</p>
            </>
          )}
          <input ref={inputRef} type="file" accept=".pdf,.xlsx,.xls,.csv" multiple style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
        </div>
      );
    }

    function BudgetTab({ project, onUpdateProject }) {
      const [expenses, setExpenses] = useState(project.expenses || []);
      const [processing, setProcessing] = useState(false);
      const [error, setError] = useState(null);
      const [editIdx, setEditIdx] = useState(null);
      const [showAddManual, setShowAddManual] = useState(false);
      const [manualForm, setManualForm] = useState({ vendor: "", amount: "", date: new Date().toISOString().split("T")[0], category: "Materials", description: "" });
      const [budgetItems, setBudgetItems] = useState(project.budgetLineItems || []);
      const [showBudget, setShowBudget] = useState(true);

      const EXPENSE_CATS = ["Materials", "Labor", "Equipment", "Permits", "Dumpsters", "Forklifts", "Warranty", "Other"];
      const catColors = { Materials: "#3B82F6", Labor: "#10B981", Equipment: "#F59E0B", Permits: "#8B5CF6", Dumpsters: "#EC4899", Forklifts: "#14B8A6", Warranty: "#6366F1", Other: "#94A3B8" };

      // Budget calculations
      const contractValue = project.contractValue || 0;
      const estimatedCost = project.estimatedCost || 0;
      const estimatedMargin = project.estimatedMargin || 0;
      const totalSpent = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const remainingBudget = estimatedCost - totalSpent;
      const currentMarginPct = contractValue > 0 ? Math.round(((contractValue - totalSpent) / contractValue) * 100) : 0;
      const marginDrop = estimatedMargin - currentMarginPct;
      const marginHealth = marginDrop >= 10 ? "critical" : marginDrop >= 5 ? "warning" : "healthy";

      // Category breakdown
      const catBreakdown = EXPENSE_CATS.map(cat => ({
        category: cat,
        total: expenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0),
        count: expenses.filter(e => e.category === cat).length,
        color: catColors[cat],
      })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

      const handleExpenseUpload = async (file) => {
        setProcessing(true); setError(null);
        try {
          const reader = new FileReader();
          const fileData = await new Promise((resolve, reject) => {
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => reject(new Error("File read failed"));
            reader.readAsDataURL(file);
          });

          const base64Data = fileData.split(",")[1];
          const mediaType = file.type || "application/pdf";
          const isExcel = mediaType.includes("spreadsheet") || mediaType.includes("excel") || file.name.match(/\.(xlsx|xls|csv)$/i);

          let contentParts = [];
          if (isExcel) {
            const binaryStr = atob(base64Data);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
            const workbook = XLSX.read(bytes, { type: "array" });
            let csvText = "";
            workbook.SheetNames.forEach(sheetName => { csvText += "=== Sheet: " + sheetName + " ===\n" + XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]) + "\n\n"; });
            contentParts.push({ type: "text", text: "[Expense document: " + file.name + "]\n\n" + csvText });
          } else if (mediaType === "application/pdf") {
            contentParts.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } });
            contentParts.push({ type: "text", text: "[Expense document: " + file.name + "]" });
          }

          contentParts.push({ type: "text", text: `You are a cost tracking assistant for Colony Roofers. Parse this expense document and extract individual expense line items.

Return ONLY valid JSON (no markdown fences) as an array:
[{"vendor":"Vendor Name","amount":<number>,"date":"YYYY-MM-DD","category":"<one of: Materials, Labor, Equipment, Permits, Dumpsters, Forklifts, Warranty, Other>","description":"Brief description"}]

Extract every identifiable expense. Use the most specific category possible. If a date isn't clear, use today's date. Amount should be a positive number.` });

          const response = await fetch("/api/ai", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, messages: [{ role: "user", content: contentParts }] }),
          });
          if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(e.error?.message || "API error " + response.status); }
          const result = await response.json();
          const text = result.content?.find(c => c.type === "text")?.text || "";
          const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
          const arr = Array.isArray(parsed) ? parsed : [];
          const withIds = arr.map(e => ({ ...e, id: generateId(), source: file.name }));
          const newExpenses = [...expenses, ...withIds];
          setExpenses(newExpenses);
          onUpdateProject({ expenses: newExpenses, currentCost: newExpenses.reduce((s, e) => s + (e.amount || 0), 0) });
        } catch (err) {
          console.error("Expense parsing error:", err);
          setError("Failed to parse expense document: " + (err.message || "Unknown error") + ". Try again or add expenses manually.");
        } finally { setProcessing(false); }
      };

      const handleAddManual = () => {
        if (!manualForm.vendor || !manualForm.amount) return;
        const newExp = { ...manualForm, amount: Number(manualForm.amount), id: generateId(), source: "Manual Entry" };
        const newExpenses = [...expenses, newExp];
        setExpenses(newExpenses);
        onUpdateProject({ expenses: newExpenses, currentCost: newExpenses.reduce((s, e) => s + (e.amount || 0), 0) });
        setManualForm({ vendor: "", amount: "", date: new Date().toISOString().split("T")[0], category: "Materials", description: "" });
        setShowAddManual(false);
      };

      const handleDeleteExpense = (id) => {
        const newExpenses = expenses.filter(e => e.id !== id);
        setExpenses(newExpenses);
        onUpdateProject({ expenses: newExpenses, currentCost: newExpenses.reduce((s, e) => s + (e.amount || 0), 0) });
      };

      const handleUpdateExpense = (id, field, value) => {
        const newExpenses = expenses.map(e => e.id === id ? { ...e, [field]: field === "amount" ? Number(value) : value } : e);
        setExpenses(newExpenses);
        onUpdateProject({ expenses: newExpenses, currentCost: newExpenses.reduce((s, e) => s + (e.amount || 0), 0) });
      };

      const fs = { width: "100%", padding: "8px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.navy, outline: "none", boxSizing: "border-box" };

      return (
        <div>
          {/* Margin Alert Banner */}
          {marginHealth !== "healthy" && (
            <div style={{
              padding: "14px 18px", borderRadius: 10, marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
              background: marginHealth === "critical" ? `linear-gradient(135deg, ${C.red}15, ${C.red}08)` : `linear-gradient(135deg, ${C.yellow}15, ${C.yellow}08)`,
              border: `1px solid ${marginHealth === "critical" ? C.red + "40" : C.yellow + "40"}`,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: marginHealth === "critical" ? C.redBg : C.yellowBg, flexShrink: 0 }}>
                <span style={{ color: marginHealth === "critical" ? C.red : C.yellow }}>{I.alert}</span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: marginHealth === "critical" ? C.red : C.yellow }}>
                  {marginHealth === "critical" ? "🔴 Critical: Margin dropped 10%+" : "🟡 Warning: Margin dropped 5%+"}
                </div>
                <div style={{ fontSize: 12, color: C.gray600, marginTop: 2 }}>
                  Estimated margin was {estimatedMargin}% — current margin is {currentMarginPct}% (down {marginDrop} points).
                  {marginHealth === "critical" && " Email alerts sent to Zach and Brayleigh."}
                </div>
              </div>
            </div>
          )}

          {/* Budget Overview Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
            <div style={{ padding: "14px 16px", borderRadius: 10, background: C.white, border: `1px solid ${C.gray200}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2px" }}>Contract Value</p>
              <span style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>{formatCurrency(contractValue)}</span>
            </div>
            <div style={{ padding: "14px 16px", borderRadius: 10, background: C.white, border: `1px solid ${C.gray200}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2px" }}>Cost to Date</p>
              <span style={{ fontSize: 18, fontWeight: 800, color: totalSpent > estimatedCost ? C.red : C.navy }}>{formatCurrency(totalSpent)}</span>
              <p style={{ fontSize: 10, color: C.gray400, margin: "2px 0 0" }}>of {formatCurrency(estimatedCost)} budgeted</p>
            </div>
            <div style={{ padding: "14px 16px", borderRadius: 10, background: C.white, border: `1px solid ${remainingBudget < 0 ? C.red + "30" : C.gray200}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2px" }}>Remaining Budget</p>
              <span style={{ fontSize: 18, fontWeight: 800, color: remainingBudget < 0 ? C.red : C.green }}>{formatCurrency(remainingBudget)}</span>
            </div>
            <div style={{ padding: "14px 16px", borderRadius: 10, background: C.white, border: `1px solid ${marginHealth === "critical" ? C.red + "30" : marginHealth === "warning" ? C.yellow + "30" : C.gray200}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2px" }}>Current Margin</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: marginHealth === "critical" ? C.red : marginHealth === "warning" ? C.yellow : C.green }}>{currentMarginPct}%</span>
                {marginDrop > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: marginHealth === "critical" ? C.red : C.yellow }}>↓{marginDrop}pts</span>}
              </div>
              <p style={{ fontSize: 10, color: C.gray400, margin: "2px 0 0" }}>Est: {estimatedMargin}%</p>
            </div>
          </div>

          {/* Budget Progress Bar */}
          <div style={{ marginBottom: 20, padding: "16px 18px", borderRadius: 10, background: C.white, border: `1px solid ${C.gray200}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>Budget Consumption</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{estimatedCost > 0 ? Math.round((totalSpent / estimatedCost) * 100) : 0}%</span>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: C.gray200, overflow: "hidden", position: "relative" }}>
              <div style={{ height: "100%", borderRadius: 5, width: `${Math.min((totalSpent / (estimatedCost || 1)) * 100, 100)}%`, background: totalSpent > estimatedCost ? C.red : totalSpent > estimatedCost * 0.8 ? C.yellow : C.green, transition: "width 0.6s" }} />
              {/* Warning threshold marker at 80% */}
              <div style={{ position: "absolute", left: "80%", top: -2, bottom: -2, width: 2, background: C.yellow + "80" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: C.gray400 }}>$0</span>
              <span style={{ fontSize: 10, color: C.yellow, fontWeight: 600 }}>80%</span>
              <span style={{ fontSize: 10, color: C.gray400 }}>{formatCurrency(estimatedCost)}</span>
            </div>
          </div>

          {/* Job Budget Line Items — editable from uploaded budget document */}
          {(() => {
            const budgetTotal = budgetItems.reduce((s, li) => s + (li.amount || 0), 0);
            const handleBudgetUpdate = (id, field, value) => {
              const updated = budgetItems.map(li => li.id === id ? { ...li, [field]: field === "amount" ? Number(value) : value } : li);
              setBudgetItems(updated);
              onUpdateProject({ budgetLineItems: updated, estimatedCost: updated.reduce((s, li) => s + (li.amount || 0), 0) });
            };
            const handleBudgetRemove = (id) => {
              const updated = budgetItems.filter(li => li.id !== id);
              setBudgetItems(updated);
              onUpdateProject({ budgetLineItems: updated, estimatedCost: updated.reduce((s, li) => s + (li.amount || 0), 0) });
            };
            const handleBudgetAdd = () => {
              const newItem = { id: generateId(), description: "", amount: 0, category: "Materials" };
              const updated = [...budgetItems, newItem];
              setBudgetItems(updated);
              onUpdateProject({ budgetLineItems: updated });
            };
            if (budgetItems.length === 0) return (
              <div style={{ marginBottom: 20, padding: "20px", borderRadius: 10, border: `2px dashed ${C.gray300}`, textAlign: "center" }}>
                <p style={{ fontSize: 13, color: C.gray400, margin: "0 0 4px", fontWeight: 600 }}>No Job Budget Uploaded</p>
                <p style={{ fontSize: 11, color: C.gray400, margin: 0 }}>Upload a budget document in the Documents tab to see line items here.</p>
              </div>
            );
            return (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <button onClick={() => setShowBudget(!showBudget)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: 0 }}>Job Budget ({budgetItems.length} items)</h4>
                    <span style={{ fontSize: 10, color: C.gray400 }}>{showBudget ? "▲" : "▼"}</span>
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>{formatCurrency(budgetTotal)}</span>
                </div>
                {showBudget && (
                  <>
                    <div style={{ borderRadius: 10, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead><tr style={{ background: C.gray50 }}>
                          <th style={{ padding: "10px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Description</th>
                          <th style={{ padding: "10px 6px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", width: 120 }}>Category</th>
                          <th style={{ padding: "10px 6px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", width: 110 }}>Amount</th>
                          <th style={{ width: 32 }}></th>
                        </tr></thead>
                        <tbody>
                          {budgetItems.map(li => (
                            <tr key={li.id} style={{ borderTop: `1px solid ${C.gray100}` }}>
                              <td style={{ padding: "6px 10px" }}><input value={li.description || ""} onChange={e => handleBudgetUpdate(li.id, "description", e.target.value)} style={{ width: "100%", border: "none", background: "transparent", fontSize: 12, color: C.navy, fontWeight: 500, outline: "none", padding: "4px 0" }} /></td>
                              <td style={{ padding: "6px 6px" }}><select value={li.category || "Materials"} onChange={e => handleBudgetUpdate(li.id, "category", e.target.value)} style={{ width: "100%", border: "none", background: "transparent", fontSize: 11, color: C.gray600, outline: "none" }}>{EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                              <td style={{ padding: "6px 6px", textAlign: "right" }}><input type="number" value={li.amount || 0} onChange={e => handleBudgetUpdate(li.id, "amount", e.target.value)} style={{ width: 90, border: "none", background: "transparent", fontSize: 12, color: C.navy, fontWeight: 700, outline: "none", textAlign: "right", padding: "4px 0" }} /></td>
                              <td style={{ padding: "6px 4px" }}><button onClick={() => handleBudgetRemove(li.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400, padding: 2, fontSize: 10 }}>{I.x}</button></td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot><tr style={{ background: C.gray50 }}>
                          <td colSpan="2" style={{ padding: "10px 10px", textAlign: "right", fontSize: 12, fontWeight: 700, color: C.gray500 }}>Total Estimated Cost:</td>
                          <td style={{ padding: "10px 6px", textAlign: "right", fontSize: 14, fontWeight: 800, color: C.navy }}>{formatCurrency(budgetTotal)}</td>
                          <td></td>
                        </tr></tfoot>
                      </table>
                    </div>
                    <button onClick={handleBudgetAdd} style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{I.plus} Add Line Item</button>
                  </>
                )}
              </div>
            );
          })()}

          {/* Category Breakdown */}
          {catBreakdown.length > 0 && (
            <div style={{ marginBottom: 20, padding: "16px 18px", borderRadius: 10, background: C.white, border: `1px solid ${C.gray200}` }}>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Cost by Category</h4>
              <div style={{ display: "flex", gap: 4, marginBottom: 12, height: 8, borderRadius: 4, overflow: "hidden" }}>
                {catBreakdown.map(c => (
                  <div key={c.category} style={{ width: `${(c.total / totalSpent) * 100}%`, background: c.color, borderRadius: 2, minWidth: 4 }} title={`${c.category}: ${formatCurrency(c.total)}`} />
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {catBreakdown.map(c => (
                  <div key={c.category} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
                      <span style={{ fontSize: 11, color: C.gray600 }}>{c.category}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.navy }}>{formatCurrency(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expense Upload */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: 0 }}>Expenses ({expenses.length})</h4>
              <button onClick={() => setShowAddManual(!showAddManual)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{I.plus} Add Manual</button>
            </div>
            <ExpenseUploader onUpload={handleExpenseUpload} processing={processing} />
          </div>

          {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: C.redBg, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: C.red }}>{I.alert}</span><span style={{ fontSize: 12, color: C.red, fontWeight: 500 }}>{error}</span></div>}

          {/* Manual Add Form */}
          {showAddManual && (
            <div style={{ padding: "16px", borderRadius: 10, border: `1px solid ${C.red}40`, background: C.white, marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.5fr", gap: 8, marginBottom: 10 }}>
                <div><label style={{ fontSize: 10, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 2 }}>Vendor</label><input style={fs} value={manualForm.vendor} onChange={e => setManualForm(f => ({ ...f, vendor: e.target.value }))} placeholder="Vendor name" /></div>
                <div><label style={{ fontSize: 10, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 2 }}>Amount</label><input style={fs} type="number" value={manualForm.amount} onChange={e => setManualForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" /></div>
                <div><label style={{ fontSize: 10, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 2 }}>Date</label><input style={fs} type="date" value={manualForm.date} onChange={e => setManualForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div><label style={{ fontSize: 10, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 2 }}>Category</label><select style={fs} value={manualForm.category} onChange={e => setManualForm(f => ({ ...f, category: e.target.value }))}>{EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              </div>
              <div style={{ marginBottom: 10 }}><label style={{ fontSize: 10, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 2 }}>Description</label><input style={fs} value={manualForm.description} onChange={e => setManualForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" /></div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setShowAddManual(false)} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleAddManual} disabled={!manualForm.vendor || !manualForm.amount} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: manualForm.vendor && manualForm.amount ? C.green : C.gray300, color: manualForm.vendor && manualForm.amount ? C.white : C.gray400, fontSize: 11, fontWeight: 600, cursor: manualForm.vendor && manualForm.amount ? "pointer" : "default" }}>Add Expense</button>
              </div>
            </div>
          )}

          {/* Expense List */}
          {expenses.length > 0 ? (
            <div style={{ borderRadius: 10, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.gray50 }}>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Date</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Vendor</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Description</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Category</th>
                    <th style={{ padding: "10px 8px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Amount</th>
                    <th style={{ width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {[...expenses].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((exp) => (
                    <tr key={exp.id} style={{ borderTop: `1px solid ${C.gray100}` }}>
                      <td style={{ padding: "8px 12px", fontSize: 12, color: C.gray500 }}>{exp.date ? fmtShort(exp.date) : "—"}</td>
                      <td style={{ padding: "8px 8px" }}>
                        {editIdx === exp.id ? <input style={fs} value={exp.vendor} onChange={e => handleUpdateExpense(exp.id, "vendor", e.target.value)} />
                          : <span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{exp.vendor}</span>}
                      </td>
                      <td style={{ padding: "8px 8px" }}>
                        {editIdx === exp.id ? <input style={fs} value={exp.description || ""} onChange={e => handleUpdateExpense(exp.id, "description", e.target.value)} />
                          : <span style={{ fontSize: 11, color: C.gray500 }}>{exp.description || "—"}</span>}
                      </td>
                      <td style={{ padding: "8px 8px" }}>
                        {editIdx === exp.id ? <select style={fs} value={exp.category} onChange={e => handleUpdateExpense(exp.id, "category", e.target.value)}>{EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                          : <span style={{ fontSize: 10, fontWeight: 600, color: catColors[exp.category] || C.gray500, padding: "2px 7px", borderRadius: 4, background: (catColors[exp.category] || C.gray500) + "15" }}>{exp.category}</span>}
                      </td>
                      <td style={{ padding: "8px 8px", textAlign: "right" }}>
                        {editIdx === exp.id ? <input style={{ ...fs, width: 80, textAlign: "right" }} type="number" value={exp.amount} onChange={e => handleUpdateExpense(exp.id, "amount", e.target.value)} />
                          : <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{formatCurrency(exp.amount)}</span>}
                      </td>
                      <td style={{ padding: "8px 4px", display: "flex", gap: 2 }}>
                        <button onClick={() => setEditIdx(editIdx === exp.id ? null : exp.id)} style={{ background: "none", border: "none", cursor: "pointer", color: editIdx === exp.id ? C.green : C.gray400, padding: 2, fontSize: 10 }}>
                          {editIdx === exp.id ? "✓" : "✎"}
                        </button>
                        <button onClick={() => handleDeleteExpense(exp.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray300, padding: 2, fontSize: 10 }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: C.gray50, borderTop: `2px solid ${C.gray200}` }}>
                    <td colSpan="4" style={{ padding: "10px 12px", textAlign: "right", fontSize: 12, fontWeight: 700, color: C.gray500 }}>Total Cost to Date:</td>
                    <td style={{ padding: "10px 8px", textAlign: "right", fontSize: 14, fontWeight: 800, color: C.navy }}>{formatCurrency(totalSpent)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : !showAddManual ? (
            <div style={{ padding: "24px 16px", textAlign: "center", background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}` }}>
              <p style={{ fontSize: 13, color: C.gray400, margin: 0 }}>No expenses recorded yet. Upload a document or add manually above.</p>
            </div>
          ) : null}

          {/* Source tracking */}
          {expenses.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {[...new Set(expenses.map(e => e.source))].map(src => (
                <span key={src} style={{ fontSize: 10, color: C.gray400, padding: "2px 8px", borderRadius: 12, background: C.gray100, fontWeight: 500 }}>
                  {src}: {expenses.filter(e => e.source === src).length} items
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }

    // ============================================================
    // PROJECT DETAIL PANEL (Tabbed)


    function ProjectDetail({ project, onClose, supers, onUpdateProject, user, crews = [] }) {
      const superName = supers.find(s => s.id === project.assignedSuper)?.name || "Unassigned";
      const crewName = project.crewId ? crews.find(c => c.id === project.crewId)?.name || "—" : "—";
      const marginHealth = getMarginHealth(project.estimatedMargin, project.currentMargin);
      const [activeTab, setActiveTab] = useState("overview");
      const [showEmail, setShowEmail] = useState(false);
      const tabs = [
        { id: "overview", label: "Overview" }, { id: "documents", label: "Documents" },
        { id: "schedule", label: "Schedule" }, { id: "orders", label: "Orders" },
        { id: "logs", label: "Daily Logs" }, { id: "budget", label: "Budget" },
        { id: "sov", label: "SOV" },
        { id: "change_orders", label: "Change Orders" }, { id: "safety", label: `Safety ${(project.safetyIncidents || []).filter(s => !s.resolved).length > 0 ? `(${(project.safetyIncidents || []).filter(s => !s.resolved).length})` : ""}` },
        { id: "email", label: "📧 Email" },
      ];
      const Sec = ({ title, children }) => <div style={{ marginBottom: 24 }}><h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>{title}</h4>{children}</div>;
      const Row = ({ label, value, accent }) => <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.gray100}` }}><span style={{ fontSize: 13, color: C.gray500 }}>{label}</span><span style={{ fontSize: 13, fontWeight: 600, color: accent || C.navy }}>{value}</span></div>;
      const handleProjectUpdate = (updates) => { onUpdateProject(project.id, updates); };

      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(17,29,53,0.5)", display: "flex", flexDirection: "column" }}>
          {/* Full-width header */}
          <div style={{ padding: "16px 32px", background: `linear-gradient(135deg, ${C.navyDark}, ${C.navy})`, color: C.white, flexShrink: 0 }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: C.white, padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>← Back</button>
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 6 }}><MarketTag market={project.market} /><StatusBadge status={project.status} /></div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 2px", lineHeight: 1.3 }}>{project.name}</h2>
                  <p style={{ fontSize: 13, opacity: 0.7, margin: 0 }}>{project.client}{project.address ? ` · ${project.address}` : ""}</p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{formatCurrency(project.contractValue || 0)}</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>Contract Value</div>
              </div>
            </div>
          </div>
          {/* Tab Bar */}
          <div style={{ background: C.white, borderBottom: `1px solid ${C.gray200}`, flexShrink: 0 }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "flex", gap: 0, overflowX: "auto" }}>
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => !tab.disabled && setActiveTab(tab.id)} style={{ padding: "12px 18px", border: "none", background: "none", cursor: tab.disabled ? "default" : "pointer", fontSize: 13, fontWeight: 600, color: tab.disabled ? C.gray300 : activeTab === tab.id ? C.red : C.gray500, borderBottom: `2px solid ${activeTab === tab.id ? C.red : "transparent"}`, transition: "all 0.2s", whiteSpace: "nowrap", opacity: tab.disabled ? 0.5 : 1 }}>
                  {tab.label}{tab.disabled && <span style={{ fontSize: 9, background: C.gray200, color: C.gray400, padding: "1px 5px", borderRadius: 3, marginLeft: 4 }}>Soon</span>}
                </button>
              ))}
            </div>
          </div>
          {/* Tab Content */}
          <div style={{ flex: 1, overflowY: "auto", background: C.gray50 }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 32px" }}>
              {activeTab === "overview" && (<>
                <Sec title="Progress">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: C.navy }}>{project.progress}%</span>
                    <MarginBadge estimated={project.estimatedMargin} current={project.currentMargin} />
                  </div>
                  <ProgressBar value={project.progress} color={project.status === "Delayed" ? C.yellow : C.green} />
                </Sec>
                <Sec title="Financial Summary">
                  <Row label="Contract Value" value={formatCurrency(project.contractValue || 0)} />
                  <Row label="Estimated Cost" value={formatCurrency(project.estimatedCost || 0)} />
                  <Row label="Cost to Date" value={formatCurrency(project.currentCost || 0)} />
                  <Row label="Remaining Budget" value={formatCurrency((project.estimatedCost || 0) - (project.currentCost || 0))} accent={(project.currentCost || 0) > (project.estimatedCost || 0) ? C.red : C.green} />
                  <Row label="Est. Margin" value={`${project.estimatedMargin}%`} />
                  <Row label="Current Margin" value={`${project.contractValue ? Math.round(((project.contractValue - (project.currentCost || 0)) / project.contractValue) * 100) : 0}%`} accent={marginHealth === "critical" ? C.red : marginHealth === "warning" ? C.yellow : C.green} />
                </Sec>
                <Sec title="Project Details">
                  <Row label="Address" value={project.address || "—"} />
                  <Row label="Roof Type" value={project.roofType} />
                  <Row label="Square Footage" value={project.sqft?.toLocaleString() || "—"} />
                  <Row label="Buildings" value={project.buildings} />
                  <Row label="Superintendent" value={superName} />
                  {/* Enhancement 2: Crew Assignment */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.gray100}` }}>
                    <span style={{ fontSize: 13, color: C.gray500 }}>Crew</span>
                    <select value={project.crewId || ""} onChange={e => {
                      const selectedCrew = crews.find(c => c.id === e.target.value);
                      if (selectedCrew) {
                        handleProjectUpdate({ crewId: selectedCrew.id, crewName: selectedCrew.name });
                        // Update crew's currentProjectId
                      }
                    }} style={{ fontSize: 12, padding: "6px 10px", border: `1px solid ${C.gray300}`, borderRadius: 4, color: C.navy, outline: "none", background: C.white, cursor: "pointer" }}>
                      <option value="">Unassigned</option>
                      {crews.filter(c => c.market === project.market).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </Sec>
                <Sec title="Timeline">
                  <Row label="Start Date" value={project.startDate ? formatDate(project.startDate) : "—"} />
                  <Row label="Est. Completion" value={project.estCompletion ? formatDate(project.estCompletion) : "—"} />
                </Sec>
              </>)}
              {activeTab === "documents" && <DocumentsTab project={project} onUpdateProject={handleProjectUpdate} />}
              {activeTab === "schedule" && <ScheduleTab project={project} onUpdateProject={handleProjectUpdate} />}
              {activeTab === "orders" && <OrdersTab project={project} onUpdateProject={handleProjectUpdate} supers={supers} />}
              {activeTab === "logs" && <DailyLogsTab project={project} onUpdateProject={handleProjectUpdate} user={user} />}
              {activeTab === "budget" && <BudgetTab project={project} onUpdateProject={handleProjectUpdate} />}
              {activeTab === "sov" && (<div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Schedule of Values</h4>
                <p style={{ fontSize: 12, color: C.gray500, marginBottom: 16 }}>Manage and export the Schedule of Values for progress billing on this project.</p>
                <SovEditor leadId={project.leadId || project.id} projectName={project.name} estimatedValue={project.contractValue || 0} user={user} />
              </div>)}
              {activeTab === "change_orders" && <ChangeOrderTab project={project} onUpdateProject={handleProjectUpdate} user={user} />}
              {activeTab === "safety" && <SafetyTab project={project} onUpdateProject={handleProjectUpdate} user={user} />}
              {activeTab === "email" && (
                <div>
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: "0 0 8px" }}>Send Email for {project.name}</h3>
                    <p style={{ fontSize: 13, color: C.gray500, margin: 0 }}>Compose and send an email related to this project. Emails and replies are logged to the activity feed.</p>
                  </div>
                  <EmailCompose
                    defaultSubject={`Colony Roofers — ${project.name}`}
                    defaultBody={`Hey,\n\nHope all is well. Following up on ${project.name}.\n\n\n\nZach Reece, Owner\nColony Roofers\n404-806-0956`}
                    entityType="project" entityId={project.id} entityName={project.name}
                    onSent={(emailData) => {
                      handleProjectUpdate({ emailLog: [...(project.emailLog || []), emailData] });
                    }}
                  />
                  {/* Email log */}
                  {(project.emailLog || []).length > 0 && (
                    <div style={{ marginTop: 24 }}>
                      <h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Email History ({project.emailLog.length})</h4>
                      {project.emailLog.slice().reverse().map((e, i) => (
                        <div key={i} style={{ padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.gray200}`, marginBottom: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{e.subject}</span>
                            <span style={{ fontSize: 10, color: C.gray400 }}>{new Date(e.sentAt).toLocaleString()}</span>
                          </div>
                          <div style={{ fontSize: 11, color: C.gray500 }}>To: {e.to}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ============================================================
    // PROJECT CARD
    // ============================================================

    function ProjectCard({ project, onClick, supers, onArchive, isAdmin }) {
      const superName = supers.find(s => s.id === project.assignedSuper)?.name || "Unassigned";
      const marginHealth = getMarginHealth(project.estimatedMargin, project.currentMargin);
      const marginColor = marginHealth === "critical" ? C.red : marginHealth === "warning" ? C.yellow : C.green;
      return (
        <div onClick={onClick} style={{ background: C.white, borderRadius: 12, border: `1px solid ${project.archived ? C.gray300 : C.gray200}`, padding: "20px 22px", cursor: "pointer", transition: "all 0.2s", opacity: project.archived ? 0.7 : 1 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.red + "60"; e.currentTarget.style.boxShadow = `0 4px 20px ${C.navy}10`; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = project.archived ? C.gray300 : C.gray200; e.currentTarget.style.boxShadow = "none"; }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><MarketTag market={project.market} /><StatusBadge status={project.status} />{project.archived && <span style={{ padding: "4px 8px", borderRadius: 6, background: C.gray200, color: C.gray500, fontSize: 11, fontWeight: 600 }}>Archived</span>}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <MarginBadge estimated={project.estimatedMargin} current={project.currentMargin} />
              {isAdmin && <button onClick={e => { e.stopPropagation(); onArchive(project.id); }} title={project.archived ? "Restore" : "Archive"} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400, padding: 4, borderRadius: 4, marginLeft: 2 }}
                onMouseEnter={e => e.currentTarget.style.color = C.navy}
                onMouseLeave={e => e.currentTarget.style.color = C.gray400}>
                <Ic d={project.archived ? <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1014.85-3.36L23 6M1 4l4.64 4.36"/></> : <><path d="M21 8V21H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></>} size={14} />
              </button>}
            </div>
          </div>
        </div>
      );
    }

    function ProductionModule({ user: appUser, role }) {
      const PROD_USERS = [
        { id: "u1", name: "Zach", email: "zach@colonyroofers.com", role: "admin", initials: "ZC" },
        { id: "u1b", name: "Zach", email: "zachreececpa@gmail.com", role: "admin", initials: "ZC" },
        { id: "u2", name: "Brayleigh Gardner", email: "brayleigh@colonyroofers.com", role: "coordinator", initials: "BG" },
        { id: "u3", name: "Lucio Martinez", email: "lucio@colonyroofers.com", role: "superintendent", initials: "LM" },
        { id: "u4", name: "Derrick Newsome", email: "derrick@colonyroofers.com", role: "superintendent", initials: "DN" },
      ];
      const user = PROD_USERS.find(u => u.email === appUser?.email) || { id: "u1", name: appUser?.name || "User", email: appUser?.email, role: role, initials: (appUser?.name || "U")[0] };
      const [projectsData, saveProjectsFS, projectsLoaded] = useFirestoreCollection(STORAGE_KEY, INITIAL_PROJECTS, stripDocsForStorage);
      const projectsRef = useRef(projectsData);
      projectsRef.current = projectsData;
      const setProjects = useCallback((updater) => {
        const next = typeof updater === "function" ? updater(projectsRef.current) : updater;
        saveProjectsFS(next);
      }, [saveProjectsFS]);
      const projects = projectsData;

      const [usersData, saveUsersFS, usersLoaded] = useFirestoreCollection(USERS_STORAGE_KEY, USERS.map(u => ({ ...u })));
      const usersRef = useRef(usersData);
      usersRef.current = usersData;
      const setManagedUsers = useCallback((updater) => {
        const next = typeof updater === "function" ? updater(usersRef.current) : updater;
        saveUsersFS(next);
      }, [saveUsersFS]);
      const managedUsers = usersData;
      const [marketFilter, setMarketFilter] = useState("All");
      const [statusFilter, setStatusFilter] = useState("All");
      const [search, setSearch] = useState("");
      const [showCreate, setShowCreate] = useState(false);
      const [selectedProjectId, setSelectedProjectId] = useState(null);
      const [showArchived, setShowArchived] = useState(false);
      const [showUserMgmt, setShowUserMgmt] = useState(false);

      // Enhancement 2: Crews
      const [crews, saveCrews] = useFirestoreCollection("cr_crews", []);
      const crewsRef = useRef(crews);
      crewsRef.current = crews;
      const setCrews = useCallback((updater) => {
        const next = typeof updater === "function" ? updater(crewsRef.current) : updater;
        saveCrews(next);
      }, [saveCrews]);
      const [prodView, setProdView] = useState("projects"); // "projects" | "crews" | "schedule"
      const [showAddCrew, setShowAddCrew] = useState(false);

      // Enhancement 3: Weather
      const [weather, setWeather] = useState({});
      useEffect(() => {
        const key = window.__WEATHER_API_KEY || "";
        if (!key) return;
        const coords = { ATL: [33.749, -84.388], TPA: [27.951, -82.457], DFW: [32.777, -96.797] };
        Promise.all(MARKETS.map(m =>
          fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${coords[m][0]}&lon=${coords[m][1]}&appid=${key}&units=imperial&cnt=40`)
            .then(r => r.json()).then(d => [m, d]).catch(() => [m, null])
        )).then(results => {
          const w = {};
          results.forEach(([m, d]) => { if (d?.list) w[m] = d.list; });
          setWeather(w);
        });
      }, []);

      const supers = managedUsers.filter(u => u.role === "superintendent");
      const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;

      // Firestore sync is handled by useFirestoreCollection hook

      const roleFiltered = user.role === "superintendent" ? projects.filter(p => p.assignedSuper === user.id) : projects;
      const activeOrArchived = roleFiltered.filter(p => showArchived ? p.archived : !p.archived);
      const filtered = activeOrArchived.filter(p => {
        if (marketFilter !== "All" && p.market !== marketFilter) return false;
        if (statusFilter !== "All" && p.status !== statusFilter) return false;
        if (search && !(p.name || "").toLowerCase().includes(search.toLowerCase()) && !(p.client || "").toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
      const liveProjects = roleFiltered.filter(p => !p.archived);
      const archivedCount = roleFiltered.filter(p => p.archived).length;
      const activeProjects = liveProjects.filter(p => p.status !== "Complete");
      const totalContractValue = liveProjects.reduce((s, p) => s + (p.contractValue || 0), 0);
      const delayedCount = liveProjects.filter(p => p.status === "Delayed").length;
      const atRisk = liveProjects.filter(p => getMarginHealth(p.estimatedMargin, p.currentMargin) !== "healthy").length;
      const handleCreate = (np) => { setProjects(prev => [np, ...prev]); setShowCreate(false); };
      const handleUpdateProject = (pid, updates) => { setProjects(prev => prev.map(p => p.id === pid ? { ...p, ...updates } : p)); };
      const handleArchive = (pid) => { setProjects(prev => prev.map(p => p.id === pid ? { ...p, archived: !p.archived } : p)); };

      const isAdmin = user.role === "admin" || user.role === "coordinator";

      return (
        <div style={{ background: C.gray50, minHeight: "calc(100vh - 56px)" }}>

          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
            {/* Weather Bar - Enhancement 3 */}
            {Object.keys(weather).length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
                {MARKETS.map(m => {
                  const list = weather[m] || [];
                  if (list.length === 0) return null;
                  const today = list.slice(0, 8).reduce((acc, f) => acc && f.main === list[0].main ? acc : list[0], null);
                  const high = Math.max(...list.slice(0, 8).map(f => f.main.temp));
                  const low = Math.min(...list.slice(0, 8).map(f => f.main.temp));
                  const precip = Math.max(...list.slice(0, 8).map(f => f.pop || 0)) * 100;
                  const cond = list[0].main.main || "Clear";
                  const emojis = { Clear: "☀️", Clouds: "⛅", Rain: "🌧️", Thunderstorm: "⛈️", Snow: "❄️" };
                  const emoji = emojis[cond] || "🌤️";
                  const hasWarning = precip > 50 || Math.max(...list.slice(0, 8).map(f => f.wind?.speed || 0)) > 25;
                  return (
                    <div key={m} style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 10, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14, fontWeight: 600, color: C.navy }}>
                        <span>{MARKET_LABELS[m]}</span>
                        <span>{emoji}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.gray600, marginBottom: 6 }}>High {Math.round(high)}°F / Low {Math.round(low)}°F</div>
                      <div style={{ fontSize: 12, color: C.gray600 }}>Precip: {Math.round(precip)}%</div>
                      {hasWarning && <div style={{ fontSize: 11, color: C.red, marginTop: 8, fontWeight: 600 }}>⚠️ {MARKET_LABELS[m]}: Weather alert — review schedule</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, margin: 0, letterSpacing: "-0.02em" }}>Production Dashboard</h1>
                <p style={{ fontSize: 14, color: C.gray500, margin: "4px 0 0" }}>{user.role === "superintendent" ? "Your assigned projects" : "All large projects across Atlanta, Tampa & Dallas"}</p>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {/* Enhancement 2 & 5: View Toggle */}
                <div style={{ display: "flex", gap: 4, background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: 3 }}>
                  {["projects", "crews", "schedule"].map(v => (
                    <button key={v} onClick={() => setProdView(v)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, background: prodView === v ? C.navy : "transparent", color: prodView === v ? C.white : C.gray500, cursor: "pointer", transition: "all 0.2s" }}>
                      {v === "projects" ? "Projects" : v === "crews" ? "Crews" : "Schedule"}
                    </button>
                  ))}
                </div>
                {user.role !== "superintendent" && prodView === "projects" && (
                  <button onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, color: C.white, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 12px ${C.red}30` }}>{I.plus} New Project</button>
                )}
                {user.role !== "superintendent" && prodView === "crews" && (
                  <button onClick={() => setShowAddCrew(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, color: C.white, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 12px ${C.red}30` }}>{I.plus} Add Crew</button>
                )}
              </div>
            </div>

            {/* Stats - Enhancement 10: Days Since Last Incident */}
            {(() => {
              const allIncidents = roleFiltered.flatMap(p => (p.safetyIncidents || []).map(i => ({ ...i, projectId: p.id })));
              const lastIncident = allIncidents.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
              const daysSinceLast = lastIncident ? Math.floor((new Date() - new Date(lastIncident.date)) / (1000 * 86400)) : null;
              const daysColor = daysSinceLast === null ? C.green : daysSinceLast > 30 ? C.green : daysSinceLast > 7 ? C.yellow : C.red;
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 28 }}>
                  <StatCard label="Active Projects" value={activeProjects.length} sub={`${roleFiltered.length} total`} icon={I.building} accent={C.navy} />
                  <StatCard label="Total Contract Value" value={formatCurrency(totalContractValue)} icon={I.dollar} accent={C.green} />
                  <StatCard label="Delayed" value={delayedCount} sub={delayedCount > 0 ? "Needs attention" : "All on track"} icon={I.clock} accent={delayedCount > 0 ? C.yellow : C.green} />
                  <StatCard label="Margin At Risk" value={atRisk} sub={atRisk > 0 ? "Review budgets" : "All healthy"} icon={I.alert} accent={atRisk > 0 ? C.red : C.green} />
                  <StatCard label="Days Since Incident" value={daysSinceLast !== null ? daysSinceLast : "∞"} sub={daysSinceLast === null ? "No incidents" : daysSinceLast > 30 ? "Safe" : "Monitor"} icon={I.alert} accent={daysColor} />
                </div>
              );
            })()}

            {/* Filters - Projects/Schedule view only */}
            {prodView !== "crews" && (
              <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, flex: "1 1 240px", maxWidth: 320 }}>
                  <span style={{ color: C.gray400 }}>{I.search}</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects or clients..." style={{ border: "none", outline: "none", fontSize: 13, color: C.navy, width: "100%", background: "transparent" }} />
                </div>
                <div style={{ display: "flex", gap: 4, background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: 3 }}>
                  {["All", ...MARKETS].map(m => <button key={m} onClick={() => setMarketFilter(m)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, background: marketFilter === m ? C.navy : "transparent", color: marketFilter === m ? C.white : C.gray500, cursor: "pointer", transition: "all 0.2s" }}>{m === "All" ? "All Markets" : MARKET_LABELS[m]}</button>)}
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: "8px 32px 8px 14px", border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: C.gray600, background: C.white, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
                  <option value="All">All Statuses</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span style={{ fontSize: 12, color: C.gray400, fontWeight: 500 }}>{filtered.length} project{filtered.length !== 1 ? "s" : ""}</span>
                {isAdmin && (
                  <button onClick={() => setShowArchived(!showArchived)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 6, border: `1px solid ${showArchived ? C.navy + "40" : C.gray200}`, background: showArchived ? C.navy + "08" : C.white, color: showArchived ? C.navy : C.gray500, fontSize: 11, fontWeight: 600, cursor: "pointer", marginLeft: "auto" }}>
                  {showArchived ? "← Active Projects" : `Archived (${archivedCount})`}
                </button>
                )}
              </div>
            )}

            {/* Projects View */}
            {prodView === "projects" && (
              filtered.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                  {filtered.map(p => <ProjectCard key={p.id} project={p} supers={supers} onClick={() => setSelectedProjectId(p.id)} onArchive={handleArchive} isAdmin={isAdmin} />)}
                </div>
              ) : (
                <div style={{ padding: "60px 0", textAlign: "center", background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}` }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: C.gray500, margin: "0 0 4px" }}>No projects found</p>
                  <p style={{ fontSize: 13, color: C.gray400, margin: 0 }}>Try adjusting your filters or create a new project</p>
                </div>
              )
            )}

            {/* Enhancement 2: Crews View */}
            {prodView === "crews" && (
              <div>
                {crews.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                    {crews.map(crew => (
                      <div key={crew.id} style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 12, padding: 16, position: "relative" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                          <div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: 0 }}>{crew.name}</h3>
                            <p style={{ fontSize: 12, color: C.gray500, margin: "4px 0 0" }}>{crew.foreman?.name || "TBD"}</p>
                          </div>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: crew.currentProjectId ? C.green : C.gray300 }} />
                        </div>
                        {crew.foreman?.phone && <p style={{ fontSize: 11, color: C.gray600, margin: 0, cursor: "pointer", textDecoration: "underline" }}>{crew.foreman.phone}</p>}
                        <div style={{ display: "flex", gap: 8, margin: "12px 0 8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, fontWeight: 600, background: C.gray100, color: C.gray600, padding: "2px 8px", borderRadius: 4 }}>{crew.members?.length || 0} members</span>
                          <MarketTag market={crew.market} />
                        </div>
                        <p style={{ fontSize: 11, color: C.gray600, margin: 0 }}>{crew.currentProjectId ? "On assignment" : "Unassigned"}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "60px 0", textAlign: "center", background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}` }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: C.gray500, margin: "0 0 4px" }}>No crews yet</p>
                    <p style={{ fontSize: 13, color: C.gray400, margin: 0 }}>Create crews to assign to projects</p>
                  </div>
                )}
              </div>
            )}

            {/* Enhancement 5: Schedule View - Mobile fallback */}
            {prodView === "schedule" && (
              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, padding: 20 }}>
                <p style={{ fontSize: 13, color: C.gray500, margin: 0 }}>Schedule view — build canvas Gantt chart as needed</p>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {filtered.slice(0, 5).map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderBottom: `1px solid ${C.gray100}` }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: C.navy, margin: 0 }}>{p.name}</p>
                        <p style={{ fontSize: 10, color: C.gray500, margin: "2px 0 0" }}>{p.progress}% complete</p>
                      </div>
                      <ProgressBar value={p.progress} color={p.status === "Delayed" ? C.yellow : C.green} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={handleCreate} supers={supers} />}
          {selectedProject && <ProjectDetail project={selectedProject} onClose={() => setSelectedProjectId(null)} supers={supers} onUpdateProject={handleUpdateProject} user={user} crews={crews} />}

          {/* Enhancement 2: Add Crew Modal */}
          {showAddCrew && (
            <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }} onClick={() => setShowAddCrew(false)}>
              <div style={{ background: C.white, borderRadius: 16, width: 520, maxHeight: "85vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: "24px 28px 20px", borderBottom: `1px solid ${C.gray200}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: C.white, zIndex: 1, borderRadius: "16px 16px 0 0" }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>Add Crew</h2>
                    <p style={{ fontSize: 13, color: C.gray500, margin: "2px 0 0" }}>Create a new crew with foreman and members</p>
                  </div>
                  <button onClick={() => setShowAddCrew(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400 }}>{I.x}</button>
                </div>
                <div style={{ padding: "20px 28px 28px" }}>
                  {(() => {
                    const [form, setForm] = useState({ name: "", foreman: { name: "", phone: "", email: "" }, market: "ATL", members: [] });
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Crew Name</label>
                          <input style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 13, color: C.navy, outline: "none" }} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Crew Alpha" />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Market</label>
                          <select style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 13, color: C.navy, outline: "none" }} value={form.market} onChange={e => setForm({...form, market: e.target.value})}>
                            {MARKETS.map(m => <option key={m} value={m}>{MARKET_LABELS[m]}</option>)}
                          </select>
                        </div>
                        <div style={{ padding: 12, background: C.gray50, borderRadius: 8, border: `1px solid ${C.gray200}` }}>
                          <h4 style={{ fontSize: 12, fontWeight: 700, color: C.navy, margin: "0 0 10px" }}>Foreman</h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <input style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.navy, outline: "none" }} value={form.foreman.name} onChange={e => setForm({...form, foreman: {...form.foreman, name: e.target.value}})} placeholder="Name" />
                            <input style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.navy, outline: "none" }} value={form.foreman.phone} onChange={e => setForm({...form, foreman: {...form.foreman, phone: e.target.value}})} placeholder="Phone" />
                            <input style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.navy, outline: "none" }} value={form.foreman.email} onChange={e => setForm({...form, foreman: {...form.foreman, email: e.target.value}})} placeholder="Email" />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button onClick={() => setShowAddCrew(false)} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                          <button onClick={() => {
                            if (form.name && form.foreman.name) {
                              setCrews(prev => [...prev, { ...form, id: generateId(), status: "active", currentProjectId: null, createdAt: new Date().toISOString() }]);
                              setShowAddCrew(false);
                            }
                          }} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: form.name && form.foreman.name ? `linear-gradient(135deg, ${C.red}, ${C.redDark})` : C.gray300, color: C.white, fontSize: 12, fontWeight: 600, cursor: form.name && form.foreman.name ? "pointer" : "default" }}>Create Crew</button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* User Management Modal */}
          {showUserMgmt && (
            <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }} onClick={() => setShowUserMgmt(false)}>
              <div style={{ background: C.white, borderRadius: 16, width: 520, maxHeight: "85vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: "24px 28px 20px", borderBottom: `1px solid ${C.gray200}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: C.white, zIndex: 1, borderRadius: "16px 16px 0 0" }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>User Permissions</h2>
                    <p style={{ fontSize: 13, color: C.gray500, margin: "2px 0 0" }}>Manage team access and roles</p>
                  </div>
                  <button onClick={() => setShowUserMgmt(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400 }}>{I.x}</button>
                </div>
                <div style={{ padding: "20px 28px 28px" }}>
                  <p style={{ fontSize: 11, color: C.gray400, marginBottom: 16, fontWeight: 500 }}>In production, users are managed via Firebase Auth + Firestore. This panel controls role assignments and project visibility.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {managedUsers.map((u, idx) => (
                      <div key={u.id} style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${C.gray200}`, display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{u.initials}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: C.gray500 }}>{u.email}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          <select value={u.role} onChange={e => {
                            const updated = [...managedUsers];
                            updated[idx] = { ...updated[idx], role: e.target.value };
                            setManagedUsers(updated);
                          }} style={{ padding: "5px 24px 5px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 11, fontWeight: 600, color: C.navy, background: C.white, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}>
                            <option value="admin">Admin</option>
                            <option value="coordinator">Coordinator</option>
                            <option value="superintendent">Superintendent</option>
                          </select>
                          <span style={{ fontSize: 10, color: C.gray400 }}>
                            {u.role === "admin" ? "Full access, all markets" : u.role === "coordinator" ? "Full access, all markets" : "Assigned projects only"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 20, padding: "16px", borderRadius: 10, border: `2px dashed ${C.gray300}`, textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: C.gray400, margin: "0 0 4px", fontWeight: 500 }}>Need to add a team member?</p>
                    <p style={{ fontSize: 11, color: C.gray400, margin: 0 }}>In production, invite users via email through Firebase Auth. They'll appear here once they sign in with Google.</p>
                  </div>

                  <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 10, background: C.gray50, border: `1px solid ${C.gray200}` }}>
                    <h4 style={{ fontSize: 12, fontWeight: 700, color: C.navy, margin: "0 0 8px" }}>Role Permissions</h4>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: C.gray500, fontWeight: 600 }}>Admin</span>
                        <span style={{ color: C.gray400 }}>All features + user management + margin alerts</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: C.gray500, fontWeight: 600 }}>Coordinator</span>
                        <span style={{ color: C.gray400 }}>All features + margin alerts</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: C.gray500, fontWeight: 600 }}>Superintendent</span>
                        <span style={{ color: C.gray400 }}>Assigned projects: logs, schedule, orders, budget view</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ============================================================
    // MODULE: PRODUCT CATALOG (Products, Vendors, Assemblies, Systems)

export default ProductionModule;
