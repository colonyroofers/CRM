import React, { useState, useRef } from 'react';
import { C } from '../utils/constants';
import Spinner from './Spinner';
import { I } from './shared';

const DOC_TYPES = {
  budget: { label: "Job Budget", desc: "Line-item cost breakdown & profit margin", icon: I.dollar, accept: ".pdf,.xlsx,.xls,.csv" },
  contract: { label: "Contract", desc: "Scope, terms, and contract value", icon: I.fileText, accept: ".pdf,.docx,.doc" },
  planSet: { label: "Plan Set", desc: "Architectural drawings & blueprints", icon: I.layers, accept: ".pdf,.png,.jpg,.jpeg" },
};

const MULTI_FILE_TYPES = ["contract", "planSet"];

function DocumentUploadCard({ type, files, onUpload, onRemove }) {
  const config = DOC_TYPES[type];
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const isMulti = MULTI_FILE_TYPES.includes(type);
  const fileList = Array.isArray(files) ? files : files ? [files] : [];
  const hasFiles = fileList.length > 0;
  const anyProcessing = fileList.some(f => f.status === "processing");
  const allParsed = hasFiles && fileList.every(f => f.status === "parsed");
  const anyError = fileList.some(f => f.status === "error");

  const handleFiles = (inputFiles) => {
    if (!inputFiles || inputFiles.length === 0) return;
    Array.from(inputFiles).forEach(f => onUpload(type, f));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const statusColor = !hasFiles ? C.gray400 : allParsed ? C.green : anyProcessing ? C.blue : anyError ? C.red : C.navy;
  const statusLabel = !hasFiles ? "Not uploaded" : allParsed ? "Parsed" : anyProcessing ? "Processing..." : anyError ? "Error" : `${fileList.length} file${fileList.length > 1 ? "s" : ""}`;

  return (
    <div style={{ border: `2px ${dragOver ? "solid" : "dashed"} ${dragOver ? C.red : hasFiles ? C.gray200 : C.gray300}`, borderRadius: 12, background: dragOver ? C.redBg + "30" : C.white, transition: "all 0.2s", overflow: "hidden" }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}>
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: hasFiles ? `1px solid ${C.gray100}` : "none", background: hasFiles ? C.gray50 : "transparent" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: allParsed ? C.greenBg : hasFiles ? C.blueBg : C.gray100, color: allParsed ? C.green : hasFiles ? C.blue : C.gray400 }}>{config.icon}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{config.label}{isMulti && <span style={{ fontSize: 10, color: C.gray400, fontWeight: 400, marginLeft: 6 }}>Multiple files OK</span>}</div>
            <div style={{ fontSize: 11, color: C.gray500 }}>{config.desc}</div>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, padding: "3px 8px", borderRadius: 5, background: !hasFiles ? C.gray100 : allParsed ? C.greenBg : anyProcessing ? C.blueBg : anyError ? C.redBg : C.gray100 }}>
          {anyProcessing && <Spinner size={8} color={C.blue} />} {statusLabel}
        </span>
      </div>
      {fileList.map((doc, i) => (
        <div key={i} style={{ padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.gray100}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: C.gray400 }}>{I.file}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{doc.name}</div>
              <div style={{ fontSize: 10, color: C.gray400 }}>{(doc.size / 1024).toFixed(0)} KB</div>
            </div>
          </div>
          {doc.status !== "processing" && <button onClick={() => onRemove(type, i)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400, padding: 4 }}>{I.trash}</button>}
        </div>
      ))}
      {(isMulti || !hasFiles) && (
        <div style={{ padding: hasFiles ? "14px 18px" : "28px 18px", textAlign: "center", cursor: "pointer" }} onClick={() => inputRef.current?.click()}>
          {!hasFiles && <div style={{ color: C.gray300, marginBottom: 8 }}>{I.upload}</div>}
          <p style={{ fontSize: 12, color: C.gray500, margin: "0 0 3px", fontWeight: 500 }}>
            {hasFiles ? <span style={{ color: C.red, fontWeight: 600 }}>+ Add another file</span> : <>Drag & drop or <span style={{ color: C.red, fontWeight: 600 }}>browse</span></>}
          </p>
          {!hasFiles && <p style={{ fontSize: 11, color: C.gray400, margin: 0 }}>Accepts: {config.accept.replace(/\./g, "").toUpperCase().split(",").join(", ")}</p>}
          <input ref={inputRef} type="file" accept={config.accept} multiple={isMulti} style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
        </div>
      )}
    </div>
  );
}

export default DocumentUploadCard;
