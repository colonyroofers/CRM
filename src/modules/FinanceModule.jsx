import React, { useState, useMemo, useRef, useCallback } from 'react';
import { C, formatCurrency, fmt } from '../utils/constants';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';

    function FinanceModule({ user, role }) {
      const [invoices, saveInvoices] = useFirestoreCollection("cr_invoices", []);
      const invoicesRef = useRef(invoices); invoicesRef.current = invoices;
      const setInvoices = useCallback(u => { const n = typeof u === "function" ? u(invoicesRef.current) : u; saveInvoices(n); }, [saveInvoices]);

      const [scheduleOfValues, saveSov] = useFirestoreCollection("cr_schedule_of_values", []);
      const sovRef = useRef(scheduleOfValues); sovRef.current = scheduleOfValues;
      const setSov = useCallback(u => { const n = typeof u === "function" ? u(sovRef.current) : u; saveSov(n); }, [saveSov]);

      const [activeTab, setActiveTab] = useState("invoices");
      const [showCreateInvoice, setShowCreateInvoice] = useState(false);
      const [invoiceForm, setInvoiceForm] = useState({ projectName: "", clientName: "", clientEmail: "", items: [{ description: "", quantity: 1, unitPrice: 0 }], notes: "", dueDate: "" });
      const [selectedSov, setSelectedSov] = useState(null);

      const formatCurrency = (n) => "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const addInvoiceItem = () => setInvoiceForm(f => ({ ...f, items: [...f.items, { id: generateId(), description: "", quantity: 1, unitPrice: 0 }] }));
      const updateInvoiceItem = (idx, field, val) => setInvoiceForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [field]: val } : it) }));
      const removeInvoiceItem = (idx) => setInvoiceForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

      const invoiceTotal = invoiceForm.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

      const handleCreateInvoice = () => {
        if (!invoiceForm.projectName || !invoiceForm.clientName) { alert("Project and client name are required."); return; }
        const inv = { id: generateId(), ...invoiceForm, total: invoiceTotal, status: "draft", createdAt: new Date().toISOString(), createdBy: user.name, invoiceNumber: `INV-${String(invoices.length + 1001).padStart(4, "0")}` };
        setInvoices(prev => [inv, ...prev]);
        setInvoiceForm({ projectName: "", clientName: "", clientEmail: "", items: [{ description: "", quantity: 1, unitPrice: 0 }], notes: "", dueDate: "" });
        setShowCreateInvoice(false);
      };

      const updateInvoiceStatus = (id, status) => setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status, [`${status}At`]: new Date().toISOString(), [`${status}By`]: user.name } : inv));

      const generateInvoiceFromSov = (sov) => {
        const pendingItems = (sov.items || []).filter(it => !it.invoiced && it.percentComplete > 0);
        if (pendingItems.length === 0) { alert("No uninvoiced completed work found."); return; }
        setInvoiceForm({
          projectName: sov.projectName || "",
          clientName: sov.clientName || "",
          clientEmail: sov.clientEmail || "",
          items: pendingItems.map(it => ({ description: `${it.description} (${it.percentComplete}% complete)`, quantity: 1, unitPrice: (it.value || 0) * (it.percentComplete / 100) })),
          notes: `Generated from Schedule of Values for ${sov.projectName}`,
          dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
        });
        setShowCreateInvoice(true);
      };

      const totalInvoiced = invoices.filter(i => i.status !== "void").reduce((s, i) => s + (i.total || 0), 0);
      const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
      const totalOutstanding = invoices.filter(i => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + (i.total || 0), 0);

      const fs = { width: "100%", padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 13, color: C.navy, outline: "none" };

      return (
        <div style={{ background: C.gray50, minHeight: "calc(100vh - 56px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div><h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, margin: 0 }}>Finance</h1><p style={{ fontSize: 14, color: C.gray500, margin: "4px 0 0" }}>Invoicing, schedule of values & job costing</p></div>
              <button onClick={() => setShowCreateInvoice(true)} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: C.red, color: C.white, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ New Invoice</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              <StatCard label="Total Invoiced" value={formatCurrency(totalInvoiced)} icon={I.dollar} accent={C.navy} />
              <StatCard label="Paid" value={formatCurrency(totalPaid)} icon={I.barChart} accent={C.green} />
              <StatCard label="Outstanding" value={formatCurrency(totalOutstanding)} icon={I.clock} accent={C.yellow} />
              <StatCard label="Invoices" value={String(invoices.length)} icon={I.layers} accent={C.blue} />
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 2, marginBottom: 16, background: C.gray100, borderRadius: 8, padding: 3 }}>
              {[{ id: "invoices", label: "Invoices", icon: "📄" }, { id: "sov", label: "Schedule of Values", icon: "📊" }, { id: "sage", label: "Sage Intacct", icon: "🔗" }].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "none", background: activeTab === t.id ? C.white : "transparent", color: activeTab === t.id ? C.navy : C.gray500, fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: activeTab === t.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>{t.icon} {t.label}</button>
              ))}
            </div>

            {/* Create Invoice Modal */}
            {showCreateInvoice && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowCreateInvoice(false)}>
                <div style={{ background: C.white, borderRadius: 12, width: 700, maxHeight: "85vh", overflow: "auto", padding: 32 }} onClick={e => e.stopPropagation()}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: "0 0 20px" }}>Create Invoice</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div><label style={{ fontSize: 11, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 3 }}>Project Name *</label><input style={fs} value={invoiceForm.projectName} onChange={e => setInvoiceForm(f => ({ ...f, projectName: e.target.value }))} /></div>
                    <div><label style={{ fontSize: 11, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 3 }}>Client Name *</label><input style={fs} value={invoiceForm.clientName} onChange={e => setInvoiceForm(f => ({ ...f, clientName: e.target.value }))} /></div>
                    <div><label style={{ fontSize: 11, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 3 }}>Client Email</label><input style={fs} value={invoiceForm.clientEmail} onChange={e => setInvoiceForm(f => ({ ...f, clientEmail: e.target.value }))} /></div>
                    <div><label style={{ fontSize: 11, fontWeight: 600, color: C.gray500, display: "block", marginBottom: 3 }}>Due Date</label><input type="date" style={fs} value={invoiceForm.dueDate} onChange={e => setInvoiceForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>Line Items</span>
                      <button onClick={addInvoiceItem} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, fontSize: 11, fontWeight: 600, cursor: "pointer", color: C.navy }}>+ Add Line</button>
                    </div>
                    {invoiceForm.items.map((it, idx) => (
                      <div key={it.id || ('inv_' + idx)} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr auto", gap: 8, marginBottom: 6 }}>
                        <input style={fs} placeholder="Description" value={it.description} onChange={e => updateInvoiceItem(idx, "description", e.target.value)} />
                        <input style={{ ...fs, textAlign: "right" }} type="number" min="0" placeholder="Qty" value={it.quantity} onChange={e => updateInvoiceItem(idx, "quantity", e.target.value)} />
                        <input style={{ ...fs, textAlign: "right" }} type="number" min="0" placeholder="Price" value={it.unitPrice} onChange={e => updateInvoiceItem(idx, "unitPrice", e.target.value)} />
                        <button onClick={() => removeInvoiceItem(idx)} style={{ background: "none", border: "none", color: C.gray300, cursor: "pointer", fontSize: 18, padding: "0 4px" }}>×</button>
                      </div>
                    ))}
                    <div style={{ textAlign: "right", fontSize: 16, fontWeight: 800, color: C.navy, padding: "8px 0" }}>Total: {formatCurrency(invoiceTotal)}</div>
                  </div>
                  <textarea style={{ ...fs, marginBottom: 16 }} rows={2} placeholder="Notes (optional)" value={invoiceForm.notes} onChange={e => setInvoiceForm(f => ({ ...f, notes: e.target.value }))} />
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => setShowCreateInvoice(false)} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    <button onClick={handleCreateInvoice} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: C.navy, color: C.white, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Create Invoice</button>
                  </div>
                </div>
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === "invoices" && (
              <div>
                {invoices.length === 0 ? (
                  <div style={{ padding: 48, textAlign: "center", background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}` }}>
                    <div style={{ fontSize: 48, opacity: 0.15, marginBottom: 12 }}>📄</div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: C.navy }}>No invoices yet</p>
                    <p style={{ fontSize: 13, color: C.gray500 }}>Create an invoice or generate one from a Schedule of Values.</p>
                  </div>
                ) : invoices.map(inv => (
                  <div key={inv.id} style={{ padding: "16px 20px", borderRadius: 10, border: `1px solid ${C.gray200}`, background: C.white, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{inv.invoiceNumber}</span>
                        <span style={{ fontSize: 12, color: C.gray500, marginLeft: 12 }}>{inv.projectName} — {inv.clientName}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>{formatCurrency(inv.total)}</span>
                        <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: { draft: C.gray100, sent: C.yellowBg, paid: C.greenBg, overdue: C.redBg, void: C.gray100 }[inv.status] || C.gray100, color: { draft: C.gray500, sent: C.yellow, paid: C.green, overdue: C.red, void: C.gray400 }[inv.status] || C.gray500 }}>{inv.status}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, fontSize: 10, color: C.gray400 }}>
                      <span>Created {new Date(inv.createdAt).toLocaleDateString()} by {inv.createdBy}</span>
                      {inv.dueDate && <span>· Due {new Date(inv.dueDate).toLocaleDateString()}</span>}
                      {inv.items && <span>· {inv.items.length} line item{inv.items.length !== 1 ? "s" : ""}</span>}
                    </div>
                    {inv.status === "draft" && (
                      <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                        <button onClick={() => updateInvoiceStatus(inv.id, "sent")} style={{ padding: "4px 12px", borderRadius: 5, border: "none", background: C.blue, color: C.white, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>📧 Mark Sent</button>
                        <button onClick={() => updateInvoiceStatus(inv.id, "void")} style={{ padding: "4px 12px", borderRadius: 5, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray500, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Void</button>
                      </div>
                    )}
                    {inv.status === "sent" && (
                      <div style={{ marginTop: 8 }}>
                        <button onClick={() => updateInvoiceStatus(inv.id, "paid")} style={{ padding: "4px 12px", borderRadius: 5, border: "none", background: C.green, color: C.white, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>✓ Mark Paid</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Schedule of Values Tab */}
            {activeTab === "sov" && (
              <div>
                <div style={{ marginBottom: 16, fontSize: 12, color: C.gray500 }}>Schedule of Values are created from projects. Each project can have line items with completion percentages that generate invoices.</div>
                {scheduleOfValues.length === 0 ? (
                  <div style={{ padding: 48, textAlign: "center", background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}` }}>
                    <div style={{ fontSize: 48, opacity: 0.15, marginBottom: 12 }}>📊</div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: C.navy }}>No Schedules of Values yet</p>
                    <p style={{ fontSize: 13, color: C.gray500 }}>Add a Schedule of Values from the Project detail view to track progress billing.</p>
                  </div>
                ) : scheduleOfValues.map(sov => (
                  <div key={sov.id} style={{ padding: "16px 20px", borderRadius: 10, border: `1px solid ${C.gray200}`, background: C.white, marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{sov.projectName}</div>
                        <div style={{ fontSize: 11, color: C.gray500 }}>{sov.clientName} · Total: {formatCurrency((sov.items || []).reduce((s, it) => s + (it.value || 0), 0))}</div>
                      </div>
                      <button onClick={() => generateInvoiceFromSov(sov)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: C.navy, color: C.white, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Generate Invoice</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1fr", gap: 0, fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", padding: "6px 8px", background: C.gray50, borderRadius: "6px 6px 0 0" }}>
                      <span>Description</span><span style={{ textAlign: "right" }}>Value</span><span style={{ textAlign: "right" }}>% Complete</span><span style={{ textAlign: "right" }}>Invoiced</span>
                    </div>
                    {(sov.items || []).map((it, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1fr", gap: 0, fontSize: 12, padding: "8px 8px", borderBottom: `1px solid ${C.gray100}` }}>
                        <span style={{ color: C.navy }}>{it.description}</span>
                        <span style={{ textAlign: "right", color: C.gray600 }}>{formatCurrency(it.value)}</span>
                        <span style={{ textAlign: "right", color: it.percentComplete >= 100 ? C.green : C.navy, fontWeight: 600 }}>{it.percentComplete || 0}%</span>
                        <span style={{ textAlign: "right", color: it.invoiced ? C.green : C.gray400 }}>{it.invoiced ? "✓" : "—"}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Sage Intacct Tab */}
            {activeTab === "sage" && (
              <div style={{ padding: "60px 40px", textAlign: "center", background: C.white, borderRadius: 12, border: `2px dashed ${C.gray300}` }}>
                <div style={{ fontSize: 48, opacity: 0.15, marginBottom: 16 }}>🔗</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: "0 0 8px" }}>Sage Intacct Integration</h2>
                <p style={{ fontSize: 14, color: C.gray500, margin: "0 0 24px", maxWidth: 500, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>Once connected via Settings → Integrations, invoices and schedule of values will sync bi-directionally with Sage Intacct for GL posting, AP/AR, and financial reporting.</p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  {["Invoice Sync", "GL Posting", "AP / AR", "Payment Tracking", "Financial Reports"].map(f => (
                    <span key={f} style={{ padding: "6px 14px", borderRadius: 20, background: C.gray100, color: C.gray500, fontSize: 12, fontWeight: 600 }}>{f}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ============================================================
    // CHART HELPERS: Canvas-based chart components
    // ============================================================
    function BarChart({ data, width = 500, height = 250, barColor = C.navy }) {
      const canvasRef = useRef(null);
      useEffect(() => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx || !data.length) return;
        ctx.clearRect(0, 0, width, height);
        const max = Math.max(...data.map(d => d.value), 1);
        const barW = Math.min(40, (width - 60) / data.length - 8);
        data.forEach((d, i) => {
          const barH = (d.value / max) * (height - 50);
          const x = 50 + i * (barW + 8);
          const y = height - 30 - barH;
          ctx.fillStyle = d.color || barColor;
          ctx.fillRect(x, y, barW, barH);
          ctx.fillStyle = C.gray500;
          ctx.font = "10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(d.label || "", x + barW / 2, height - 14);
          ctx.fillText(d.displayValue || String(d.value), x + barW / 2, y - 6);
        });
      }, [data, width, height, barColor]);
      return React.createElement("canvas", { ref: canvasRef, width, height, style: { borderRadius: 8, background: C.white } });
    }

    function DonutChart({ data, size = 180, label = "" }) {
      const canvasRef = useRef(null);
      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, size, size);
        if (!data || !Array.isArray(data) || data.length === 0) return;
        const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
        const cx = size / 2, cy = size / 2, r = size / 2 - 10, innerR = r * 0.6;
        let angle = -Math.PI / 2;
        data.forEach(d => {
          const slice = (d.value / total) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r, angle, angle + slice);
          ctx.arc(cx, cy, innerR, angle + slice, angle, true);
          ctx.closePath();
          ctx.fillStyle = d.color;
          ctx.fill();
          angle += slice;
        });
        ctx.fillStyle = C.navy;
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, cx, cy);
      }, [data, size, label]);
      return React.createElement("canvas", { ref: canvasRef, width: size, height: size });
    }

    // ============================================================
    // MODULE: CALENDAR (Multi-source event aggregation)


export default FinanceModule;
