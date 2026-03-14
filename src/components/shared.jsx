import React from 'react';
import { C } from '../utils/constants';

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

function StatusBadge({ status }) {
  const cfg = {
    "Pre-Construction": { bg: C.blueBg, color: C.blue },
    "In Progress": { bg: C.greenBg, color: C.green },
    "Delayed": { bg: C.yellowBg, color: C.yellow },
    "Complete": { bg: "#E0E7FF", color: "#6366F1" },
  };
  const c = cfg[status] || cfg["Pre-Construction"];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: c.bg, color: c.color, fontSize: 12, fontWeight: 600 }}>{status}</span>;
}

function getMarginHealth(estimated, current) {
  if (!estimated || !current) return "healthy";
  const drop = estimated - current;
  if (drop >= 10) return "critical";
  if (drop >= 5) return "warning";
  return "healthy";
}

function MarginBadge({ estimated, current }) {
  const health = getMarginHealth(estimated, current);
  const cfg = { healthy: { bg: C.greenBg, color: C.green, label: "Healthy" }, warning: { bg: C.yellowBg, color: C.yellow, label: "Watch" }, critical: { bg: C.redBg, color: C.red, label: "Critical" } };
  const c = cfg[health];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 5, background: c.bg, color: c.color, fontSize: 11, fontWeight: 700 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color }} />{c.label}</span>;
}

function MarketTag({ market }) {
  const cfg = { ATL: { bg: "#EDE9FE", color: "#7C3AED" }, TPA: { bg: "#FEF3C7", color: "#D97706" }, DFW: { bg: "#DBEAFE", color: "#2563EB" } };
  const c = cfg[market] || cfg.ATL;
  return <span style={{ padding: "3px 8px", borderRadius: 5, background: c.bg, color: c.color, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>{market}</span>;
}

function ProgressBar({ value, color = C.green }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: C.gray200, overflow: "hidden", width: "100%" }}>
      <div style={{ height: "100%", borderRadius: 3, background: color, width: `${Math.min(value, 100)}%`, transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)" }} />
    </div>
  );
}

function StatCard({ label, value, sub, icon, accent = C.navy }) {
  return (
    <div style={{ background: C.white, borderRadius: 12, padding: "20px 22px", border: `1px solid ${C.gray200}`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: accent, borderRadius: "3px 0 0 3px" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 12, color: C.gray500, fontWeight: 600, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: C.navy, margin: "6px 0 0", letterSpacing: "-0.02em" }}>{value}</p>
          {sub && <p style={{ fontSize: 12, color: C.gray500, margin: "4px 0 0" }}>{sub}</p>}
        </div>
        <div style={{ color: accent, opacity: 0.5 }}>{icon}</div>
      </div>
    </div>
  );
}

export { Ic, I, StatusBadge, MarginBadge, MarketTag, ProgressBar, StatCard, getMarginHealth };
