import React, { useState, useEffect, useRef } from 'react';
import { C } from '../utils/constants';

function SearchableSelect({ options, value, onChange, placeholder, required, emptyMsg }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const selectedOption = options.find(o => o.value === value);
  const filtered = search ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()) || (o.sub || "").toLowerCase().includes(search.toLowerCase())) : options;

  useEffect(() => {
    const h = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (focused >= 0 && listRef.current?.children[focused])
      listRef.current.children[focused].scrollIntoView({ block: "nearest" });
  }, [focused]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocused(f => Math.min(f + 1, filtered.length - 1));
      if (!open) setOpen(true);
    }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused(f => Math.max(f - 1, 0));
    }
    else if (e.key === "Enter" && focused >= 0 && filtered[focused]) {
      e.preventDefault();
      onChange(filtered[focused].value);
      setSearch("");
      setOpen(false);
      setFocused(-1);
    }
    else if (e.key === "Escape") {
      setOpen(false);
      setSearch("");
      setFocused(-1);
    }
  };

  const sfs = { width: "100%", padding: "8px 10px", border: `1px solid ${required && !value ? C.red + "60" : C.gray300}`, borderRadius: 6, fontSize: 13, color: C.navy, outline: "none", boxSizing: "border-box", background: C.white };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ ...sfs, display: "flex", alignItems: "center", gap: 6, padding: "0 8px", cursor: "text" }} onClick={() => { setOpen(true); inputRef.current?.focus(); }}>
        {value && !open ? (
          <React.Fragment>
            <span style={{ flex: 1, padding: "8px 0", fontSize: 13, color: C.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedOption?.label || value}</span>
            <span onClick={e => { e.stopPropagation(); onChange(""); setSearch(""); inputRef.current?.focus(); }} style={{ cursor: "pointer", color: C.gray400, fontSize: 12, padding: "2px 4px", flexShrink: 0 }}>×</span>
          </React.Fragment>
        ) : (
          <input ref={inputRef} value={search} onChange={e => { setSearch(e.target.value); setOpen(true); setFocused(0); }} onFocus={() => setOpen(true)} onKeyDown={handleKeyDown} placeholder={value ? (selectedOption?.label || "") : (placeholder || "Search...")} style={{ border: "none", outline: "none", flex: 1, fontSize: 13, color: C.navy, background: "transparent", padding: "8px 0" }} />
        )}
        <span style={{ color: C.gray400, fontSize: 8, flexShrink: 0 }}>▼</span>
      </div>
      {open && (
        <div ref={listRef} style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 3000, background: C.white, border: `1px solid ${C.gray300}`, borderRadius: "0 0 6px 6px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 200, overflowY: "auto", marginTop: -1 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 12, color: C.gray400, textAlign: "center" }}>{emptyMsg || "No matches"}</div>
          ) : filtered.map((o, i) => (
            <div key={o.value} onClick={() => { onChange(o.value); setSearch(""); setOpen(false); setFocused(-1); }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: 12, color: C.navy, background: i === focused ? C.gray100 : "transparent", borderBottom: `1px solid ${C.gray50}` }} onMouseEnter={() => setFocused(i)}>
              <div style={{ fontWeight: 600 }}>{o.label}</div>
              {o.sub && <div style={{ fontSize: 10, color: C.gray400, marginTop: 1 }}>{o.sub}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
