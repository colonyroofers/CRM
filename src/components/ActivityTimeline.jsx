import React, { useMemo } from 'react';
import { C } from '../utils/constants';

function ActivityTimeline({ activities = [], emails = [], documents = [], inspections = [] }) {
  const timeline = useMemo(() => {
    const items = [];
    activities.forEach(a => items.push({ at: a.at, text: a.text || a.note, by: a.by, icon: "📝", source: "activity" }));
    emails.forEach(e => items.push({ at: e.sentAt || e.receivedAt || e.at, text: `${e.direction === "inbound" ? "Received" : "Sent"}: ${e.subject}`, by: e.from || e.by, icon: e.direction === "inbound" ? "📨" : "📧", source: "email" }));
    documents.forEach(d => items.push({ at: d.uploadedAt || d.at, text: `Document: ${d.name}`, by: d.uploadedBy || d.by, icon: "📎", source: "document" }));
    inspections.forEach(i => items.push({ at: i.scheduledDate || i.createdAt, text: `Inspection: ${i.status} — ${i.inspector}`, by: i.inspector, icon: "🔍", source: "inspection" }));
    return items.filter(i => i.at).sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [activities, emails, documents, inspections]);

  if (!timeline.length) return React.createElement("div", { style: { padding: 20, textAlign: "center", color: C.gray400, fontSize: 13 } }, "No activity yet");

  return React.createElement("div", null, timeline.map((item, i) =>
    React.createElement("div", { key: i, style: { display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.gray100}` } },
      React.createElement("span", { style: { fontSize: 14, width: 24, textAlign: "center" } }, item.icon),
      React.createElement("div", { style: { flex: 1 } },
        React.createElement("div", { style: { fontSize: 12, color: C.navy } }, item.text),
        React.createElement("div", { style: { fontSize: 10, color: C.gray400 } }, (item.by ? item.by + " · " : "") + new Date(item.at).toLocaleString())
      )
    )
  ));
}

export default ActivityTimeline;
