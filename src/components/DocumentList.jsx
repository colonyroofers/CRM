import React, { useState, useEffect } from 'react';
import { C } from '../utils/constants';
import { getFirestoreDb } from '../utils/firebase';

function DocumentList({ entityType, entityId }) {
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    const firestoreDb = getFirestoreDb();
    if (!firestoreDb) return;

    const unsub = firestoreDb.collection("cr_documents")
      .where("entityType", "==", entityType)
      .where("entityId", "==", entityId)
      .onSnapshot(snap => {
        setDocs(snap.docs.map(d => d.data()).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)));
      });

    return () => unsub();
  }, [entityType, entityId]);

  if (!docs.length) return React.createElement("div", { style: { padding: 16, textAlign: "center", color: C.gray400, fontSize: 12 } }, "No documents yet");

  return React.createElement("div", { style: { display: "grid", gap: 8 } }, docs.map(d =>
    React.createElement("div", { key: d.id, style: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid " + C.gray200, background: C.white, cursor: "pointer" }, onClick: () => window.open(d.fileUrl, "_blank") },
      React.createElement("span", { style: { fontSize: 20 } }, d.fileType?.includes("pdf") ? "📄" : d.fileType?.includes("image") ? "🖼️" : "📁"),
      React.createElement("div", { style: { flex: 1, minWidth: 0 } },
        React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: C.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, d.name),
        React.createElement("div", { style: { fontSize: 10, color: C.gray400 } }, d.uploadedBy + " · " + new Date(d.uploadedAt).toLocaleDateString())
      ),
      React.createElement("span", { style: { fontSize: 10, color: C.gray400 } }, (d.fileSize / 1024).toFixed(0) + " KB")
    )
  ));
}

export default DocumentList;
