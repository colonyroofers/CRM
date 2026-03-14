import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { C } from '../utils/constants';
import { I, StatusBadge, MarginBadge, MarketTag, ProgressBar, StatCard, getMarginHealth } from '../components/shared';
import { generateId, formatCurrency, fmt, MARKETS, MARKET_LABELS, MODULE_ICONS, ROLE_PRESETS, DEFAULT_MATERIALS, DEFAULT_LABOR, DEFAULT_EQUIPMENT, DEFAULT_FINANCIALS, EMPTY_BUILDING, TPO_DEFAULT_LABOR, TPO_DEFAULT_EQUIPMENT } from '../utils/constants';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { getFirestoreDb } from '../utils/firebase';
import VendorPricingRequests from '../components/VendorPricingRequests';
import ProposalGenerator from '../components/ProposalGenerator';
import EmailCompose from '../components/EmailCompose';
import DocumentUpload from '../components/DocumentUpload';
import DocumentList from '../components/DocumentList';

    function EstimatingModule({ user, role, entities, salesLeads, setSalesLeads, crmUsers }) {
      const { companies, properties, contacts } = entities || {};
      const [view, setView] = useState("kanban"); // "kanban" | "new" | "submissions"
      const [submissions, setSubmissions] = useState([]);
      const [loading, setLoading] = useState(true);

      // New estimate state
      const [selectedLeadId, setSelectedLeadId] = useState("");
      const [estimateRoofType, setEstimateRoofType] = useState(""); // Shingle, Tile, TPO, Combo
      const [buildings, setBuildings] = useState([{ ...EMPTY_BUILDING, id: "b1" }]);
      const [materials, setMat] = useState({ ...DEFAULT_MATERIALS });
      const [labor, setLab] = useState({ ...DEFAULT_LABOR });
      const [equipment, setEquip] = useState({ ...DEFAULT_EQUIPMENT });
      const [financials, setFin] = useState({ ...DEFAULT_FINANCIALS });
      const [step, setStep] = useState(1);
      const [saving, setSaving] = useState(false);
      const [showEmail, setShowEmail] = useState(null);
      const [roofRProcessing, setRoofRProcessing] = useState(false);
      const [roofRError, setRoofRError] = useState(null);
      const roofRInputRef = useRef(null);
      const [showAwardPicker, setShowAwardPicker] = useState(null);
      const [filter, setFilter] = useState("all");
      const [trackerSort, setTrackerSort] = useState("date");
      const [expandedEstimate, setExpandedEstimate] = useState(null);
      const [draggedJobId, setDraggedJobId] = useState(null);
      const [selectedKanbanJob, setSelectedKanbanJob] = useState(null);
      const [showProposalGen, setShowProposalGen] = useState(null); // estimate id
      const [proposalSystem, setProposalSystem] = useState("");
      const [proposalSOW, setProposalSOW] = useState("");
      const [editingEstimateId, setEditingEstimateId] = useState(null); // id of estimate being edited
      // TPO / Beam AI state
      const [tpoAssemblies, setTpoAssemblies] = useState([]);
      const [tpoLabor, setTpoLabor] = useState({ ...TPO_DEFAULT_LABOR });
      const [tpoEquip, setTpoEquip] = useState({ ...TPO_DEFAULT_EQUIPMENT });
      const [beamAiProcessing, setBeamAiProcessing] = useState(false);
      const [beamAiError, setBeamAiError] = useState(null);
      const beamAiInputRef = useRef(null);
      const [catalogSystems] = useFirestoreCollection("cr_systems", []);

      const handleKanbanDragStart = (e, jobId) => { setDraggedJobId(jobId); e.dataTransfer.effectAllowed = "move"; };
      const handleKanbanDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
      const handleKanbanDrop = (e, targetColId) => {
        e.preventDefault();
        if (!draggedJobId) return;
        const job = estimatingJobs.find(j => j.id === draggedJobId);
        if (!job) { setDraggedJobId(null); return; }
        const jobEsts = estimatesForLead(job.id);
        const jobApproved = approvedForLead(job.id);
        const jobPending = pendingForLead(job.id);
        // Determine current column using estimatingPhase or computed
        const getCol = (j) => {
          if (j.estimatingPhase) return j.estimatingPhase;
          return !j.estimator ? "unassigned" : (approvedForLead(j.id).length > 0 ? "approved" : (pendingForLead(j.id).length > 0 ? "in_progress" : "assigned"));
        };
        const currentCol = getCol(job);
        if (targetColId === currentCol) { setDraggedJobId(null); return; }
        // Set the estimatingPhase on the lead to move it to the target column
        const setPhase = (phase) => {
          setSalesLeads(prev => prev.map(l => l.id === job.id ? { ...l, estimatingPhase: phase, activities: [...(l.activities || []), { type: "phase_change", text: `Moved to ${phase} on estimating board`, by: user.name, at: new Date().toISOString() }] } : l));
        };
        if (targetColId === "unassigned") {
          if (job.estimator && confirm("Remove estimator assignment?")) { handleAssignEstimator(job.id, ""); }
          setPhase("unassigned");
        } else if (targetColId === "assigned") {
          if (!job.estimator) {
            // Open the card detail modal so user can assign via dropdown
            setSelectedKanbanJob(job);
            alert("Please assign an estimator using the dropdown in the card detail.");
          }
          setPhase("assigned");
        } else if (targetColId === "in_progress") {
          if (!job.estimator) {
            setSelectedKanbanJob(job);
            alert("Please assign an estimator using the dropdown in the card detail first.");
          }
          setPhase("in_progress");
        } else if (targetColId === "approved") {
          if (jobPending.length > 0 && (role === "admin" || role === "lead_estimator")) {
            if (confirm(`Approve ${jobPending.length} pending estimate(s)?`)) { jobPending.forEach(est => handleApprove(est)); }
            setPhase("approved");
          } else if (jobPending.length > 0) {
            alert("Only admins or lead estimators can approve estimates.");
          } else if (jobEsts.length === 0) {
            alert("Create and submit an estimate before approving.");
          } else {
            setPhase("approved");
          }
        }
        setDraggedJobId(null);
      };

      // Update a lead's estimating fields (bid due, estimator, type, slope, material)
      const handleUpdateJobField = (jobId, field, value) => {
        setSalesLeads(prev => prev.map(l => l.id === jobId ? { ...l, [field]: value, activities: [...(l.activities || []), { type: "field_update", text: `Updated ${field} to "${value}"`, by: user.name, at: new Date().toISOString() }] } : l));
        setSelectedKanbanJob(prev => prev && prev.id === jobId ? { ...prev, [field]: value } : prev);
      };

      useEffect(() => { loadAllSubmissions().then(s => { setSubmissions(s); setLoading(false); }); }, []);
      const refresh = async () => { setLoading(true); const s = await loadAllSubmissions(); setSubmissions(s); setLoading(false); };

      // ── Kanban data ──────────────────────────────────────────
      const estimatingJobs = (salesLeads || []).filter(l => l.stage === "being_estimated");
      const estimatesForLead = (leadId) => submissions.filter(s => s.leadId === leadId && s.status !== "rejected" && s.status !== "not_selected");
      const approvedForLead = (leadId) => submissions.filter(s => s.leadId === leadId && s.status === "approved");
      const pendingForLead = (leadId) => submissions.filter(s => s.leadId === leadId && (s.status === "pending" || s.status === "draft"));

      // Kanban columns use explicit estimatingPhase if set, otherwise computed from data
      const getJobCol = (j) => {
        if (j.estimatingPhase) return j.estimatingPhase;
        return !j.estimator ? "unassigned" : (approvedForLead(j.id).length > 0 ? "approved" : (pendingForLead(j.id).length > 0 ? "in_progress" : "assigned"));
      };
      const kanbanCols = [
        { id: "unassigned", label: "Unassigned", color: "#94A3B8", jobs: estimatingJobs.filter(j => getJobCol(j) === "unassigned") },
        { id: "assigned", label: "Assigned", color: "#6366F1", jobs: estimatingJobs.filter(j => getJobCol(j) === "assigned") },
        { id: "in_progress", label: "Estimating", color: "#F59E0B", jobs: estimatingJobs.filter(j => getJobCol(j) === "in_progress") },
        { id: "approved", label: "Approved", color: "#10B981", jobs: estimatingJobs.filter(j => getJobCol(j) === "approved") },
      ];

      const handleAssignEstimator = (leadId, estimatorName) => {
        setSalesLeads(prev => prev.map(l => l.id === leadId ? { ...l, estimator: estimatorName, activities: [...(l.activities || []), { type: "assigned", text: `Assigned to estimator: ${estimatorName}`, by: user.name, at: new Date().toISOString() }] } : l));
      };

      const startEstimate = (leadId) => {
        setSelectedLeadId(leadId);
        setEditingEstimateId(null);
        setStep(1);
        setEstimateRoofType("");
        setBuildings([{ ...EMPTY_BUILDING, id: "b1" }]);
        setMat({ ...DEFAULT_MATERIALS }); setLab({ ...DEFAULT_LABOR }); setEquip({ ...DEFAULT_EQUIPMENT }); setFin({ ...DEFAULT_FINANCIALS });
        setTpoAssemblies([]); setTpoLabor({ ...TPO_DEFAULT_LABOR }); setTpoEquip({ ...TPO_DEFAULT_EQUIPMENT });
        setBeamAiError(null);
        setView("new");
      };

      const editEstimate = (est) => {
        setSelectedLeadId(est.leadId);
        setEditingEstimateId(est.id);
        setEstimateRoofType(est.estimateRoofType || "");
        setBuildings(est.buildings && est.buildings.length > 0 ? est.buildings : [{ ...EMPTY_BUILDING, id: "b1" }]);
        setMat(est.materials || { ...DEFAULT_MATERIALS });
        setLab(est.labor || { ...DEFAULT_LABOR });
        setEquip(est.equipment || { ...DEFAULT_EQUIPMENT });
        setFin(est.financials || { ...DEFAULT_FINANCIALS });
        setTpoAssemblies(est.tpoAssemblies || []);
        setTpoLabor(est.tpoLabor || { ...TPO_DEFAULT_LABOR });
        setTpoEquip(est.tpoEquip || { ...TPO_DEFAULT_EQUIPMENT });
        setStep(1);
        setView("new");
      };

      const handleBeamAiUpload = async (file) => {
        if (!file) return;
        setBeamAiProcessing(true); setBeamAiError(null);
        try {
          const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(new Uint8Array(e.target.result)); r.onerror = () => rej(new Error("Read failed")); r.readAsArrayBuffer(file); });
          const assemblies = parseBeamAiXlsx(data);
          if (!assemblies || assemblies.length === 0) throw new Error("No takeoff data found. Make sure the file has a TAKEOFF sheet.");
          setTpoAssemblies(assemblies);
          setStep(2);
        } catch (err) {
          console.error("Beam AI parse error:", err);
          setBeamAiError(err.message || "Failed to parse file");
        }
        setBeamAiProcessing(false);
      };

      // ── Submissions data ─────────────────────────────────────
      const counts = { all: submissions.length, pending: submissions.filter(s => s.status === "pending").length, approved: submissions.filter(s => s.status === "approved").length, awarded: submissions.filter(s => s.status === "awarded").length };
      const filteredSubs = filter === "all" ? submissions : submissions.filter(s => s.status === filter);

      // Available jobs for estimate creation
      const availableJobs = (salesLeads || []).filter(l => l.stage === "being_estimated");
      const selectedLead = availableJobs.find(l => l.id === selectedLeadId);
      const leadCompany = selectedLead ? (companies || []).find(c => c.id === selectedLead.companyId) : null;
      const leadProperty = selectedLead ? (properties || []).find(p => p.id === selectedLead.propertyId) : null;
      const leadContact = selectedLead ? (contacts || []).find(c => c.id === selectedLead.contactId) : null;

      // Calculations
      const results = calcAllBuildings(buildings, materials, labor, equipment, financials);
      const grandTotal = results.reduce((s, r) => s + r.totalPrice, 0);
      const totalSq = buildings.reduce((s, b) => s + b.totalArea, 0);

      const handleAward = async (sub) => {
        const leadEstimates = submissions.filter(s => s.leadId === sub.leadId && s.status === "approved");
        if (leadEstimates.length > 1) { setShowAwardPicker(sub.leadId); return; }
        await doAward(sub);
      };

      const doAward = async (sub) => {
        if (!confirm(`Award "${sub.leadName || sub.project?.jobName}" and move to Production?`)) return;
        const updated = { ...sub, status: "awarded", awardedAt: new Date().toISOString(), awardedBy: user.name };
        await saveSubmission(updated);
        for (const other of submissions.filter(s => s.leadId === sub.leadId && s.id !== sub.id && s.status === "approved")) {
          await saveSubmission({ ...other, status: "not_selected" });
        }
        const totalPrice = sub.totalPrice || sub.results?.reduce((s, r) => s + r.totalPrice, 0) || 0;
        const totalMat = sub.results?.reduce((s, r) => s + r.materialCost, 0) || 0;
        const totalLab = sub.results?.reduce((s, r) => s + r.laborCost, 0) || 0;
        const totalTax = sub.results?.reduce((s, r) => s + r.materialTax, 0) || 0;
        const estimatedCost = totalMat + totalLab + totalTax;
        const margin = totalPrice > 0 ? Math.round(((totalPrice - estimatedCost) / totalPrice) * 100) : 0;
        const newProject = {
          id: generateId(), name: sub.leadName || sub.project?.jobName || "Untitled",
          client: sub.project?.companyName || "", address: sub.project?.address || "",
          market: sub.market || "ATL", status: "Pre-Construction", roofType: "Asphalt Shingles",
          sqft: sub.buildings?.reduce((s, b) => s + (b.totalArea || 0), 0) || 0,
          contractValue: totalPrice, estimatedCost, estimatedMargin: margin, currentCost: 0, currentMargin: margin,
          assignedSuper: "", buildings: sub.buildings?.length || 1, progress: 0,
          createdAt: new Date().toISOString().split("T")[0], documents: {},
          estimateId: sub.id, leadId: sub.leadId,
          companyId: sub.companyId, propertyId: sub.propertyId, contactId: sub.contactId,
          budgetLineItems: [
            { id: generateId(), description: "Materials", amount: totalMat, category: "Materials" },
            { id: generateId(), description: "Labor & Equipment", amount: totalLab, category: "Labor" },
            { id: generateId(), description: "Material Tax", amount: totalTax, category: "Other" },
          ],
        };
        try { const existing = JSON.parse(localStorage.getItem("cr_production_projects") || "[]"); existing.unshift(newProject); localStorage.setItem("cr_production_projects", JSON.stringify(existing)); if (firestoreDb) await firestoreDb.collection("cr_production_projects").doc("data").set({ items: existing, updatedAt: new Date().toISOString() }); } catch (e) {}
        if (sub.leadId && setSalesLeads) {
          setSalesLeads(prev => prev.map(l => l.id === sub.leadId ? { ...l, stage: "awarded", estimatedValue: totalPrice, activities: [...(l.activities || []), { type: "awarded", text: `Awarded — moved to Production with budget`, by: user.name, at: new Date().toISOString() }] } : l));
        }
        await refresh(); setShowAwardPicker(null);
        alert(`"${newProject.name}" awarded and added to Production!`);
      };

      const handleApprove = async (sub) => {
        await saveSubmission({ ...sub, status: "approved", approvedAt: new Date().toISOString(), approvedBy: user.name });
        // Auto-move lead to "estimate_approved" in project sales
        if (sub.leadId && setSalesLeads) {
          const totalPrice = sub.totalPrice || sub.results?.reduce((s, r) => s + r.totalPrice, 0) || 0;
          setSalesLeads(prev => prev.map(l => l.id === sub.leadId ? { ...l, stage: "estimate_approved", estimatedValue: totalPrice, activities: [...(l.activities || []), { type: "stage_change", text: `Estimate approved ($${totalPrice.toLocaleString()}) — moved to Estimate Approved`, by: user.name, at: new Date().toISOString() }] } : l));
        }
        await refresh();
      };

      const handleSubmitEstimate = async () => {
        if (!selectedLeadId) { alert("Select a job first"); return; }
        setSaving(true);
        const lead = availableJobs.find(l => l.id === selectedLeadId) || (salesLeads || []).find(l => l.id === selectedLeadId);
        const co = lead ? (companies || []).find(c => c.id === lead.companyId) : null;
        const pr = lead ? (properties || []).find(p => p.id === lead.propertyId) : null;
        const project = { jobName: lead?.jobName || (co?.name ? `${co.name} — ${pr?.name || "Re-Roof"}` : pr?.name || "Re-Roof"), companyName: co?.name || "", address: pr?.address || "", market: lead?.market === "ATL" ? "atlanta" : lead?.market === "TPA" ? "tampa" : "dallas" };
        let data;
        if (estimateRoofType === "TPO") {
          const tpoCalc = calcTPOEstimate(tpoAssemblies, tpoLabor, tpoEquip, financials);
          data = { project, estimateRoofType, tpoAssemblies, tpoLabor, tpoEquip, financials, tpoCalcSummary: { materialCost: tpoCalc.materialCost, accessoryCost: tpoCalc.accessoryCost, laborCost: tpoCalc.laborCost, equipCost: tpoCalc.equipCost, matTax: tpoCalc.matTax, margin: tpoCalc.margin, totalSf: tpoCalc.totalSf, pricePerSf: tpoCalc.pricePerSf }, totalPrice: tpoCalc.total, status: "pending", submittedBy: user.name, leadId: selectedLeadId, leadName: project.jobName, companyId: lead?.companyId, propertyId: lead?.propertyId, contactId: lead?.contactId, market: lead?.market, buildings: [] };
        } else {
          data = { project, buildings, materials, labor, equipment, financials, results, totalPrice: grandTotal, status: "pending", submittedBy: user.name, leadId: selectedLeadId, leadName: project.jobName, companyId: lead?.companyId, propertyId: lead?.propertyId, contactId: lead?.contactId, market: lead?.market, estimateRoofType };
        }
        if (editingEstimateId) { data.id = editingEstimateId; data.updatedBy = user.name; data.updatedAt = new Date().toISOString(); }
        const saved = await saveSubmission(data);
        if (saved) {
          const totalForLog = estimateRoofType === "TPO" ? Math.round(data.totalPrice) : grandTotal;
          const actionText = editingEstimateId ? `Estimate updated ($${totalForLog.toLocaleString()}) by ${user.name}` : `Estimate submitted ($${totalForLog.toLocaleString()}) by ${user.name}`;
          if (setSalesLeads) { setSalesLeads(prev => prev.map(l => l.id === selectedLeadId ? { ...l, activities: [...(l.activities || []), { type: "estimate", text: actionText, by: user.name, at: new Date().toISOString() }] } : l)); }
          await refresh(); setView("kanban"); setStep(1); setSelectedLeadId(""); setEditingEstimateId(null);
          setBuildings([{ ...EMPTY_BUILDING, id: "b1" }]); setMat({ ...DEFAULT_MATERIALS }); setLab({ ...DEFAULT_LABOR }); setEquip({ ...DEFAULT_EQUIPMENT }); setFin({ ...DEFAULT_FINANCIALS });
          setTpoAssemblies([]); setTpoLabor({ ...TPO_DEFAULT_LABOR }); setTpoEquip({ ...TPO_DEFAULT_EQUIPMENT });
        }
        setSaving(false);
      };

      const addBuilding = () => setBuildings(prev => [...prev, { ...EMPTY_BUILDING, id: "b" + (prev.length + 1) }]);
      const updateBuilding = (idx, field, value) => { const u = [...buildings]; u[idx] = { ...u[idx], [field]: typeof value === "string" && !isNaN(value) && field !== "siteplanNum" && field !== "roofrNum" && field !== "predominantPitch" ? Number(value) : value }; setBuildings(u); };
      const removeBuilding = (idx) => { if (buildings.length <= 1) return; setBuildings(prev => prev.filter((_, i) => i !== idx)); };

      // RoofR upload handler (unchanged)
      const handleRoofRUpload = async (file) => {
        if (!file) return;
        setRoofRProcessing(true); setRoofRError(null);
        try {
          const fileData = await new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = () => rej(new Error("Read failed")); r.readAsDataURL(file); });
          const base64Data = fileData.split(",")[1];
          const mediaType = file.type || "application/pdf";
          const isExcel = mediaType.includes("spreadsheet") || mediaType.includes("excel") || file.name.match(/\.(xlsx|xls|csv)$/i);
          let contentParts = [];
          if (isExcel) {
            const binaryStr = atob(base64Data); const bytes = new Uint8Array(binaryStr.length); for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
            const workbook = XLSX.read(bytes, { type: "array" }); let csvText = ""; workbook.SheetNames.forEach(sn => { csvText += "=== Sheet: " + sn + " ===\n" + XLSX.utils.sheet_to_csv(workbook.Sheets[sn]) + "\n\n"; });
            if (csvText.length > 40000) csvText = csvText.substring(0, 40000) + "\n...[truncated]";
            contentParts.push({ type: "text", text: "[RoofR Report: " + file.name + "]\n\n" + csvText });
          } else if (mediaType === "application/pdf") {
            if (file.size > 2000000 && window.pdfjsLib) {
              const binaryStr = atob(base64Data); const bytes = new Uint8Array(binaryStr.length); for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
              const pdf = await pdfjsLib.getDocument({ data: bytes }).promise; let fullText = "";
              for (let p = 1; p <= pdf.numPages; p++) { const page = await pdf.getPage(p); const tc = await page.getTextContent(); fullText += "=== Page " + p + " ===\n" + tc.items.map(i => i.str).join(" ") + "\n\n"; }
              if (fullText.length > 40000) fullText = fullText.substring(0, 40000) + "\n...[truncated]";
              contentParts.push({ type: "text", text: "[RoofR Report PDF: " + file.name + "]\n\n" + fullText });
            } else { contentParts.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } }); contentParts.push({ type: "text", text: "[RoofR Report: " + file.name + "]" }); }
          } else { contentParts.push({ type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } }); contentParts.push({ type: "text", text: "[RoofR Report image: " + file.name + "]" }); }
          contentParts.push({ type: "text", text: `Parse this RoofR roof measurement report. Return ONLY valid JSON (no markdown) as an array of buildings: [{"siteplanNum":"","roofrNum":"","totalArea":0,"pitchedArea":0,"flatArea":0,"predominantPitch":"5/12","eaves":0,"valleys":0,"hips":0,"ridges":0,"rakes":0,"wallFlashing":0,"stepFlashing":0,"pipes":0,"phase":1}]. Use 0 for missing values.` });
          const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, messages: [{ role: "user", content: contentParts }] }) });
          if (!response.ok) throw new Error("API error " + response.status);
          const result = await response.json();
          const text = result.content?.find(c => c.type === "text")?.text || "";
          const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          if (arr.length === 0) throw new Error("No buildings found");
          setBuildings(arr.map((b, i) => ({ ...EMPTY_BUILDING, id: "rb" + i + "_" + Date.now(), siteplanNum: b.siteplanNum || "Bldg " + (i + 1), roofrNum: b.roofrNum || "", totalArea: Number(b.totalArea) || 0, pitchedArea: Number(b.pitchedArea) || 0, flatArea: Number(b.flatArea) || 0, predominantPitch: b.predominantPitch || "5/12", eaves: Number(b.eaves) || 0, valleys: Number(b.valleys) || 0, hips: Number(b.hips) || 0, ridges: Number(b.ridges) || 0, rakes: Number(b.rakes) || 0, wallFlashing: Number(b.wallFlashing) || 0, stepFlashing: Number(b.stepFlashing) || 0, pipes: Number(b.pipes) || 0, phase: Number(b.phase) || 1 })));
        } catch (err) { setRoofRError("Failed to parse: " + (err.message || "Unknown error")); } finally { setRoofRProcessing(false); }
      };

      const fs = { width: "100%", padding: "8px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 13, color: C.navy, outline: "none", boxSizing: "border-box" };
      const ls = { fontSize: 11, fontWeight: 600, color: C.gray600, marginBottom: 3, display: "block" };
      const numFs = { ...fs, textAlign: "right", width: 90 };

      // ════════════════════════════════════════════════════════════
      // KANBAN VIEW — Primary view showing jobs being estimated
      // ════════════════════════════════════════════════════════════
      if (view === "kanban") {
        return (
          <div style={{ background: C.gray50, minHeight: "calc(100vh - 56px)" }}>
            <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div><h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, margin: 0 }}>Estimating</h1><p style={{ fontSize: 14, color: C.gray500, margin: "4px 0 0" }}>Jobs being estimated — assign, build estimates, approve & award</p></div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setView("submissions")} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer", color: C.gray600 }}>📋 All Estimates ({submissions.length})</button>
                  <button onClick={refresh} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer", color: C.gray600 }}>Refresh</button>
                </div>
              </div>

              {/* Bid Due Date Tracker */}
              {estimatingJobs.length > 0 && (() => {
                const sortedJobs = [...estimatingJobs].sort((a, b) => {
                  if (trackerSort === "estimator") return (a.estimator || "zzz").localeCompare(b.estimator || "zzz");
                  return (a.bidDueDate || "9999").localeCompare(b.bidDueDate || "9999");
                });
                const today = new Date().toISOString().split("T")[0];
                return (
                  <div style={{ marginBottom: 20, background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, overflow: "hidden" }}>
                    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.gray200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>📅 Bid Due Dates</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setTrackerSort("date")} style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: trackerSort === "date" ? C.navy : C.gray100, color: trackerSort === "date" ? C.white : C.gray600, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>By Date</button>
                        <button onClick={() => setTrackerSort("estimator")} style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: trackerSort === "estimator" ? C.navy : C.gray100, color: trackerSort === "estimator" ? C.white : C.gray600, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>By Estimator</button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 0 }}>
                      {sortedJobs.map(job => {
                        const co = (companies || []).find(c => c.id === job.companyId);
                        const isOverdue = job.bidDueDate && job.bidDueDate < today;
                        const isDueSoon = job.bidDueDate && !isOverdue && job.bidDueDate <= new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
                        return (
                          <div key={job.id} style={{ padding: "10px 16px", borderBottom: `1px solid ${C.gray100}`, borderRight: `1px solid ${C.gray100}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{job.jobName || co?.name || "—"}</div>
                              <div style={{ fontSize: 10, color: C.gray400, marginTop: 2 }}>{job.estimator || "Unassigned"}</div>
                              <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                                {job.constructionType && <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: job.constructionType === "New Construction" ? "#DBEAFE" : "#FEF3C7", color: job.constructionType === "New Construction" ? "#2563EB" : "#D97706" }}>{job.constructionType}</span>}
                                {job.roofSlope && <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: "#F3E8FF", color: "#7C3AED" }}>{job.roofSlope}</span>}
                                {job.estimateMaterial && <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: "#ECFDF5", color: "#059669" }}>{job.estimateMaterial}</span>}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              {job.bidDueDate ? (
                                <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: isOverdue ? C.redBg : isDueSoon ? C.yellowBg : C.greenBg, color: isOverdue ? C.red : isDueSoon ? C.yellow : C.green }}>{isOverdue ? "OVERDUE" : ""} {new Date(job.bidDueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                              ) : <span style={{ fontSize: 10, color: C.gray400 }}>No date</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {estimatingJobs.length === 0 && (
                <div style={{ textAlign: "center", padding: 24, marginBottom: 16, background: C.white, borderRadius: 10, border: `1px dashed ${C.gray300}` }}>
                  <p style={{ fontSize: 13, color: C.gray500, margin: 0 }}>No jobs being estimated yet — move a job to "Being Estimated" in Project Sales to get started.</p>
                </div>
              )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, alignItems: "flex-start" }}>
                  {kanbanCols.map(col => (
                    <div key={col.id} onDragOver={handleKanbanDragOver} onDrop={e => handleKanbanDrop(e, col.id)} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, overflow: "hidden" }}>
                      <div style={{ padding: "12px 16px", borderBottom: `2px solid ${col.color}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{col.label}</span>
                        <span style={{ padding: "2px 8px", borderRadius: 10, background: col.color + "18", color: col.color, fontSize: 11, fontWeight: 700 }}>{col.jobs.length}</span>
                      </div>
                      <div style={{ padding: "12px", minHeight: 80, display: "flex", flexDirection: "column", gap: 8 }}>
                        {col.jobs.map(job => {
                          const co = (companies || []).find(c => c.id === job.companyId);
                          const pr = (properties || []).find(p => p.id === job.propertyId);
                          const ests = estimatesForLead(job.id);
                          const approved = approvedForLead(job.id);
                          return (
                            <div key={job.id} draggable onDragStart={e => handleKanbanDragStart(e, job.id)} onClick={() => setSelectedKanbanJob(job)} style={{ padding: "12px 14px", borderRadius: 8, border: `1px solid ${draggedJobId === job.id ? C.blue : C.gray200}`, background: draggedJobId === job.id ? C.blueBg : C.white, cursor: "pointer", opacity: draggedJobId === job.id ? 0.6 : 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 2 }}>{job.jobName || co?.name || job.company || "—"}</div>
                              {co && job.jobName && <div style={{ fontSize: 11, color: C.gray500, marginBottom: 2 }}>🏢 {co.name}</div>}
                              <div style={{ fontSize: 11, color: C.gray500, marginBottom: 6 }}>{pr?.name || "—"} {pr?.address ? `· ${pr.address}` : ""}</div>
                              {/* Scope & Notes from sales */}
                              {(job.scopeOfWork || job.estimatingNotes) && <div style={{ marginBottom: 8, padding: "6px 8px", borderRadius: 6, background: C.blueBg + "40", border: `1px solid ${C.blue}20` }}>
                                {job.scopeOfWork && <div style={{ fontSize: 10, color: C.navy, marginBottom: job.estimatingNotes ? 4 : 0 }}><span style={{ fontWeight: 700 }}>Scope:</span> {job.scopeOfWork.length > 80 ? job.scopeOfWork.substring(0, 80) + "..." : job.scopeOfWork}</div>}
                                {job.estimatingNotes && <div style={{ fontSize: 10, color: C.gray600 }}><span style={{ fontWeight: 700 }}>Notes:</span> {job.estimatingNotes.length > 60 ? job.estimatingNotes.substring(0, 60) + "..." : job.estimatingNotes}</div>}
                              </div>}
                              {/* Estimator assignment */}
                              <div style={{ marginBottom: 8 }}>
                                <select value={job.estimator || ""} onChange={e => { e.stopPropagation(); handleAssignEstimator(job.id, e.target.value); }}
                                  style={{ width: "100%", padding: "6px 8px", border: `1px solid ${job.estimator ? C.green + "60" : C.red + "40"}`, borderRadius: 6, fontSize: 11, color: C.navy, outline: "none", background: job.estimator ? C.greenBg + "40" : C.white }}>
                                  <option value="">— Assign estimator —</option>
                                  {ESTIMATORS.map(e => <option key={e.email} value={e.name}>{e.name}</option>)}
                                </select>
                              </div>
                              {/* Estimate count + actions */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", gap: 4 }}>
                                  {ests.length > 0 && <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: C.navy + "15", color: C.navy }}>{ests.length} est</span>}
                                  {approved.length > 0 && <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: C.greenBg, color: C.green }}>✓ Approved</span>}
                                  {job.bidDueDate && (() => { const today = new Date().toISOString().split("T")[0]; const overdue = job.bidDueDate < today; const soon = !overdue && job.bidDueDate <= new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0]; return <span style={{ padding: "2px 6px", borderRadius: 5, fontSize: 9, fontWeight: 700, background: overdue ? C.redBg : soon ? C.yellowBg : C.gray100, color: overdue ? C.red : soon ? C.yellow : C.gray500 }}>{overdue ? "⚠ " : "📅 "}{new Date(job.bidDueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>; })()}
                                  <MarketTag market={job.market} />
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); startEstimate(job.id); }} style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: C.red, color: C.white, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{ests.length > 0 ? "+ Add" : "Create"}</button>
                              </div>
                              {ests.length > 0 && <div style={{ marginTop: 8, borderTop: `1px solid ${C.gray100}`, paddingTop: 6 }}>
                                {ests.slice(0, 3).map(est => (
                                  <div key={est.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", fontSize: 10 }}>
                                    <span style={{ color: C.gray600 }}>{est.submittedBy} · {new Date(est.createdAt).toLocaleDateString()}</span>
                                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                      <span style={{ fontWeight: 700, color: C.navy }}>{fmt(est.totalPrice || 0)}</span>
                                      {est.status === "pending" && (role === "admin" || role === "lead_estimator") && <button onClick={(e) => { e.stopPropagation(); handleApprove(est); }} style={{ padding: "1px 6px", borderRadius: 4, border: "none", background: C.green, color: C.white, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>✓</button>}
                                      {est.status === "approved" && <button onClick={(e) => { e.stopPropagation(); handleAward(est); }} style={{ padding: "1px 6px", borderRadius: 4, border: "none", background: C.blue, color: C.white, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>🏆</button>}
                                      <span style={{ padding: "1px 5px", borderRadius: 3, fontSize: 9, fontWeight: 600, background: est.status === "approved" ? C.greenBg : est.status === "awarded" ? C.blueBg : C.yellowBg, color: est.status === "approved" ? C.green : est.status === "awarded" ? C.blue : C.yellow }}>{est.status}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

              {/* Estimate Detail Modal */}
              {selectedKanbanJob && (() => {
                const job = selectedKanbanJob;
                const co = (companies || []).find(c => c.id === job.companyId);
                const pr = (properties || []).find(p => p.id === job.propertyId);
                const ct = (contacts || []).find(c => c.id === job.contactId);
                const jobEstimates = estimatesForLead(job.id);
                const jobApproved = approvedForLead(job.id);
                const jobPending = pendingForLead(job.id);
                return (
                  <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }} onClick={() => setSelectedKanbanJob(null)}>
                    <div style={{ background: C.white, borderRadius: 16, width: 640, maxHeight: "85vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
                      <div style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${C.gray200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: "0 0 4px" }}>{job.jobName || co?.name || "—"}</h2>
                          <p style={{ fontSize: 13, color: C.gray500, margin: 0 }}>{pr?.name || "—"} {pr?.address ? `· ${pr.address}` : ""}</p>
                        </div>
                        <button onClick={() => setSelectedKanbanJob(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400, fontSize: 18 }}>✕</button>
                      </div>
                      <div style={{ padding: "20px 28px" }}>
                        {/* Job details — editable fields */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                          <div style={{ padding: "10px 12px", borderRadius: 8, background: C.gray50 }}><div style={{ fontSize: 10, color: C.gray400, fontWeight: 600 }}>Company</div><div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{co?.name || "—"}</div></div>
                          <div style={{ padding: "10px 12px", borderRadius: 8, background: C.gray50 }}><div style={{ fontSize: 10, color: C.gray400, fontWeight: 600, marginBottom: 4 }}>Estimator</div><select value={job.estimator || ""} onChange={e => handleUpdateJobField(job.id, "estimator", e.target.value)} style={{ width: "100%", padding: "4px 8px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, fontWeight: 600, color: C.navy, background: C.white }}><option value="">— Select —</option>{(crmUsers || []).map(u => <option key={u.id} value={u.name}>{u.name}{u.role ? ` (${u.role})` : ""}</option>)}</select></div>
                          <div style={{ padding: "10px 12px", borderRadius: 8, background: C.gray50 }}><div style={{ fontSize: 10, color: C.gray400, fontWeight: 600, marginBottom: 4 }}>Bid Due</div><input type="date" value={job.bidDueDate || ""} onChange={e => handleUpdateJobField(job.id, "bidDueDate", e.target.value)} style={{ width: "100%", padding: "4px 8px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, fontWeight: 600, color: C.navy, background: C.white }} /></div>
                          <div style={{ padding: "10px 12px", borderRadius: 8, background: C.gray50 }}><div style={{ fontSize: 10, color: C.gray400, fontWeight: 600, marginBottom: 4 }}>Type</div><select value={job.constructionType || ""} onChange={e => handleUpdateJobField(job.id, "constructionType", e.target.value)} style={{ width: "100%", padding: "4px 8px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, fontWeight: 600, color: C.navy, background: C.white }}><option value="">— Select —</option><option value="Replacement">Replacement</option><option value="New Construction">New Construction</option></select></div>
                          <div style={{ padding: "10px 12px", borderRadius: 8, background: C.gray50 }}><div style={{ fontSize: 10, color: C.gray400, fontWeight: 600, marginBottom: 4 }}>Roof Slope</div><select value={job.roofSlope || ""} onChange={e => handleUpdateJobField(job.id, "roofSlope", e.target.value)} style={{ width: "100%", padding: "4px 8px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, fontWeight: 600, color: C.navy, background: C.white }}><option value="">— Select —</option><option value="Steep Slope">Steep Slope</option><option value="Low-Slope">Low-Slope</option></select></div>
                          <div style={{ padding: "10px 12px", borderRadius: 8, background: C.gray50 }}><div style={{ fontSize: 10, color: C.gray400, fontWeight: 600, marginBottom: 4 }}>Material</div><select value={job.estimateMaterial || ""} onChange={e => handleUpdateJobField(job.id, "estimateMaterial", e.target.value)} style={{ width: "100%", padding: "4px 8px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, fontWeight: 600, color: C.navy, background: C.white }}><option value="">— Select —</option><option value="Shingles">Shingles</option><option value="Tile">Tile</option><option value="TPO">TPO</option><option value="Combo">Combo</option><option value="Metal">Metal</option><option value="Modified Bitumen">Modified Bitumen</option><option value="EPDM">EPDM</option><option value="PVC">PVC</option></select></div>
                        </div>
                        {/* Scope & Notes */}
                        {(job.scopeOfWork || job.estimatingNotes) && <div style={{ marginBottom: 20, padding: "12px 14px", borderRadius: 8, background: C.blueBg + "30", border: `1px solid ${C.blue}15` }}>
                          {job.scopeOfWork && <div style={{ fontSize: 12, color: C.navy, marginBottom: job.estimatingNotes ? 6 : 0 }}><span style={{ fontWeight: 700 }}>Scope:</span> {job.scopeOfWork}</div>}
                          {job.estimatingNotes && <div style={{ fontSize: 12, color: C.gray600 }}><span style={{ fontWeight: 700 }}>Notes:</span> {job.estimatingNotes}</div>}
                        </div>}
                        {/* Contact */}
                        {ct && <div style={{ marginBottom: 20, padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.gray200}` }}><div style={{ fontSize: 10, color: C.gray400, fontWeight: 600, marginBottom: 4 }}>Primary Contact</div><div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{ct.firstName} {ct.lastName}</div>{ct.email && <div style={{ fontSize: 11, color: C.gray500 }}>{ct.email}</div>}{ct.mobilePhone && <div style={{ fontSize: 11, color: C.gray500 }}>{ct.mobilePhone}</div>}</div>}
                        {/* Estimates list */}
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>Estimates ({jobEstimates.length})</span>
                            <button onClick={() => { setSelectedKanbanJob(null); startEstimate(job.id); }} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: C.red, color: C.white, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{jobEstimates.length > 0 ? "+ Add Estimate" : "Create Estimate"}</button>
                          </div>
                          {jobEstimates.length === 0 ? (
                            <div style={{ padding: 20, textAlign: "center", color: C.gray400, fontSize: 12, background: C.gray50, borderRadius: 8 }}>No estimates yet</div>
                          ) : jobEstimates.map(est => (
                            <div key={est.id} style={{ padding: "12px 14px", borderRadius: 8, border: `1px solid ${expandedEstimate === est.id ? C.navy + "40" : C.gray200}`, marginBottom: 8 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, cursor: "pointer" }} onClick={() => setExpandedEstimate(expandedEstimate === est.id ? null : est.id)}>
                                <div><span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{fmt(est.totalPrice || 0)}</span><span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, textTransform: "uppercase", background: est.status === "approved" ? C.greenBg : est.status === "awarded" ? C.blueBg : est.status === "draft" ? C.gray100 : C.yellowBg, color: est.status === "approved" ? C.green : est.status === "awarded" ? C.blue : est.status === "draft" ? C.gray500 : C.yellow }}>{est.status}</span></div>
                                <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                                  <button onClick={() => { setSelectedKanbanJob(null); editEstimate(est); }} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.navy}`, background: C.white, color: C.navy, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>✏️ Edit</button>
                                  {est.status === "pending" && (role === "estimator" || role === "admin") && <button onClick={() => { const sub = { ...est, status: "pending", submittedForApproval: true, submittedForApprovalAt: new Date().toISOString(), submittedForApprovalBy: user.name }; saveSubmission(sub).then(() => refresh()); }} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.blue}`, background: C.white, color: C.blue, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Submit for Approval</button>}
                                  {est.status === "pending" && (role === "admin" || role === "lead_estimator") && <button onClick={() => { handleApprove(est); setSelectedKanbanJob(null); }} style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: C.green, color: C.white, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>✓ Approve</button>}
                                  {est.status === "approved" && <button onClick={() => { handleAward(est); setSelectedKanbanJob(null); }} style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: C.blue, color: C.white, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>🏆 Award</button>}
                                </div>
                              </div>
                              <div style={{ fontSize: 11, color: C.gray500, cursor: "pointer" }} onClick={() => setExpandedEstimate(expandedEstimate === est.id ? null : est.id)}>{est.buildings?.length || 0} buildings · by {est.submittedBy || "—"} · {new Date(est.createdAt).toLocaleDateString()} · <span style={{ color: C.blue, fontWeight: 600 }}>{expandedEstimate === est.id ? "▲ Hide Details" : "▼ View Details"}</span></div>
                              {expandedEstimate === est.id && <div style={{ marginTop: 12, borderTop: `1px solid ${C.gray100}`, paddingTop: 12 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 12 }}>
                                  <div style={{ padding: "8px 10px", borderRadius: 6, background: C.gray50, border: `1px solid ${C.gray200}` }}><div style={{ fontSize: 9, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Roof Type</div><div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginTop: 2 }}>{est.estimateRoofType || "—"}</div></div>
                                  <div style={{ padding: "8px 10px", borderRadius: 6, background: C.gray50, border: `1px solid ${C.gray200}` }}><div style={{ fontSize: 9, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Market</div><div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginTop: 2 }}>{est.market || est.project?.market || "—"}</div></div>
                                  <div style={{ padding: "8px 10px", borderRadius: 6, background: C.greenBg, border: `1px solid ${C.green}30` }}><div style={{ fontSize: 9, fontWeight: 700, color: C.green, textTransform: "uppercase" }}>Total Price</div><div style={{ fontSize: 14, fontWeight: 800, color: C.green, marginTop: 2 }}>{fmt(est.totalPrice || 0)}</div></div>
                                </div>
                                {est.buildings && est.buildings.length > 0 && <div style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Buildings ({est.buildings.length})</div>
                                  {est.buildings.map((b, i) => <div key={i} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.gray100}`, marginBottom: 3, fontSize: 11, display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 600, color: C.navy }}>{b.siteplanNum || `Bldg ${i+1}`}</span><span style={{ color: C.gray500 }}>{(b.totalArea || 0).toLocaleString()} sf · Pitch: {b.predominantPitch || "—"}</span></div>)}
                                </div>}
                                {est.results && est.results.length > 0 && <div style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Pricing Breakdown</div>
                                  {est.results.map((r, i) => <div key={i} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.gray100}`, marginBottom: 3, fontSize: 11, display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 600, color: C.navy }}>{r.siteplanNum || `Bldg ${i+1}`}</span><span style={{ color: C.gray500 }}>Mat: {fmt(r.materialCost || 0)} · Labor: {fmt(r.laborCost || 0)} · <span style={{ fontWeight: 700, color: C.navy }}>{fmt(r.totalPrice || 0)}</span></span></div>)}
                                </div>}
                                {est.financials && <div style={{ padding: "8px 10px", borderRadius: 6, background: C.gray50, border: `1px solid ${C.gray200}`, fontSize: 11, color: C.gray600, marginBottom: 10 }}>Margin: {((est.financials.margin || 0) * 100).toFixed(0)}% · Tax Rate: {((est.financials.taxRate || 0) * 100).toFixed(1)}%</div>}
                              </div>}
                              {est.status === "approved" && <button onClick={() => { setShowProposalGen(est.id); setProposalSOW(""); setProposalSystem(""); }} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.navy}`, background: C.white, color: C.navy, fontSize: 10, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>📄 Generate Proposal</button>}
                              {est.submittedForApproval && <div style={{ fontSize: 10, color: C.blue, fontWeight: 600, marginTop: 4 }}>📤 Submitted for approval {est.submittedForApprovalAt ? `on ${new Date(est.submittedForApprovalAt).toLocaleDateString()}` : ""} by {est.submittedForApprovalBy || "—"}</div>}
                              {/* Proposal Generator */}
                              {showProposalGen === est.id && (
                                <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.navy}30`, background: C.gray50 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 8 }}>📄 Generate Proposal</div>
                                  <div style={{ marginBottom: 8 }}>
                                    <label style={{ fontSize: 10, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 4 }}>Select Roof System from Catalog</label>
                                    <select value={proposalSystem} onChange={e => { setProposalSystem(e.target.value); const sys = catalogSystems.find(s => s.id === e.target.value); if (sys?.standardSOW) setProposalSOW(sys.standardSOW); }} style={{ width: "100%", padding: "6px 8px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.navy }}>
                                      <option value="">— Select system —</option>
                                      {catalogSystems.map(sys => <option key={sys.id} value={sys.id}>{sys.name}</option>)}
                                    </select>
                                  </div>
                                  <div style={{ marginBottom: 8 }}>
                                    <label style={{ fontSize: 10, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 4 }}>Scope of Work {proposalSystem && "(auto-populated from system)"}</label>
                                    <textarea value={proposalSOW} onChange={e => setProposalSOW(e.target.value)} style={{ width: "100%", padding: "6px 8px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.navy, minHeight: 80, resize: "vertical", boxSizing: "border-box" }} placeholder="Scope of work will auto-populate when you select a roof system..." />
                                  </div>
                                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                    <button onClick={() => setShowProposalGen(null)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                                    <button onClick={() => {
                                      const sys = catalogSystems.find(s => s.id === proposalSystem);
                                      const proposal = { id: generateId(), estimateId: est.id, systemName: sys?.name || "Custom", sow: proposalSOW, total: est.totalPrice, createdAt: new Date().toISOString(), createdBy: user.name };
                                      const updatedEst = { ...est, proposal };
                                      saveSubmission(updatedEst).then(() => { refresh(); setShowProposalGen(null); alert("Proposal generated and attached to estimate."); });
                                    }} disabled={!proposalSOW.trim()} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: proposalSOW.trim() ? C.green : C.gray300, color: proposalSOW.trim() ? C.white : C.gray400, fontSize: 11, fontWeight: 600, cursor: proposalSOW.trim() ? "pointer" : "default" }}>Generate Proposal</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {/* Vendor Pricing Requests */}
                        <VendorPricingRequests job={job} user={user} entities={entities} setSalesLeads={setSalesLeads} />
                        {/* Activity log */}
                        {job.activities && job.activities.length > 0 && <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.gray400, display: "block", marginBottom: 8 }}>Activity</span>
                          {job.activities.slice(-5).reverse().map((a, i) => (
                            <div key={i} style={{ fontSize: 11, color: C.gray500, padding: "4px 0", borderBottom: `1px solid ${C.gray100}` }}><span style={{ fontWeight: 600 }}>{a.by}</span> — {a.text} <span style={{ color: C.gray400, marginLeft: 4 }}>{new Date(a.at).toLocaleDateString()}</span></div>
                          ))}
                        </div>}
                        {/* Tasks */}
                        <div style={{ marginTop: 16 }}><TasksPanel objectType="estimate_job" objectId={job.id} user={user} crmUsers={crmUsers} /></div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Quick start TPO estimate */}
              <div style={{ marginTop: 32, padding: "24px", borderRadius: 10, border: `2px dashed ${C.navy}30`, textAlign: "center", background: C.navy + "04" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: "0 0 8px" }}>Low-Slope Estimates (Beam AI)</h3>
                <p style={{ fontSize: 13, color: C.gray500, margin: "0 0 16px" }}>Create a TPO estimate from a Beam AI takeoff — select a job and choose TPO as the estimate type</p>
              </div>
            </div>
          </div>
        );
      }

      // ════════════════════════════════════════════════════════════
      // NEW ESTIMATE WIZARD
      // ════════════════════════════════════════════════════════════
      if (view === "new") {
        return (
          <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div><h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.navy }}>{editingEstimateId ? "Edit Estimate" : "New Estimate"}{estimateRoofType ? ` — ${estimateRoofType}` : ""}{selectedLead?.constructionType ? ` ${selectedLead.constructionType}` : ""}</h2><p style={{ margin: "4px 0 0", fontSize: 13, color: C.gray500 }}>Step {step} of 4</p></div>
              <button onClick={() => setView("kanban")} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>← Back to Board</button>
            </div>
            <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
              {(estimateRoofType === "TPO" ? ["Select Job", "Takeoff", "Pricing", "Review"] : ["Select Job", "Buildings", "Pricing", "Review"]).map((s, i) => (
                <button key={i} onClick={() => setStep(i + 1)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: step === i + 1 ? C.navy : step > i + 1 ? C.green + "20" : C.gray100, color: step === i + 1 ? C.white : step > i + 1 ? C.green : C.gray500, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{i + 1}. {s}</button>
              ))}
            </div>

            {/* STEP 1: Select Job */}
            {step === 1 && (
              <div style={{ background: C.white, borderRadius: 10, padding: 24, border: `1px solid ${C.gray200}` }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: "0 0 4px" }}>Select Job</h3>
                <p style={{ fontSize: 12, color: C.gray500, margin: "0 0 16px" }}>Choose a job that's in "Being Estimated" status.</p>
                <select style={{ ...fs, fontWeight: 600 }} value={selectedLeadId} onChange={e => { setSelectedLeadId(e.target.value); const lead = availableJobs.find(l => l.id === e.target.value); if (lead) { const mat = (lead.estimateMaterial || "").toLowerCase(); const autoType = mat.includes("shingle") ? "Shingle" : mat.includes("tile") ? "Tile" : mat.includes("tpo") ? "TPO" : mat.includes("combo") ? "Combo" : ""; setEstimateRoofType(autoType || "Shingle"); } else { setEstimateRoofType(""); } }}>
                  <option value="">— Select a job —</option>
                  {availableJobs.map(l => { const co = (companies || []).find(c => c.id === l.companyId); const pr = (properties || []).find(p => p.id === l.propertyId); const estCount = estimatesForLead(l.id).length; return (<option key={l.id} value={l.id}>{l.jobName || co?.name || l.company || "—"} — {pr?.name || "—"}{l.estimator ? ` (${l.estimator})` : ""}{estCount > 0 ? ` [${estCount} est]` : ""}</option>); })}
                </select>
                {selectedLead && (
                  <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 10, background: C.greenBg + "40", border: `1px solid ${C.green}40` }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{selectedLead.jobName || leadCompany?.name || selectedLead.company || "—"}</div>
                    {leadProperty && <div style={{ fontSize: 12, color: C.gray600, marginBottom: 2 }}>🏠 {leadProperty.name} — {leadProperty.address || ""}</div>}
                    {leadContact && <div style={{ fontSize: 12, color: C.gray600, marginBottom: 2 }}>👤 {leadContact.name} — {leadContact.email || ""}</div>}
                    {selectedLead.estimator && <div style={{ fontSize: 12, color: C.gray600 }}>📐 Estimator: {selectedLead.estimator}</div>}
                    {/* Estimate type — auto-populated from sales data, editable */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
                      <div style={{ padding: "8px 10px", borderRadius: 6, background: C.white, border: `1px solid ${C.gray200}` }}><div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, marginBottom: 4 }}>Estimate Type *</div><select value={estimateRoofType} onChange={e => setEstimateRoofType(e.target.value)} style={{ width: "100%", padding: "4px 8px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, fontWeight: 600, color: C.navy, background: C.white }}><option value="">— Select —</option><option value="Shingle">Shingle</option><option value="Tile">Tile</option><option value="TPO">TPO</option><option value="Combo">Combo</option></select></div>
                      <div style={{ padding: "8px 10px", borderRadius: 6, background: C.white, border: `1px solid ${C.gray200}` }}><div style={{ fontSize: 10, fontWeight: 700, color: C.gray400 }}>Construction</div><div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{selectedLead.constructionType || "—"}</div></div>
                      <div style={{ padding: "8px 10px", borderRadius: 6, background: C.white, border: `1px solid ${C.gray200}` }}><div style={{ fontSize: 10, fontWeight: 700, color: C.gray400 }}>Slope</div><div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{selectedLead.roofSlope || "—"}</div></div>
                    </div>
                    {selectedLead.scopeOfWork && <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 6, background: C.white, border: `1px solid ${C.blue}30` }}><div style={{ fontSize: 10, fontWeight: 700, color: C.navy, marginBottom: 2 }}>Scope of Work</div><div style={{ fontSize: 12, color: C.gray600, lineHeight: 1.5 }}>{selectedLead.scopeOfWork}</div></div>}
                    {selectedLead.estimatingNotes && <div style={{ marginTop: 6, padding: "8px 10px", borderRadius: 6, background: C.white, border: `1px solid ${C.yellow}30` }}><div style={{ fontSize: 10, fontWeight: 700, color: C.navy, marginBottom: 2 }}>Notes from Sales</div><div style={{ fontSize: 12, color: C.gray600, lineHeight: 1.5 }}>{selectedLead.estimatingNotes}</div></div>}
                  </div>
                )}
                {/* Beam AI Upload for TPO */}
                {estimateRoofType === "TPO" && selectedLeadId && (
                  <div style={{ marginTop: 16, padding: "16px 20px", borderRadius: 10, border: `2px dashed ${beamAiProcessing ? C.blue : C.navy}40`, background: C.navy + "06" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 22 }}>📐</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>Import from Beam AI</div>
                          <div style={{ fontSize: 11, color: C.gray500 }}>Upload the Beam AI takeoff XLSX to auto-generate your TPO estimate</div>
                        </div>
                      </div>
                      {beamAiProcessing ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Spinner size={14} color={C.navy} /><span style={{ fontSize: 12, color: C.navy, fontWeight: 600 }}>Parsing takeoff...</span></div>
                      ) : (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => beamAiInputRef.current?.click()} style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: C.navy, color: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>{I.upload} Upload XLSX</button>
                          <input ref={beamAiInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleBeamAiUpload(e.target.files[0]); e.target.value = ""; }} />
                        </div>
                      )}
                    </div>
                    {beamAiError && <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 6, background: C.redBg, color: C.red, fontSize: 12 }}>{beamAiError}</div>}
                    {tpoAssemblies.length > 0 && (
                      <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: C.greenBg + "60", border: `1px solid ${C.green}40` }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>✓ Takeoff imported: {tpoAssemblies.length} roof section{tpoAssemblies.length > 1 ? "s" : ""} · {Math.round(tpoAssemblies.reduce((s, a) => s + a.areaSf, 0)).toLocaleString()} SF · {tpoAssemblies.reduce((s, a) => s + a.items.length, 0)} line items</div>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => setStep(2)} disabled={!selectedLeadId || !estimateRoofType} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: selectedLeadId && estimateRoofType ? C.red : C.gray200, color: selectedLeadId && estimateRoofType ? C.white : C.gray400, fontSize: 13, fontWeight: 600, cursor: selectedLeadId && estimateRoofType ? "pointer" : "default" }}>Next → {estimateRoofType === "TPO" ? "Takeoff" : "Buildings"}</button>
                </div>
              </div>
            )}

            {/* STEP 2: TPO Takeoff Line Items */}
            {step === 2 && estimateRoofType === "TPO" && (
              <div>
                {tpoAssemblies.length === 0 ? (
                  <div style={{ background: C.white, borderRadius: 10, padding: 40, border: `1px solid ${C.gray200}`, textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📐</div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: "0 0 8px" }}>Upload Beam AI Takeoff</h3>
                    <p style={{ fontSize: 13, color: C.gray500, margin: "0 0 20px" }}>Upload the XLSX takeoff from Beam AI to import material quantities</p>
                    {beamAiProcessing ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Spinner size={16} color={C.navy} /><span style={{ fontSize: 13, color: C.navy, fontWeight: 600 }}>Parsing...</span></div> : (
                      <div><button onClick={() => beamAiInputRef.current?.click()} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: C.navy, color: C.white, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📥 Upload XLSX</button></div>
                    )}
                    {beamAiError && <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 6, background: C.redBg, color: C.red, fontSize: 12, display: "inline-block" }}>{beamAiError}</div>}
                  </div>
                ) : (
                  <div>
                    {/* Summary bar */}
                    <div style={{ background: C.navy, borderRadius: 10, padding: "14px 20px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 20 }}>
                        <div><div style={{ fontSize: 10, color: C.white + "80", fontWeight: 600 }}>ROOF SECTIONS</div><div style={{ fontSize: 18, fontWeight: 700, color: C.white }}>{tpoAssemblies.length}</div></div>
                        <div><div style={{ fontSize: 10, color: C.white + "80", fontWeight: 600 }}>TOTAL AREA</div><div style={{ fontSize: 18, fontWeight: 700, color: C.white }}>{Math.round(tpoAssemblies.reduce((s, a) => s + a.areaSf, 0)).toLocaleString()} SF</div></div>
                        <div><div style={{ fontSize: 10, color: C.white + "80", fontWeight: 600 }}>LINE ITEMS</div><div style={{ fontSize: 18, fontWeight: 700, color: C.white }}>{tpoAssemblies.reduce((s, a) => s + a.items.length, 0)}</div></div>
                        <div><div style={{ fontSize: 10, color: C.white + "80", fontWeight: 600 }}>MATERIAL EST.</div><div style={{ fontSize: 18, fontWeight: 700, color: C.white }}>${Math.round(tpoAssemblies.reduce((s, a) => s + a.items.reduce((t, li) => t + li.qty * li.unitCost, 0), 0)).toLocaleString()}</div></div>
                      </div>
                      <button onClick={() => { setTpoAssemblies([]); beamAiInputRef.current?.click(); }} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.white}40`, background: "transparent", color: C.white, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>↻ Re-import</button>
                    </div>
                    {/* Assembly sections with line items */}
                    {tpoAssemblies.map((asm, ai) => (
                      <div key={asm.id} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, marginBottom: 12, overflow: "hidden" }}>
                        <div style={{ padding: "12px 16px", background: C.gray50, borderBottom: `1px solid ${C.gray200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div><span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{asm.name}</span>{asm.areaSf > 0 && <span style={{ marginLeft: 10, fontSize: 12, color: C.gray500 }}>{Math.round(asm.areaSf).toLocaleString()} SF</span>}</div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>${Math.round(asm.items.reduce((t, li) => t + li.qty * li.unitCost, 0)).toLocaleString()}</span>
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead><tr style={{ background: C.gray50 }}>
                            <th style={{ padding: "6px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, borderBottom: `1px solid ${C.gray200}` }}>ITEM</th>
                            <th style={{ padding: "6px 10px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, borderBottom: `1px solid ${C.gray200}`, width: 80 }}>QTY</th>
                            <th style={{ padding: "6px 10px", textAlign: "center", fontSize: 10, fontWeight: 700, color: C.gray400, borderBottom: `1px solid ${C.gray200}`, width: 60 }}>UNIT</th>
                            <th style={{ padding: "6px 10px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, borderBottom: `1px solid ${C.gray200}`, width: 90 }}>UNIT COST</th>
                            <th style={{ padding: "6px 10px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, borderBottom: `1px solid ${C.gray200}`, width: 90 }}>LINE TOTAL</th>
                          </tr></thead>
                          <tbody>{asm.items.map((li, idx) => (
                            <tr key={li.id} style={{ borderBottom: `1px solid ${C.gray100}` }}>
                              <td style={{ padding: "6px 10px", color: C.navy, fontWeight: 500 }}>{li.item}{li.desc && <div style={{ fontSize: 10, color: C.gray400, marginTop: 1 }}>{li.desc.length > 80 ? li.desc.slice(0, 80) + "…" : li.desc}</div>}</td>
                              <td style={{ padding: "4px 4px" }}><input type="number" value={li.qty} onChange={e => { const v = parseFloat(e.target.value) || 0; setTpoAssemblies(prev => prev.map((a, i) => i === ai ? { ...a, items: a.items.map((it, j) => j === idx ? { ...it, qty: v } : it) } : a)); }} style={{ width: "100%", padding: "4px 6px", border: `1px solid ${C.gray200}`, borderRadius: 4, fontSize: 12, textAlign: "right", color: C.navy, boxSizing: "border-box" }} /></td>
                              <td style={{ padding: "6px 10px", textAlign: "center", color: C.gray500, fontSize: 11 }}>{li.unit}</td>
                              <td style={{ padding: "4px 4px" }}><input type="number" step="0.01" value={li.unitCost} onChange={e => { const v = parseFloat(e.target.value) || 0; setTpoAssemblies(prev => prev.map((a, i) => i === ai ? { ...a, items: a.items.map((it, j) => j === idx ? { ...it, unitCost: v } : it) } : a)); }} style={{ width: "100%", padding: "4px 6px", border: `1px solid ${li.unitCost === 0 ? C.red + "60" : C.gray200}`, borderRadius: 4, fontSize: 12, textAlign: "right", color: li.unitCost === 0 ? C.red : C.navy, boxSizing: "border-box" }} /></td>
                              <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: C.navy }}>${(li.qty * li.unitCost).toFixed(2)}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    ))}
                    {/* Items with $0 cost warning */}
                    {tpoAssemblies.some(a => a.items.some(li => li.unitCost === 0 && li.qty > 0)) && (
                      <div style={{ padding: "10px 14px", borderRadius: 8, background: C.yellowBg, border: `1px solid ${C.yellow}40`, marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.yellow }}>⚠ Some items have $0 unit cost — enter pricing above before continuing</div>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
                  <button onClick={() => setStep(1)} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>← Back</button>
                  {tpoAssemblies.length > 0 && <button onClick={() => setStep(3)} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: C.red, color: C.white, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Next → Pricing</button>}
                </div>
              </div>
            )}

            {/* STEP 2: Buildings (spreadsheet layout) — Shingle/Tile */}
            {step === 2 && estimateRoofType !== "TPO" && (
              <div>
                {/* RoofR upload */}
                <div style={{ background: C.white, borderRadius: 10, padding: "14px 20px", border: `2px dashed ${roofRProcessing ? C.blue : C.gray300}`, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>📄</span>
                    <div><div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>Import from RoofR</div><div style={{ fontSize: 11, color: C.gray500 }}>Upload PDF or Excel to auto-fill</div></div>
                  </div>
                  {roofRProcessing ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Spinner size={14} color={C.navy} /><span style={{ fontSize: 12, color: C.navy, fontWeight: 600 }}>Parsing...</span></div> : (
                    <div><button onClick={() => roofRInputRef.current?.click()} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: C.navy, color: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>{I.upload} Upload</button><input ref={roofRInputRef} type="file" accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleRoofRUpload(e.target.files[0]); e.target.value = ""; }} /></div>
                  )}
                </div>
                {roofRError && <div style={{ marginBottom: 12, padding: "8px 14px", borderRadius: 6, background: C.yellowBg, color: C.yellow, fontSize: 12 }}>{roofRError}</div>}

                {/* Spreadsheet table */}
                <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, overflow: "auto" }}>
                  {(() => {
                    const cellStyle = { padding: "0", border: "none", borderRight: `1px solid ${C.gray100}`, borderBottom: `1px solid ${C.gray100}` };
                    const inputStyle = { width: "100%", padding: "7px 6px", border: "none", outline: "none", fontSize: 12, color: C.navy, background: "transparent", boxSizing: "border-box", textAlign: "right" };
                    const textInputStyle = { ...inputStyle, textAlign: "left" };
                    const headerStyle = { padding: "6px 8px", fontSize: 9, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.04em", background: C.gray50, borderRight: `1px solid ${C.gray100}`, borderBottom: `2px solid ${C.gray200}`, whiteSpace: "nowrap", textAlign: "center" };
                    const cols = [
                      { key: "_num", label: "#", w: 32, type: "label" },
                      { key: "siteplanNum", label: "Siteplan", w: 80, type: "text" },
                      { key: "roofrNum", label: "RoofR #", w: 70, type: "text" },
                      { key: "predominantPitch", label: "Pitch", w: 65, type: "select", options: ["4/12","5/12","6/12","7/12","8/12","9/12","10/12","12/12"] },
                      { key: "phase", label: "Phase", w: 50, type: "num" },
                      { key: "pipes", label: "Pipes", w: 50, type: "num" },
                      { key: "totalArea", label: "Total Area", w: 85, type: "num", bold: true },
                      { key: "pitchedArea", label: "Pitched", w: 75, type: "num" },
                      { key: "flatArea", label: "Flat", w: 65, type: "num" },
                      { key: "eaves", label: "Eaves", w: 60, type: "num" },
                      { key: "valleys", label: "Valleys", w: 60, type: "num" },
                      { key: "hips", label: "Hips", w: 55, type: "num" },
                      { key: "ridges", label: "Ridges", w: 60, type: "num" },
                      { key: "rakes", label: "Rakes", w: 60, type: "num" },
                      { key: "wallFlashing", label: "Wall Fl.", w: 60, type: "num" },
                      { key: "stepFlashing", label: "Step Fl.", w: 60, type: "num" },
                      { key: "_sq", label: "Sq", w: 45, type: "calc" },
                      { key: "_del", label: "", w: 30, type: "action" },
                    ];
                    return (
                      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1050 }}>
                        <thead><tr>
                          {cols.map(c => <th key={c.key} style={{ ...headerStyle, width: c.w, minWidth: c.w }}>{c.label}</th>)}
                        </tr></thead>
                        <tbody>
                          {buildings.map((b, idx) => (
                            <tr key={b.id || idx} style={{ background: idx % 2 === 0 ? C.white : C.gray50 + "80" }}>
                              {cols.map(c => {
                                if (c.type === "label") return <td key={c.key} style={{ ...cellStyle, padding: "7px 8px", fontSize: 11, fontWeight: 700, color: C.gray500, textAlign: "center" }}>{idx + 1}</td>;
                                if (c.type === "calc") return <td key={c.key} style={{ ...cellStyle, padding: "7px 6px", fontSize: 11, fontWeight: 700, color: C.navy, textAlign: "center", background: C.greenBg + "60" }}>{b.totalArea > 0 ? Math.ceil(b.totalArea / 100) : "—"}</td>;
                                if (c.type === "action") return <td key={c.key} style={{ ...cellStyle, textAlign: "center", borderRight: "none" }}>{buildings.length > 1 && <button onClick={() => removeBuilding(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400, fontSize: 12, padding: "2px" }} title="Remove">×</button>}</td>;
                                if (c.type === "select") return <td key={c.key} style={cellStyle}><select value={b[c.key]} onChange={e => updateBuilding(idx, c.key, e.target.value)} style={{ ...inputStyle, textAlign: "left", cursor: "pointer", padding: "6px 2px" }}>{c.options.map(o => <option key={o} value={o}>{o}</option>)}</select></td>;
                                if (c.type === "text") return <td key={c.key} style={cellStyle}><input value={b[c.key] || ""} onChange={e => updateBuilding(idx, c.key, e.target.value)} style={textInputStyle} /></td>;
                                return <td key={c.key} style={cellStyle}><input type="number" value={b[c.key] || 0} onChange={e => updateBuilding(idx, c.key, e.target.value)} style={{ ...inputStyle, fontWeight: c.bold ? 700 : 400 }} onFocus={e => { if (e.target.value === "0") e.target.select(); }} /></td>;
                              })}
                            </tr>
                          ))}
                          {/* Totals row */}
                          <tr style={{ background: C.navy + "08" }}>
                            <td style={{ ...cellStyle, padding: "7px 8px", fontSize: 10, fontWeight: 700, color: C.navy, textAlign: "center" }} colSpan={6}>TOTALS</td>
                            <td style={{ ...cellStyle, padding: "7px 6px", fontSize: 12, fontWeight: 800, color: C.navy, textAlign: "right" }}>{buildings.reduce((s, b) => s + (b.totalArea || 0), 0).toLocaleString()}</td>
                            <td style={{ ...cellStyle, padding: "7px 6px", fontSize: 11, color: C.gray600, textAlign: "right" }}>{buildings.reduce((s, b) => s + (b.pitchedArea || 0), 0).toLocaleString()}</td>
                            <td style={{ ...cellStyle, padding: "7px 6px", fontSize: 11, color: C.gray600, textAlign: "right" }}>{buildings.reduce((s, b) => s + (b.flatArea || 0), 0).toLocaleString()}</td>
                            {["eaves","valleys","hips","ridges","rakes","wallFlashing","stepFlashing"].map(k => (
                              <td key={k} style={{ ...cellStyle, padding: "7px 6px", fontSize: 11, color: C.gray600, textAlign: "right" }}>{buildings.reduce((s, b) => s + (b[k] || 0), 0).toLocaleString()}</td>
                            ))}
                            <td style={{ ...cellStyle, padding: "7px 6px", fontSize: 12, fontWeight: 800, color: C.green, textAlign: "center", background: C.greenBg + "60" }}>{Math.ceil(buildings.reduce((s, b) => s + (b.totalArea || 0), 0) / 100)}</td>
                            <td style={{ ...cellStyle, borderRight: "none" }}></td>
                          </tr>
                        </tbody>
                      </table>
                    );
                  })()}
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 12 }}>
                  <button onClick={addBuilding} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{I.plus} Add Row</button>
                  <div style={{ display: "flex", gap: 8 }}><button onClick={() => setStep(1)} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>← Back</button><button onClick={() => setStep(3)} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: C.red, color: C.white, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Next → Pricing</button></div>
                </div>
              </div>
            )}

            {/* STEP 3: TPO Pricing */}
            {step === 3 && estimateRoofType === "TPO" && (() => {
              const tpoCalc = calcTPOEstimate(tpoAssemblies, tpoLabor, tpoEquip, financials);
              return (
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ background: C.white, borderRadius: 10, padding: 20, border: `1px solid ${C.gray200}` }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Labor Rates (per SF)</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {[["Installation", "installPerSf"], ["Tear-Off", "tearOffPerSf"], ["Cleanup & Haul", "cleanupPerSf"]].map(([label, key]) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><label style={{ fontSize: 11, color: C.gray600 }}>{label}</label><input style={numFs} type="number" step="0.01" value={tpoLabor[key]} onChange={e => setTpoLabor(l => ({ ...l, [key]: Number(e.target.value) }))} /></div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: C.gray500 }}>Total labor: ${((tpoLabor.installPerSf + tpoLabor.tearOffPerSf + tpoLabor.cleanupPerSf) * tpoCalc.totalSf).toLocaleString(undefined, { maximumFractionDigits: 0 })} ({tpoCalc.totalSf.toLocaleString()} SF × ${(tpoLabor.installPerSf + tpoLabor.tearOffPerSf + tpoLabor.cleanupPerSf).toFixed(2)}/SF)</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ background: C.white, borderRadius: 10, padding: 20, border: `1px solid ${C.gray200}` }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Equipment</h4>
                    {[["Lift / Crane Rental", "liftRental"], ["Dumpsters", "dumpsters"], ["Permits", "permitCost"], ["Safety Equipment", "safetyEquip"]].map(([label, key]) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}><label style={{ fontSize: 11, color: C.gray600 }}>{label}</label><input style={numFs} type="number" step="1" value={tpoEquip[key]} onChange={e => setTpoEquip(eq => ({ ...eq, [key]: Number(e.target.value) }))} /></div>
                    ))}
                  </div>
                  <div style={{ background: C.white, borderRadius: 10, padding: 20, border: `1px solid ${C.gray200}` }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Margin & Tax</h4>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}><label style={{ fontSize: 11, color: C.gray600 }}>Margin (%)</label><input style={numFs} type="number" step="0.01" value={financials.margin} onChange={e => setFin(f => ({ ...f, margin: Number(e.target.value) }))} /></div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}><label style={{ fontSize: 11, color: C.gray600 }}>Tax Rate</label><input style={numFs} type="number" step="0.001" value={financials.taxRate} onChange={e => setFin(f => ({ ...f, taxRate: Number(e.target.value) }))} /></div>
                    <div style={{ borderTop: `1px solid ${C.gray200}`, paddingTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 12, color: C.gray600 }}>Materials</span><span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>${tpoCalc.materialCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 12, color: C.gray600 }}>Accessories</span><span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>${tpoCalc.accessoryCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 12, color: C.gray600 }}>Labor</span><span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>${tpoCalc.laborCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 12, color: C.gray600 }}>Equipment</span><span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>${tpoCalc.equipCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 12, color: C.gray600 }}>Tax</span><span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>${tpoCalc.matTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 12, color: C.gray600 }}>Margin ({Math.round(financials.margin * 100)}%)</span><span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>${tpoCalc.margin.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${C.navy}`, paddingTop: 8, marginTop: 8 }}><span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>TOTAL</span><span style={{ fontSize: 16, fontWeight: 800, color: C.green }}>${tpoCalc.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={() => setStep(2)} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>← Back</button><button onClick={() => setStep(4)} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: C.red, color: C.white, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Next → Review</button></div>
              </div>
              );
            })()}

            {/* STEP 3: Shingle/Tile Pricing */}
            {step === 3 && estimateRoofType !== "TPO" && (
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ background: C.white, borderRadius: 10, padding: 20, border: `1px solid ${C.gray200}` }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Material Unit Prices</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {[["Shingles/bndl", "shinglePrice"], ["Hip & Ridge/bndl", "hipRidgePrice"], ["Starter/bndl", "starterPrice"], ["Underlayment/roll", "underlaymentPrice"], ["Ice & Water/roll", "iceWaterPrice"], ["Ridge Vent/ea", "ridgeVentPrice"], ["Step Flash/box", "stepFlashingPrice"], ["Drip Edge/ea", "dripEdgePrice"], ["Coil Nails/box", "coilNailPrice"], ["Cap Nails/box", "capNailPrice"], ["Pipe Boot/ea", "pipeBootPrice"], ["NP1/ea", "np1Price"]].map(([label, key]) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><label style={{ fontSize: 11, color: C.gray600 }}>{label}</label><input style={numFs} type="number" step="0.01" value={materials[key]} onChange={e => setMat(m => ({ ...m, [key]: Number(e.target.value) }))} /></div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ background: C.white, borderRadius: 10, padding: 20, border: `1px solid ${C.gray200}` }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Labor</h4>
                    {[["Tear-Off / sq", "tearOffRate"], ["OSB Labor / sheet", "osbLabor"], ["OSB Material / sheet", "osbMaterial"], ["OSB Sheets (total)", "osbSheets"]].map(([label, key]) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}><label style={{ fontSize: 11, color: C.gray600 }}>{label}</label><input style={numFs} type="number" step="0.01" value={labor[key]} onChange={e => setLab(l => ({ ...l, [key]: Number(e.target.value) }))} /></div>
                    ))}
                  </div>
                  <div style={{ background: C.white, borderRadius: 10, padding: 20, border: `1px solid ${C.gray200}` }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Equipment & Other</h4>
                    {[["Forklift", "forkliftCost"], ["Dumpster", "dumpsterCost"], ["Permit", "permitCost"]].map(([label, key]) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}><label style={{ fontSize: 11, color: C.gray600 }}>{label}</label><input style={numFs} type="number" step="0.01" value={equipment[key]} onChange={e => setEquip(eq => ({ ...eq, [key]: Number(e.target.value) }))} /></div>
                    ))}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}><label style={{ fontSize: 11, color: C.gray600 }}>Include Permit</label><input type="checkbox" checked={equipment.includePermit} onChange={e => setEquip(eq => ({ ...eq, includePermit: e.target.checked }))} /></div>
                    <div style={{ borderTop: `1px solid ${C.gray200}`, paddingTop: 10, marginTop: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}><label style={{ fontSize: 11, color: C.gray600 }}>Margin</label><input style={numFs} type="number" step="0.01" value={financials.margin} onChange={e => setFin(f => ({ ...f, margin: Number(e.target.value) }))} /></div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><label style={{ fontSize: 11, color: C.gray600 }}>Tax Rate</label><input style={numFs} type="number" step="0.001" value={financials.taxRate} onChange={e => setFin(f => ({ ...f, taxRate: Number(e.target.value) }))} /></div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={() => setStep(2)} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>← Back</button><button onClick={() => setStep(4)} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: C.red, color: C.white, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Next → Review</button></div>
              </div>
            )}

            {/* STEP 4: TPO Review */}
            {step === 4 && estimateRoofType === "TPO" && (() => {
              const tpoCalc = calcTPOEstimate(tpoAssemblies, tpoLabor, tpoEquip, financials);
              return (
              <div>
                <div style={{ background: C.white, borderRadius: 10, padding: 24, border: `1px solid ${C.gray200}`, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: "0 0 4px" }}>{selectedLead?.jobName || leadCompany?.name || "—"} — TPO Estimate</h3>
                  <p style={{ fontSize: 13, color: C.gray500, margin: "0 0 16px" }}>{leadCompany?.name && selectedLead?.jobName ? `🏢 ${leadCompany.name} · ` : ""}{leadProperty?.name || ""} · Estimator: {selectedLead?.estimator || "—"}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
                    <div style={{ padding: "12px 16px", borderRadius: 8, background: C.gray50 }}><p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 4px" }}>Roof Sections</p><p style={{ fontSize: 20, fontWeight: 800, color: C.navy, margin: 0 }}>{tpoAssemblies.length}</p></div>
                    <div style={{ padding: "12px 16px", borderRadius: 8, background: C.gray50 }}><p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 4px" }}>Total Area</p><p style={{ fontSize: 20, fontWeight: 800, color: C.navy, margin: 0 }}>{Math.round(tpoCalc.totalSf).toLocaleString()} SF</p></div>
                    <div style={{ padding: "12px 16px", borderRadius: 8, background: C.gray50 }}><p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 4px" }}>Price / SF</p><p style={{ fontSize: 20, fontWeight: 800, color: C.navy, margin: 0 }}>${tpoCalc.pricePerSf.toFixed(2)}</p></div>
                    <div style={{ padding: "12px 16px", borderRadius: 8, background: C.greenBg }}><p style={{ fontSize: 10, fontWeight: 700, color: C.green, textTransform: "uppercase", margin: "0 0 4px" }}>Total Price</p><p style={{ fontSize: 20, fontWeight: 800, color: C.green, margin: 0 }}>${Math.round(tpoCalc.total).toLocaleString()}</p></div>
                  </div>
                  {/* Cost breakdown */}
                  <div style={{ borderRadius: 8, border: `1px solid ${C.gray200}`, overflow: "hidden", marginBottom: 16 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead><tr style={{ background: C.gray50 }}><th style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400 }}>CATEGORY</th><th style={{ padding: "8px 12px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400 }}>AMOUNT</th></tr></thead>
                      <tbody>
                        <tr style={{ borderTop: `1px solid ${C.gray100}` }}><td style={{ padding: "8px 12px", color: C.navy }}>Materials</td><td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: C.navy }}>${tpoCalc.materialCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td></tr>
                        <tr style={{ borderTop: `1px solid ${C.gray100}` }}><td style={{ padding: "8px 12px", color: C.navy }}>Accessories & Flashing</td><td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: C.navy }}>${tpoCalc.accessoryCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td></tr>
                        <tr style={{ borderTop: `1px solid ${C.gray100}` }}><td style={{ padding: "8px 12px", color: C.navy }}>Labor ({tpoCalc.totalSf.toLocaleString()} SF × ${(tpoLabor.installPerSf + tpoLabor.tearOffPerSf + tpoLabor.cleanupPerSf).toFixed(2)})</td><td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: C.navy }}>${tpoCalc.laborCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td></tr>
                        <tr style={{ borderTop: `1px solid ${C.gray100}` }}><td style={{ padding: "8px 12px", color: C.navy }}>Equipment</td><td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: C.navy }}>${tpoCalc.equipCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td></tr>
                        <tr style={{ borderTop: `1px solid ${C.gray100}` }}><td style={{ padding: "8px 12px", color: C.gray500 }}>Material Tax ({(financials.taxRate * 100).toFixed(1)}%)</td><td style={{ padding: "8px 12px", textAlign: "right", color: C.gray600 }}>${tpoCalc.matTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td></tr>
                        <tr style={{ borderTop: `1px solid ${C.gray100}` }}><td style={{ padding: "8px 12px", color: C.gray500 }}>Margin ({Math.round(financials.margin * 100)}%)</td><td style={{ padding: "8px 12px", textAlign: "right", color: C.gray600 }}>${tpoCalc.margin.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td></tr>
                      </tbody>
                      <tfoot><tr style={{ background: C.navy + "08" }}><td style={{ padding: "10px 12px", fontWeight: 700, color: C.navy }}>Grand Total</td><td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontSize: 15, color: C.green }}>${Math.round(tpoCalc.total).toLocaleString()}</td></tr></tfoot>
                    </table>
                  </div>
                  {/* Assembly breakdown */}
                  {tpoAssemblies.map(asm => (
                    <div key={asm.id} style={{ marginBottom: 8, padding: "10px 14px", borderRadius: 8, background: C.gray50, border: `1px solid ${C.gray100}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{asm.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{asm.items.length} items · ${Math.round(asm.items.reduce((t, li) => t + li.qty * li.unitCost, 0)).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                  <button onClick={() => setStep(3)} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>← Back</button>
                  <button onClick={handleSubmitEstimate} disabled={saving} style={{ padding: "12px 32px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.green}, #059669)`, color: C.white, fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>{saving ? <Spinner size={14} /> : "✓"} {editingEstimateId ? "Update Estimate" : "Submit for Approval"}</button>
                </div>
              </div>
              );
            })()}

            {/* STEP 4: Shingle/Tile Review */}
            {step === 4 && estimateRoofType !== "TPO" && (
              <div>
                <div style={{ background: C.white, borderRadius: 10, padding: 24, border: `1px solid ${C.gray200}`, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: "0 0 4px" }}>{selectedLead?.jobName || leadCompany?.name || "—"}</h3>
                  <p style={{ fontSize: 13, color: C.gray500, margin: "0 0 16px" }}>{leadCompany?.name && selectedLead?.jobName ? `🏢 ${leadCompany.name} · ` : ""}{leadProperty?.name || ""} · {leadContact?.name || ""} · Estimator: {selectedLead?.estimator || "—"}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
                    <div style={{ padding: "12px 16px", borderRadius: 8, background: C.gray50 }}><p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 4px" }}>Buildings</p><p style={{ fontSize: 20, fontWeight: 800, color: C.navy, margin: 0 }}>{buildings.length}</p></div>
                    <div style={{ padding: "12px 16px", borderRadius: 8, background: C.gray50 }}><p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 4px" }}>Total Sq Ft</p><p style={{ fontSize: 20, fontWeight: 800, color: C.navy, margin: 0 }}>{totalSq.toLocaleString()}</p></div>
                    <div style={{ padding: "12px 16px", borderRadius: 8, background: C.gray50 }}><p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", margin: "0 0 4px" }}>Margin</p><p style={{ fontSize: 20, fontWeight: 800, color: C.navy, margin: 0 }}>{Math.round(financials.margin * 100)}%</p></div>
                    <div style={{ padding: "12px 16px", borderRadius: 8, background: C.greenBg }}><p style={{ fontSize: 10, fontWeight: 700, color: C.green, textTransform: "uppercase", margin: "0 0 4px" }}>Total Price</p><p style={{ fontSize: 20, fontWeight: 800, color: C.green, margin: 0 }}>{formatCurrency(grandTotal)}</p></div>
                  </div>
                  <div style={{ borderRadius: 8, border: `1px solid ${C.gray200}`, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead><tr style={{ background: C.gray50 }}><th style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Bldg</th><th style={{ padding: "8px 8px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Area</th><th style={{ padding: "8px 8px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Waste</th><th style={{ padding: "8px 8px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Material</th><th style={{ padding: "8px 8px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Labor+Equip</th><th style={{ padding: "8px 8px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Tax</th><th style={{ padding: "8px 8px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Margin</th><th style={{ padding: "8px 10px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Total</th></tr></thead>
                      <tbody>{results.map((r, i) => (<tr key={i} style={{ borderTop: `1px solid ${C.gray100}` }}><td style={{ padding: "8px 10px", fontWeight: 600, color: C.navy }}>{buildings[i]?.siteplanNum || `Bldg ${i + 1}`}</td><td style={{ padding: "8px 8px", textAlign: "right", color: C.gray600 }}>{buildings[i]?.totalArea?.toLocaleString()} sf</td><td style={{ padding: "8px 8px", textAlign: "right", color: C.gray600 }}>{Math.round(r.waste * 100)}%</td><td style={{ padding: "8px 8px", textAlign: "right", color: C.navy }}>{fmt(r.materialCost)}</td><td style={{ padding: "8px 8px", textAlign: "right", color: C.navy }}>{fmt(r.laborCost)}</td><td style={{ padding: "8px 8px", textAlign: "right", color: C.gray600 }}>{fmt(r.materialTax)}</td><td style={{ padding: "8px 8px", textAlign: "right", color: C.gray600 }}>{fmt(r.marginAmt)}</td><td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: C.navy }}>{fmt(r.totalPrice)}</td></tr>))}</tbody>
                      <tfoot><tr style={{ background: C.navy + "08" }}><td colSpan="7" style={{ padding: "10px", textAlign: "right", fontWeight: 700, color: C.navy }}>Grand Total:</td><td style={{ padding: "10px", textAlign: "right", fontWeight: 800, fontSize: 15, color: C.green }}>{formatCurrency(grandTotal)}</td></tr></tfoot>
                    </table>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                  <button onClick={() => setStep(3)} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>← Back</button>
                  <button onClick={handleSubmitEstimate} disabled={saving} style={{ padding: "12px 32px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.green}, #059669)`, color: C.white, fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>{saving ? <Spinner size={14} /> : "✓"} {editingEstimateId ? "Update Estimate" : "Submit for Approval"}</button>
                </div>
              </div>
            )}
          </div>
        );
      }

      // ════════════════════════════════════════════════════════════
      // SUBMISSIONS LIST VIEW
      // ════════════════════════════════════════════════════════════
      return (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div><h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.navy }}>All Estimates</h2><p style={{ margin: "4px 0 0", fontSize: 13, color: C.gray500 }}>Review, approve, and award submitted estimates</p></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setView("kanban")} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer", color: C.gray600 }}>← Back to Board</button>
              <button onClick={refresh} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer", color: C.gray600 }}>Refresh</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {[{ key: "all", label: "All" }, { key: "pending", label: "Pending" }, { key: "approved", label: "Approved" }, { key: "awarded", label: "Awarded" }].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: "6px 14px", borderRadius: 20, border: "none", background: filter === f.key ? C.navy : C.gray100, color: filter === f.key ? C.white : C.gray700, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{f.label} ({counts[f.key] || 0})</button>
            ))}
          </div>
          {loading ? <div style={{ padding: 48, textAlign: "center", color: C.gray400 }}>Loading...</div> : filteredSubs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}` }}><div style={{ fontSize: 36, opacity: 0.2, marginBottom: 12 }}>📋</div><div style={{ color: C.gray500 }}>{submissions.length === 0 ? "No estimates yet." : `No ${filter} estimates.`}</div></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredSubs.map(sub => {
                const statusColors = { pending: { bg: C.yellowBg, color: C.yellow }, approved: { bg: C.greenBg, color: C.green }, rejected: { bg: C.redBg, color: C.red }, awarded: { bg: C.blueBg, color: C.blue }, not_selected: { bg: C.gray100, color: C.gray400 } };
                const sc = statusColors[sub.status] || statusColors.pending;
                const isExpanded = expandedEstimate === sub.id;
                return (
                  <div key={sub.id} style={{ background: C.white, border: `1px solid ${isExpanded ? C.navy + "40" : C.gray200}`, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }} onClick={() => setExpandedEstimate(isExpanded ? null : sub.id)}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}><span style={{ fontWeight: 700, fontSize: 15, color: C.navy }}>{sub.leadName || sub.project?.jobName || "Untitled"}</span><span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: "uppercase", background: sc.bg, color: sc.color }}>{sub.status}</span></div>
                        <div style={{ fontSize: 12, color: C.gray500, display: "flex", gap: 16 }}><span>{sub.project?.companyName}</span><span>{sub.buildings?.length || 0} bldgs</span><span>by {sub.submittedBy || "—"}</span></div>
                      </div>
                      <div style={{ textAlign: "right", marginRight: 8 }}><div style={{ fontWeight: 700, fontSize: 18, fontFamily: "monospace", color: C.navy }}>{fmt(sub.totalPrice || 0)}</div><div style={{ fontSize: 11, color: C.gray400 }}>{new Date(sub.createdAt).toLocaleDateString()}</div></div>
                      <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                        {sub.status === "pending" && (role === "admin" || role === "lead_estimator") && <button onClick={() => handleApprove(sub)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: C.green, color: C.white, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✓ Approve</button>}
                        {sub.status === "approved" && (role === "admin" || role === "estimator") && <button onClick={() => handleAward(sub)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: C.blue, color: C.white, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🏆 Award</button>}
                        <button onClick={() => setShowEmail(sub)} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>📧</button>
                      </div>
                    </div>
                    {isExpanded && <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.gray100}` }}>
                      {/* Estimate Detail View */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 16 }}>
                        <div style={{ padding: "10px 14px", borderRadius: 8, background: C.gray50, border: `1px solid ${C.gray200}` }}><div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Roof Type</div><div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginTop: 2 }}>{sub.estimateRoofType || "—"}</div></div>
                        <div style={{ padding: "10px 14px", borderRadius: 8, background: C.gray50, border: `1px solid ${C.gray200}` }}><div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Market</div><div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginTop: 2 }}>{sub.market || sub.project?.market || "—"}</div></div>
                        <div style={{ padding: "10px 14px", borderRadius: 8, background: C.gray50, border: `1px solid ${C.gray200}` }}><div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Address</div><div style={{ fontSize: 12, fontWeight: 600, color: C.navy, marginTop: 2 }}>{sub.project?.address || "—"}</div></div>
                        <div style={{ padding: "10px 14px", borderRadius: 8, background: C.greenBg, border: `1px solid ${C.green}30` }}><div style={{ fontSize: 10, fontWeight: 700, color: C.green, textTransform: "uppercase" }}>Total Price</div><div style={{ fontSize: 18, fontWeight: 800, color: C.green, marginTop: 2 }}>{fmt(sub.totalPrice || 0)}</div></div>
                      </div>
                      {/* Buildings breakdown */}
                      {sub.buildings && sub.buildings.length > 0 && <div style={{ marginBottom: 16 }}>
                        <h4 style={{ fontSize: 12, fontWeight: 700, color: C.navy, margin: "0 0 8px" }}>Buildings ({sub.buildings.length})</h4>
                        <div style={{ borderRadius: 8, border: `1px solid ${C.gray200}`, overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead><tr style={{ background: C.gray50 }}>
                              <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: C.gray400, fontSize: 10 }}>Building</th>
                              <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: C.gray400, fontSize: 10 }}>Total Area</th>
                              <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: C.gray400, fontSize: 10 }}>Pitched</th>
                              <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: C.gray400, fontSize: 10 }}>Flat</th>
                              <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: C.gray400, fontSize: 10 }}>Pitch</th>
                              <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: C.gray400, fontSize: 10 }}>Phase</th>
                            </tr></thead>
                            <tbody>{sub.buildings.map((b, i) => <tr key={i} style={{ borderTop: `1px solid ${C.gray100}` }}>
                              <td style={{ padding: "8px 10px", fontWeight: 600, color: C.navy }}>{b.siteplanNum || `Bldg ${i+1}`}</td>
                              <td style={{ padding: "8px 10px", textAlign: "right", color: C.gray600 }}>{(b.totalArea || 0).toLocaleString()} sf</td>
                              <td style={{ padding: "8px 10px", textAlign: "right", color: C.gray600 }}>{(b.pitchedArea || 0).toLocaleString()} sf</td>
                              <td style={{ padding: "8px 10px", textAlign: "right", color: C.gray600 }}>{(b.flatArea || 0).toLocaleString()} sf</td>
                              <td style={{ padding: "8px 10px", textAlign: "center", color: C.gray600 }}>{b.predominantPitch || "—"}</td>
                              <td style={{ padding: "8px 10px", textAlign: "center", color: C.gray600 }}>{b.phase || 1}</td>
                            </tr>)}</tbody>
                          </table>
                        </div>
                      </div>}
                      {/* Pricing breakdown per building */}
                      {sub.results && sub.results.length > 0 && <div style={{ marginBottom: 16 }}>
                        <h4 style={{ fontSize: 12, fontWeight: 700, color: C.navy, margin: "0 0 8px" }}>Pricing Breakdown</h4>
                        <div style={{ borderRadius: 8, border: `1px solid ${C.gray200}`, overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead><tr style={{ background: C.gray50 }}>
                              <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: C.gray400, fontSize: 10 }}>Building</th>
                              <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: C.gray400, fontSize: 10 }}>Materials</th>
                              <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: C.gray400, fontSize: 10 }}>Labor/Equip</th>
                              <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: C.gray400, fontSize: 10 }}>Tax</th>
                              <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: C.gray400, fontSize: 10 }}>Margin</th>
                              <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: C.gray400, fontSize: 10 }}>Total</th>
                              <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: C.gray400, fontSize: 10 }}>$/SQ</th>
                            </tr></thead>
                            <tbody>{sub.results.map((r, i) => <tr key={i} style={{ borderTop: `1px solid ${C.gray100}` }}>
                              <td style={{ padding: "8px 10px", fontWeight: 600, color: C.navy }}>{r.siteplanNum || `Bldg ${i+1}`}</td>
                              <td style={{ padding: "8px 10px", textAlign: "right", color: C.gray600 }}>{fmt(r.materialCost || 0)}</td>
                              <td style={{ padding: "8px 10px", textAlign: "right", color: C.gray600 }}>{fmt(r.laborCost || 0)}</td>
                              <td style={{ padding: "8px 10px", textAlign: "right", color: C.gray600 }}>{fmt(r.materialTax || 0)}</td>
                              <td style={{ padding: "8px 10px", textAlign: "right", color: C.gray600 }}>{fmt(r.marginAmt || 0)}</td>
                              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: C.navy }}>{fmt(r.totalPrice || 0)}</td>
                              <td style={{ padding: "8px 10px", textAlign: "right", color: C.gray500 }}>{fmt(r.pricePerSq || 0)}</td>
                            </tr>)}
                            <tr style={{ borderTop: `2px solid ${C.gray300}`, background: C.navy + "06" }}>
                              <td style={{ padding: "10px", fontWeight: 800, color: C.navy }} colSpan="5">Grand Total</td>
                              <td style={{ padding: "10px", textAlign: "right", fontWeight: 800, fontSize: 14, color: C.green }}>{fmt(sub.totalPrice || 0)}</td>
                              <td style={{ padding: "10px" }}></td>
                            </tr></tbody>
                          </table>
                        </div>
                      </div>}
                      {/* Material & financial settings */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                        {sub.financials && <div style={{ padding: "12px 14px", borderRadius: 8, background: C.gray50, border: `1px solid ${C.gray200}` }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", marginBottom: 6 }}>Financial Settings</div>
                          <div style={{ fontSize: 12, color: C.gray600 }}>Margin: {((sub.financials.margin || 0) * 100).toFixed(0)}% · Tax: {((sub.financials.taxRate || 0) * 100).toFixed(1)}%</div>
                        </div>}
                        {sub.equipment && <div style={{ padding: "12px 14px", borderRadius: 8, background: C.gray50, border: `1px solid ${C.gray200}` }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", marginBottom: 6 }}>Equipment</div>
                          <div style={{ fontSize: 12, color: C.gray600 }}>Forklift: {fmt(sub.equipment.forkliftCost || 0)} · Dumpster: {fmt(sub.equipment.dumpsterCost || 0)}{sub.equipment.includePermit ? ` · Permit: ${fmt(sub.equipment.permitCost || 0)}` : ""}</div>
                        </div>}
                      </div>
                      {/* Edit button */}
                      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                        <button onClick={(e) => { e.stopPropagation(); editEstimate(sub); }} style={{ padding: "8px 18px", borderRadius: 6, border: `1px solid ${C.navy}30`, background: C.white, color: C.navy, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✏️ Edit Estimate</button>
                      </div>
                      {/* Tasks */}
                      <TasksPanel objectType="estimate" objectId={sub.id} user={user} crmUsers={crmUsers} />
                    </div>}
                  </div>
                );
              })}
            </div>
          )}
          {showEmail && <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }} onClick={() => setShowEmail(null)}><div style={{ width: 480 }} onClick={e => e.stopPropagation()}><EmailCompose defaultSubject={`Colony Roofers — Estimate for ${showEmail.leadName || showEmail.project?.jobName}`} defaultBody={`Hey,\n\nHope all is well. Attached is our estimate — total: ${fmt(showEmail.totalPrice || 0)}.\n\nLet me know if you have any questions.\n\nZach Reece, Owner\nColony Roofers\n404-806-0956`} onCancel={() => setShowEmail(null)} onSent={() => setShowEmail(null)} /></div></div>}
          {showAwardPicker && (() => {
            const leadEstimates = submissions.filter(s => s.leadId === showAwardPicker && s.status === "approved");
            return (<div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }} onClick={() => setShowAwardPicker(null)}><div style={{ background: C.white, borderRadius: 16, width: 520, maxHeight: "80vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${C.gray200}` }}><h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: "0 0 4px" }}>Select Winning Estimate</h2><p style={{ fontSize: 13, color: C.gray500, margin: 0 }}>This job has {leadEstimates.length} approved estimates. Choose which becomes the budget.</p></div>
              <div style={{ padding: "16px 28px 28px" }}>{leadEstimates.map(est => (<div key={est.id} style={{ padding: "16px", borderRadius: 10, border: `1px solid ${C.gray200}`, marginBottom: 10, cursor: "pointer" }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.background = C.greenBg + "40"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.gray200; e.currentTarget.style.background = "transparent"; }} onClick={() => doAward(est)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{est.leadName}</span><span style={{ fontSize: 16, fontWeight: 800, color: C.green }}>{fmt(est.totalPrice || 0)}</span></div>
                <div style={{ fontSize: 12, color: C.gray500 }}>{est.buildings?.length || 0} bldgs · by {est.submittedBy} · {new Date(est.createdAt).toLocaleDateString()}</div>
                <div style={{ marginTop: 8, fontSize: 11, color: C.green, fontWeight: 600 }}>Click to award →</div>
              </div>))}<button onClick={() => setShowAwardPicker(null)} style={{ marginTop: 8, padding: "10px 0", width: "100%", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button></div>
            </div></div>);
          })()}
        </div>
      );
    }

    // ============================================================
    // MODULE: PRODUCTION (placeholder — full code in Phase 2)
    // ============================================================

    // ============================================================
    // CREW MANAGEMENT COMPONENT
    // ============================================================

export default EstimatingModule;
