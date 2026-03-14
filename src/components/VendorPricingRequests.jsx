import React, { useState } from 'react';
import { C } from '../utils/constants';
import { generateId } from '../utils/constants';
import { getFirestoreDb } from '../utils/firebase';

function VendorPricingRequests({ job, user, entities, setSalesLeads }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [pricingItems, setPricingItems] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const pricingRequests = job?.vendorPricingRequests || [];

  // Get vendors from entities or fallback
  const vendors = [];
  if (entities?.companies) {
    entities.companies.filter(c => c.type === "vendor" || c.type === "Vendor" || c.category === "vendor").forEach(c => {
      vendors.push({ id: c.id, name: c.name, email: c.email || "" });
    });
  }
  // Also add known vendors
  const knownVendors = [
    { id: "v_abc", name: "ABC Supply", email: "" },
    { id: "v_srs", name: "SRS Distribution", email: "" },
    { id: "v_beacon", name: "Beacon Roofing Supply", email: "" },
    { id: "v_qxo", name: "QXO", email: "" },
  ];
  knownVendors.forEach(kv => {
    if (!vendors.find(v => v.name === kv.name)) vendors.push(kv);
  });

  const handleSendRequest = async () => {
    if (!selectedVendor || !vendorEmail || !pricingItems.trim()) {
      alert("Please fill in vendor, email, and items.");
      return;
    }
    setSending(true);
    try {
      const firestoreDb = getFirestoreDb();
      const vendor = vendors.find(v => v.id === selectedVendor) || { name: selectedVendor };
      const request = {
        id: "pr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        vendorId: selectedVendor,
        vendorName: vendor.name,
        vendorEmail: vendorEmail,
        items: pricingItems,
        notes: notes,
        status: "sent",
        sentAt: new Date().toISOString(),
        sentBy: user?.name || "User",
        responses: []
      };
      // Send email via the CRM's email system
      if (firestoreDb) {
        await firestoreDb.collection("cr_emails_outbound").add({
          to: vendorEmail,
          subject: `Pricing Request — ${job.jobName || "Project"} — Colony Roofers`,
          body: `Hi,\n\nWe are requesting pricing for the following items for our project "${job.jobName || "Project"}":\n\n${pricingItems}\n\n${notes ? "Notes: " + notes + "\n\n" : ""}Please reply to this email with your pricing at your earliest convenience.\n\nThank you,\n${user?.name || "Colony Roofers"}\nColony Roofers`,
          entityType: "estimate_job",
          entityId: job.id,
          type: "vendor_pricing_request",
          createdAt: new Date().toISOString()
        });
      }
      // Save pricing request to the job
      const updatedRequests = [...pricingRequests, request];
      setSalesLeads(prev => prev.map(l => l.id === job.id ? {
        ...l,
        vendorPricingRequests: updatedRequests,
        activities: [...(l.activities || []), { type: "pricing_request", text: `Pricing request sent to ${vendor.name}`, by: user?.name || "User", at: new Date().toISOString() }]
      } : l));
      setShowForm(false);
      setSelectedVendor("");
      setVendorEmail("");
      setPricingItems("");
      setNotes("");
    } catch (err) {
      console.error("Error sending pricing request:", err);
      alert("Error: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const updateRequestStatus = (reqId, status, responseData) => {
    const updated = pricingRequests.map(r => r.id === reqId ? {
      ...r,
      status,
      responses: [...(r.responses || []), { ...responseData, recordedAt: new Date().toISOString() }]
    } : r);
    setSalesLeads(prev => prev.map(l => l.id === job.id ? { ...l, vendorPricingRequests: updated } : l));
  };

  const statusColors = { sent: C.blue, received: C.green, pending: C.yellow, declined: C.red };

  return React.createElement("div", { style: { marginBottom: 16 } },
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 } },
      React.createElement("span", { style: { fontSize: 14, fontWeight: 700, color: C.navy } }, "Vendor Pricing (" + pricingRequests.length + ")"),
      React.createElement("button", { onClick: () => setShowForm(true), style: { padding: "6px 14px", borderRadius: 6, border: "none", background: C.navy, color: C.white, fontSize: 11, fontWeight: 700, cursor: "pointer" } }, "📧 Request Pricing")
    ),
    // Existing pricing requests
    pricingRequests.length > 0 ? pricingRequests.map(req =>
      React.createElement("div", { key: req.id, style: { padding: "10px 14px", borderRadius: 8, border: "1px solid " + C.gray200, marginBottom: 6, background: C.white } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 } },
          React.createElement("div", null,
            React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: C.navy } }, req.vendorName),
            React.createElement("span", { style: { marginLeft: 8, padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, textTransform: "uppercase", background: (statusColors[req.status] || C.gray400) + "20", color: statusColors[req.status] || C.gray400 } }, req.status)
          ),
          React.createElement("span", { style: { fontSize: 10, color: C.gray400 } }, new Date(req.sentAt).toLocaleDateString())
        ),
        React.createElement("div", { style: { fontSize: 11, color: C.gray500, marginBottom: 4 } }, "Items: " + (req.items.length > 80 ? req.items.substring(0, 80) + "..." : req.items)),
        req.status === "sent" && React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 6 } },
          React.createElement("button", { onClick: () => updateRequestStatus(req.id, "received", { type: "received", note: "Response received" }), style: { padding: "4px 10px", borderRadius: 5, border: "none", background: C.green, color: C.white, fontSize: 10, fontWeight: 700, cursor: "pointer" } }, "✓ Mark Received"),
          React.createElement("button", { onClick: () => { const price = prompt("Enter quoted price from " + req.vendorName + ":"); if (price) updateRequestStatus(req.id, "received", { type: "quote", amount: parseFloat(price), note: "Quote: $" + price }); }, style: { padding: "4px 10px", borderRadius: 5, border: "1px solid " + C.blue, background: C.white, color: C.blue, fontSize: 10, fontWeight: 700, cursor: "pointer" } }, "💰 Log Quote")
        ),
        req.responses?.length > 0 && React.createElement("div", { style: { marginTop: 6, padding: "6px 8px", borderRadius: 4, background: C.greenBg, fontSize: 11, color: C.gray600 } },
          req.responses.map((resp, i) => React.createElement("div", { key: i }, resp.amount ? "Quote: $" + resp.amount.toLocaleString() : resp.note, " — ", new Date(resp.recordedAt).toLocaleDateString()))
        )
      )
    ) : React.createElement("div", { style: { padding: 14, textAlign: "center", color: C.gray400, fontSize: 12, background: C.gray50, borderRadius: 8 } }, "No pricing requests yet. Send one to get vendor quotes."),
    // New pricing request form
    showForm ? React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }, onClick: () => setShowForm(false) },
      React.createElement("div", { style: { width: 500, background: C.white, borderRadius: 12, padding: 24 }, onClick: e => e.stopPropagation() },
        React.createElement("h3", { style: { fontSize: 16, fontWeight: 700, color: C.navy, margin: "0 0 16px" } }, "📧 Request Vendor Pricing"),
        React.createElement("div", { style: { display: "grid", gap: 12 } },
          React.createElement("div", null,
            React.createElement("label", { style: { fontSize: 11, fontWeight: 600, color: C.gray600, display: "block", marginBottom: 4 } }, "Vendor"),
            React.createElement("select", { value: selectedVendor, onChange: e => { setSelectedVendor(e.target.value); const v = vendors.find(v2 => v2.id === e.target.value); if (v?.email) setVendorEmail(v.email); }, style: { width: "100%", padding: 8, borderRadius: 6, border: "1px solid " + C.gray300, fontSize: 12 } },
              React.createElement("option", { value: "" }, "— Select vendor —"),
              vendors.map(v => React.createElement("option", { key: v.id, value: v.id }, v.name))
            )
          ),
          React.createElement("div", null,
            React.createElement("label", { style: { fontSize: 11, fontWeight: 600, color: C.gray600, display: "block", marginBottom: 4 } }, "Vendor Email"),
            React.createElement("input", { type: "email", value: vendorEmail, onChange: e => setVendorEmail(e.target.value), placeholder: "vendor@example.com", style: { width: "100%", padding: 8, borderRadius: 6, border: "1px solid " + C.gray300, fontSize: 12, boxSizing: "border-box" } })
          ),
          React.createElement("div", null,
            React.createElement("label", { style: { fontSize: 11, fontWeight: 600, color: C.gray600, display: "block", marginBottom: 4 } }, "Items to Price"),
            React.createElement("textarea", { value: pricingItems, onChange: e => setPricingItems(e.target.value), placeholder: "List materials, quantities, and specs...\ne.g., 50 squares GAF Timberline HDZ Charcoal\n2000 LF drip edge\n50 rolls synthetic underlayment", style: { width: "100%", padding: 8, borderRadius: 6, border: "1px solid " + C.gray300, fontSize: 12, minHeight: 100, boxSizing: "border-box" } })
          ),
          React.createElement("div", null,
            React.createElement("label", { style: { fontSize: 11, fontWeight: 600, color: C.gray600, display: "block", marginBottom: 4 } }, "Additional Notes"),
            React.createElement("textarea", { value: notes, onChange: e => setNotes(e.target.value), placeholder: "Delivery date, special requirements...", style: { width: "100%", padding: 8, borderRadius: 6, border: "1px solid " + C.gray300, fontSize: 12, minHeight: 40, boxSizing: "border-box" } })
          ),
          React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" } },
            React.createElement("button", { onClick: () => setShowForm(false), style: { padding: "8px 16px", borderRadius: 6, border: "1px solid " + C.gray300, background: C.white, fontSize: 12, cursor: "pointer" } }, "Cancel"),
            React.createElement("button", { onClick: handleSendRequest, disabled: sending, style: { padding: "8px 16px", borderRadius: 6, border: "none", background: C.navy, color: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, sending ? "Sending..." : "Send Pricing Request")
          )
        )
      )
    ) : null
  );
}

export default VendorPricingRequests;
