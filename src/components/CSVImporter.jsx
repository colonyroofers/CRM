import React, { useState, useRef } from 'react';
import { C } from '../utils/constants';
import { generateId } from '../utils/constants';

function CSVImporter({ type, onImport }) {
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Maximum 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      alert("Failed to read file. Please try again.");
    };
    reader.onload = (evt) => {
      try {
        const rows = evt.target.result.split("\n").map(r => r.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
        if (rows.length < 2) {
          alert("CSV must have a header row and at least one data row.");
          return;
        }
        const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, ""));
        const items = rows.slice(1).filter(r => r.length >= 2 && r.some(c => c)).map(r => {
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = r[i] || "";
          });
          return { ...obj, id: generateId(), createdAt: new Date().toISOString() };
        });
        if (items.length === 0) {
          alert("No valid rows found in CSV.");
          return;
        }
        if (confirm("Import " + items.length + " " + type + "s?")) onImport(items);
      } catch (err) {
        console.error("CSV parse error:", err);
        alert("Failed to parse CSV: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  return React.createElement(React.Fragment, null,
    React.createElement("input", { ref: fileRef, type: "file", accept: ".csv", onChange: handleFile, style: { display: "none" } }),
    React.createElement("button", { onClick: () => fileRef.current?.click(), style: { padding: "6px 14px", borderRadius: 6, border: "1px solid " + C.gray300, background: C.white, color: C.gray600, fontSize: 11, fontWeight: 600, cursor: "pointer" } }, "📥 Import CSV")
  );
}

export default CSVImporter;
