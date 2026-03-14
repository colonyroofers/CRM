/**
 * Helper utilities for various operations
 */

/**
 * Strip document data from projects for storage
 * This removes heavy file data but preserves metadata
 */
export const stripDocsForStorage = (projects) =>
  projects.map(p => {
    const clean = { ...p };
    if (clean.documents) {
      const docs = { ...clean.documents };
      if (docs.budget && docs.budget.data) {
        docs.budget = { ...docs.budget, data: null, status: "uploaded" };
      }
      if (Array.isArray(docs.contract)) {
        docs.contract = docs.contract.map(d => ({ ...d, data: null, status: "uploaded" }));
      }
      if (Array.isArray(docs.planSet)) {
        docs.planSet = docs.planSet.map(d => ({ ...d, data: null, status: "uploaded" }));
      }
      clean.documents = docs;
    }
    return clean;
  });

/**
 * Detect dates from natural language text
 */
export function detectDateFromText(text) {
  const today = new Date();
  const lower = text.toLowerCase();

  // "today"
  if (/\btoday\b/.test(lower)) {
    return today.toISOString().split("T")[0];
  }

  // "tomorrow"
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }

  // "next monday", "next friday", etc.
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const nextDayMatch = lower.match(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (nextDayMatch) {
    const target = dayNames.indexOf(nextDayMatch[1]);
    const d = new Date(today);
    const diff = (target - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split("T")[0];
  }

  // "this monday", "this friday", etc.
  const thisDayMatch = lower.match(/\bthis\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (thisDayMatch) {
    const target = dayNames.indexOf(thisDayMatch[1]);
    const d = new Date(today);
    const diff = (target - d.getDay() + 7) % 7;
    if (diff > 0) {
      d.setDate(d.getDate() + diff);
      return d.toISOString().split("T")[0];
    }
  }

  // "in X days"
  const inDaysMatch = lower.match(/\bin\s+(\d+)\s+days?\b/);
  if (inDaysMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() + parseInt(inDaysMatch[1]));
    return d.toISOString().split("T")[0];
  }

  // "by march 15", "due march 15", "on march 15"
  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];
  const dateMatch = lower.match(/\b(?:by|due|on|before)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (dateMatch) {
    const m = monthNames.indexOf(dateMatch[1]);
    const day = parseInt(dateMatch[2]);
    const year =
      (m < today.getMonth() || (m === today.getMonth() && day < today.getDate()))
        ? today.getFullYear() + 1
        : today.getFullYear();
    return `${year}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // "3/15", "3/15/2026"
  const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slashMatch) {
    const m = parseInt(slashMatch[1]);
    const day = parseInt(slashMatch[2]);
    let year = slashMatch[3] ? parseInt(slashMatch[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    return `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return null;
}

/**
 * Download CSV file
 */
export function downloadCSV(filename, headers, rows) {
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.map(esc).join(","),
    ...rows.map(r => r.map(esc).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
