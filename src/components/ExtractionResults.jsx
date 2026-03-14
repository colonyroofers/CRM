import React from 'react';
import { C } from '../utils/constants';
import { formatCurrency } from '../utils/constants';
import { I } from './shared';

function ExtractionResults({ data, onApply }) {
  if (!data) return null;

  const Sec = ({ title, children }) => (
    <div style={{ marginBottom: 16 }}>
      <h4 style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>{title}</h4>
      {children}
    </div>
  );

  const Row = ({ label, value, highlight }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.gray100}` }}>
      <span style={{ fontSize: 13, color: C.gray500 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: highlight || C.navy }}>{value || "—"}</span>
    </div>
  );

  return (
    <div style={{ border: `1px solid ${C.green}40`, borderRadius: 12, overflow: "hidden", background: C.white }}>
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.greenBg, borderBottom: `1px solid ${C.green}30` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: C.green }}>{I.check}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Extracted & Applied to Project</span>
        </div>
        <button onClick={onApply} style={{ padding: "7px 16px", borderRadius: 7, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Dismiss</button>
      </div>
      <div style={{ padding: "16px 18px" }}>
        {data.contract && (
          <Sec title="Contract Details">
            <Row label="Contract Value" value={data.contract.value ? formatCurrency(data.contract.value) : null} highlight={C.green} />
            <Row label="Scope Summary" value={data.contract.scopeSummary} />
            <Row label="Start Date" value={data.contract.startDate} />
            <Row label="Duration" value={data.contract.duration} />
          </Sec>
        )}
        {data.budget && (
          <Sec title="Budget Breakdown">
            <Row label="Total Estimated Cost" value={data.budget.totalCost ? formatCurrency(data.budget.totalCost) : null} />
            <Row label="Material Cost" value={data.budget.materialCost ? formatCurrency(data.budget.materialCost) : null} />
            <Row label="Labor Cost" value={data.budget.laborCost ? formatCurrency(data.budget.laborCost) : null} />
            <Row label="Equipment & Other" value={data.budget.otherCost ? formatCurrency(data.budget.otherCost) : null} />
            <Row label="Estimated Margin" value={data.budget.estimatedMargin ? `${data.budget.estimatedMargin}%` : null} highlight={data.budget.estimatedMargin >= 25 ? C.green : data.budget.estimatedMargin >= 15 ? C.yellow : C.red} />
            {data.budget.lineItems && data.budget.lineItems.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: C.gray500, margin: "0 0 6px" }}>Line Items ({data.budget.lineItems.length})</p>
                <div style={{ maxHeight: 180, overflowY: "auto", borderRadius: 6, border: `1px solid ${C.gray200}` }}>
                  {data.budget.lineItems.map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: i % 2 === 0 ? C.gray50 : C.white, fontSize: 12 }}>
                      <span style={{ color: C.gray600 }}>{item.description}</span>
                      <span style={{ fontWeight: 600, color: C.navy }}>{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Sec>
        )}
        {data.specs && (
          <Sec title="Specifications">
            <Row label="Roof Type" value={data.specs.roofType} />
            <Row label="Total Sq Ft" value={data.specs.sqft ? data.specs.sqft.toLocaleString() + " sq ft" : null} />
            <Row label="Building Count" value={data.specs.buildingCount} />
            <Row label="Primary Material" value={data.specs.primaryMaterial} />
            <Row label="Layers / System" value={data.specs.system} />
          </Sec>
        )}
      </div>
    </div>
  );
}

export default ExtractionResults;
