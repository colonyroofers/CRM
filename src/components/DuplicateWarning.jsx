import React from 'react';
import { C } from '../utils/constants';

function checkDuplicates(type, data, existingList) {
  const matches = [];
  if (type === "company") {
    (existingList || []).forEach(c => {
      if (!data.name || !c.name) return;
      const nameMatch = c.name.toLowerCase().includes(data.name.toLowerCase().slice(0, 5));
      const phoneMatch = c.phone && data.phone && c.phone.replace(/\D/g, "") === data.phone.replace(/\D/g, "");
      if (nameMatch || phoneMatch) matches.push({ ...c, matchType: nameMatch ? "name" : "phone" });
    });
  }
  if (type === "contact") {
    (existingList || []).forEach(c => {
      const emailMatch = c.email && data.email && c.email.toLowerCase() === data.email.toLowerCase();
      const phoneMatch = c.phone && data.phone && c.phone.replace(/\D/g, "") === data.phone.replace(/\D/g, "");
      const nameMatch = c.name && data.name && c.name.toLowerCase() === data.name.toLowerCase();
      if (emailMatch || phoneMatch || nameMatch) matches.push({ ...c, matchType: emailMatch ? "email" : phoneMatch ? "phone" : "name" });
    });
  }
  return matches;
}

function DuplicateWarning({ duplicates }) {
  if (!duplicates || !duplicates.length) return null;
  return React.createElement("div", { style: { padding: "10px 14px", borderRadius: 8, background: C.yellowBg, border: `1px solid ${C.yellow}40`, marginBottom: 12, fontSize: 12, color: "#92400E" } },
    React.createElement("strong", null, "⚠️ Possible duplicates: "),
    duplicates.map(d => d.name + " (" + d.matchType + ")").join(", ")
  );
}

export { checkDuplicates };
export default DuplicateWarning;
