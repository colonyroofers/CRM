import React, { useState, useRef } from 'react';
import { C, generateId } from '../utils/constants';

    function InspectionPhotos({ inspection, onUpdate, user }) {
      const [uploading, setUploading] = useState(false);
      const [progress, setProgress] = useState(0);
      const fileRef = useRef(null);
      const photos = inspection?.photos || [];

      const handleUpload = async (files) => {
        if (!files.length) return;
        setUploading(true);
        const newPhotos = [];
        for (const file of files) {
          try {
            if (firebaseStorage) {
              const path = "inspections/" + inspection.id + "/" + Date.now() + "_" + file.name;
              const ref = firebaseStorage.ref(path);
              await ref.put(file);
              const url = await ref.getDownloadURL();
              newPhotos.push({
                id: generateId(),
                url,
                storagePath: path,
                caption: "",
                location: "",
                category: "general",
                takenAt: new Date().toISOString(),
                takenBy: user?.name || ""
              });
            } else {
              // Fallback: use local data URL
              const reader = new FileReader();
              reader.onload = (ev) => {
                newPhotos.push({
                  id: generateId(),
                  url: ev.target.result,
                  caption: "",
                  location: "",
                  category: "general",
                  takenAt: new Date().toISOString(),
                  takenBy: user?.name || ""
                });
                if (newPhotos.length === files.length) {
                  setUploading(false);
                  setProgress(0);
                  onUpdate({ ...inspection, photos: [...photos, ...newPhotos] });
                }
              };
              reader.readAsDataURL(file);
            }
          } catch (e) {
            console.error("Photo upload error:", e);
          }
        }
        if (firebaseStorage) {
          setUploading(false);
          setProgress(0);
          onUpdate({ ...inspection, photos: [...photos, ...newPhotos] });
        }
      };

      const removePhoto = (id) => {
        onUpdate({ ...inspection, photos: photos.filter(p => p.id !== id) });
      };

      const updatePhotoCaption = (id, caption) => {
        onUpdate({ ...inspection, photos: photos.map(p => p.id === id ? { ...p, caption } : p) });
      };

      return React.createElement("div", null,
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } },
          React.createElement("h4", { style: { fontSize: 14, fontWeight: 700, color: C.navy, margin: 0 } }, "📷 Photos (" + photos.length + ")"),
          React.createElement("div", null,
            React.createElement("input", { ref: fileRef, type: "file", accept: "image/*", multiple: true, onChange: e => handleUpload(Array.from(e.target.files || [])), style: { display: "none" } }),
            React.createElement("button", { onClick: () => fileRef.current?.click(), disabled: uploading, style: { padding: "6px 14px", borderRadius: 6, border: "none", background: uploading ? C.gray300 : C.navy, color: C.white, fontSize: 11, fontWeight: 600, cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.6 : 1 } }, uploading ? "Uploading..." : "Add Photos")
          )
        ),
        photos.length ? React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 } }, photos.map(p =>
          React.createElement("div", { key: p.id, style: { borderRadius: 8, overflow: "hidden", border: "1px solid " + C.gray200, background: C.white, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" } },
            React.createElement("img", { src: p.url, alt: p.caption || "Photo", style: { width: "100%", height: 100, objectFit: "cover" } }),
            React.createElement("div", { style: { padding: "6px 8px" } },
              React.createElement("input", { value: p.caption || "", onChange: e => updatePhotoCaption(p.id, e.target.value), placeholder: "Caption", style: { width: "100%", fontSize: 10, padding: "3px 4px", border: "1px solid " + C.gray200, borderRadius: 4, marginBottom: 4 } }),
              React.createElement("div", { style: { fontSize: 9, color: C.gray500 } }, p.category || "general"),
              React.createElement("div", { style: { fontSize: 9, color: C.gray400, marginBottom: 4 } }, new Date(p.takenAt).toLocaleDateString()),
              React.createElement("button", { onClick: () => removePhoto(p.id), style: { width: "100%", padding: "3px", fontSize: 9, background: C.redBg, color: C.red, border: "none", borderRadius: 4, cursor: "pointer" } }, "Remove")
            )
          )
        )) : React.createElement("div", { style: { padding: 24, textAlign: "center", color: C.gray400, fontSize: 12, border: "2px dashed " + C.gray300, borderRadius: 8, background: C.gray50 } }, "No photos yet — click Add Photos to upload")
      );
    }


export default InspectionPhotos;
