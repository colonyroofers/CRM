import React, { useState } from 'react';
import { C } from '../utils/constants';
import { generateId, formatCurrency } from '../utils/constants';

function ProposalGenerator({ estimate, onGenerate, onCancel }) {
  const [sowText, setSowText] = useState("");
  const [systemName, setSystemName] = useState("");
  const [includeWarranty, setIncludeWarranty] = useState(true);

  const handleGenerate = () => {
    const proposal = {
      id: generateId(),
      estimateId: estimate?.id,
      type: "roofing_proposal",
      systemName: systemName || "Standard Roofing System",
      scope: sowText || "Standard roofing installation scope of work",
      includeWarranty: includeWarranty,
      generatedAt: new Date().toISOString(),
      total: estimate?.totalPrice || 0,
    };
    if (onGenerate) onGenerate(proposal);
  };

  return React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }, onClick: onCancel },
    React.createElement("div", { style: { width: 600, background: C.white, borderRadius: 12, padding: 24, maxHeight: "90vh", overflowY: "auto" }, onClick: e => e.stopPropagation() },
      React.createElement("h3", { style: { fontSize: 16, fontWeight: 700, color: C.navy, margin: "0 0 16px" } }, "Generate Proposal"),
      React.createElement("div", { style: { display: "grid", gap: 12 } },
        React.createElement("div", null,
          React.createElement("label", { style: { fontSize: 11, fontWeight: 600, color: C.gray600, display: "block", marginBottom: 4 } }, "System Name"),
          React.createElement("input", { type: "text", value: systemName, onChange: e => setSystemName(e.target.value), placeholder: "e.g., Premium Architectural Shingles", style: { width: "100%", padding: 8, borderRadius: 6, border: "1px solid " + C.gray300, fontSize: 12 } })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: { fontSize: 11, fontWeight: 600, color: C.gray600, display: "block", marginBottom: 4 } }, "Scope of Work"),
          React.createElement("textarea", { value: sowText, onChange: e => setSowText(e.target.value), placeholder: "Describe the scope of work and specifications...", style: { width: "100%", padding: 8, borderRadius: 6, border: "1px solid " + C.gray300, fontSize: 12, minHeight: 120 } })
        ),
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
          React.createElement("input", { type: "checkbox", checked: includeWarranty, onChange: e => setIncludeWarranty(e.target.checked), style: { width: 16, height: 16, cursor: "pointer" } }),
          React.createElement("label", { style: { fontSize: 12, color: C.gray600, cursor: "pointer" } }, "Include Warranty Information")
        ),
        React.createElement("div", { style: { padding: 12, borderRadius: 8, background: C.gray50 } },
          React.createElement("div", { style: { fontSize: 11, fontWeight: 600, color: C.gray600, marginBottom: 4 } }, "Estimate Total"),
          React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: C.navy } }, formatCurrency(estimate?.totalPrice || 0))
        ),
        React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" } },
          React.createElement("button", { onClick: onCancel, style: { padding: "8px 16px", borderRadius: 6, border: "1px solid " + C.gray300, background: C.white, fontSize: 12, cursor: "pointer" } }, "Cancel"),
          React.createElement("button", { onClick: handleGenerate, style: { padding: "8px 16px", borderRadius: 6, border: "none", background: C.navy, color: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "Generate Proposal")
        )
      )
    )
  );
}

export default ProposalGenerator;
