import React, { useState, useRef } from 'react';
import { C } from '../utils/constants';
import { generateId } from '../utils/constants';
import { getFirestoreDb, getFirebaseStorage } from '../utils/firebase';

function DocumentUpload({ entityType, entityId, user, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef(null);

  const handleUpload = async (file) => {
    const firebaseStorage = getFirebaseStorage();
    if (!firebaseStorage || !file) return;

    setUploading(true);
    const path = "documents/" + entityType + "/" + entityId + "/" + Date.now() + "_" + file.name;
    const ref = firebaseStorage.ref(path);
    const task = ref.put(file);

    task.on("state_changed",
      (snap) => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      (err) => {
        console.error(err);
        setUploading(false);
      },
      async () => {
        const url = await task.snapshot.ref.getDownloadURL();
        const firestoreDb = getFirestoreDb();
        const doc = {
          id: generateId(),
          name: file.name,
          fileName: file.name,
          fileUrl: url,
          storagePath: path,
          fileSize: file.size,
          fileType: file.type,
          entityType,
          entityId,
          uploadedBy: user?.name || "Unknown",
          uploadedAt: new Date().toISOString(),
          category: "other",
          tags: [],
          notes: ""
        };
        if (firestoreDb) await firestoreDb.collection("cr_documents").doc(doc.id).set(doc);
        setUploading(false);
        setProgress(0);
        if (onUploaded) onUploaded(doc);
      }
    );
  };

  return React.createElement("div", { style: { border: "2px dashed " + C.gray300, borderRadius: 8, padding: 20, textAlign: "center", cursor: "pointer", background: C.gray50 }, onClick: () => !uploading && fileRef.current?.click() },
    React.createElement("input", { ref: fileRef, type: "file", onChange: (e) => e.target.files[0] && handleUpload(e.target.files[0]), style: { display: "none" } }),
    uploading ? React.createElement("div", null,
      React.createElement("div", { style: { fontSize: 12, color: C.navy, marginBottom: 8 } }, "Uploading... " + progress + "%"),
      React.createElement("div", { style: { height: 4, borderRadius: 2, background: C.gray200 } },
        React.createElement("div", { style: { height: 4, borderRadius: 2, background: C.blue, width: progress + "%", transition: "width 0.3s" } })
      )
    ) : React.createElement("div", null,
      React.createElement("div", { style: { fontSize: 24, marginBottom: 4 } }, "📁"),
      React.createElement("div", { style: { fontSize: 12, color: C.gray500 } }, "Click to upload a file")
    )
  );
}

export default DocumentUpload;
