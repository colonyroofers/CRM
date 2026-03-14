import React from 'react';
import { C } from '../utils/constants';

    function InspectionsList({ inspections, onOpen, onCreate, entityType, entityId }) {
      const filtered = inspections.filter(i => i.entityType === entityType && i.entityId === entityId);
      return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>Inspections ({filtered.length})</span>
            <button onClick={onCreate} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: C.navy, color: C.white, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ New Inspection</button>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: C.gray400, fontSize: 13 }}>No inspections yet</div>
          ) : filtered.map(ins => (
            <div key={ins.id} onClick={() => onOpen(ins)} style={{ padding: "12px 16px", background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = C.white}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{new Date(ins.createdAt).toLocaleDateString()} — {ins.data?.roof_type || "Roof Inspection"}</div>
                <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>By {ins.createdBy} · {Object.keys(ins.data || {}).length} fields completed</div>
              </div>
              <span style={{ padding: "3px 10px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: ins.status === "Complete" ? C.greenBg : ins.status === "In Progress" ? "#FEF3C7" : C.gray100, color: ins.status === "Complete" ? C.green : ins.status === "In Progress" ? "#D97706" : C.gray500 }}>{ins.status}</span>
            </div>
          ))}
        </div>
      );
    }

    // ============================================================
    // MODULE: INSPECTIONS (Top-level — all inspections across projects/tickets)


export default InspectionsList;
