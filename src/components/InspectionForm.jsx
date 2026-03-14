import React, { useState, useRef } from 'react';
import { C, generateId } from '../utils/constants';

    function InspectionForm({ inspection, onSave, onClose, user, crmUsers }) {
      const [data, setData] = useState(inspection?.data || {});
      const [status, setStatus] = useState(inspection?.status || "Draft");
      const [summary, setSummary] = useState(inspection?.summary || "");
      const [assignedTo, setAssignedTo] = useState(inspection?.assignedTo || "");
      const [scheduledDate, setScheduledDate] = useState(inspection?.scheduledDate || "");
      const [expandedSection, setExpandedSection] = useState("general");
      const [photos, setPhotos] = useState(inspection?.photos || []);
      const [geoLocation, setGeoLocation] = useState(inspection?.geoLocation || null);
      const [geoError, setGeoError] = useState("");
      const [capturingGeo, setCapturingGeo] = useState(false);
      const fileInputRef = useRef(null);
      const allUsers = (crmUsers || []).filter(u => u.active !== false);

      const captureLocation = () => {
        if (!navigator.geolocation) { setGeoError("Geolocation not supported"); return; }
        setCapturingGeo(true); setGeoError("");
        navigator.geolocation.getCurrentPosition(
          (pos) => { setGeoLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, capturedAt: new Date().toISOString() }); setCapturingGeo(false); },
          (err) => { setGeoError(err.message); setCapturingGeo(false); },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      };

      const handlePhotoUpload = (e) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const photo = { id: generateId(), dataUrl: ev.target.result, name: file.name, capturedAt: new Date().toISOString(), note: "" };
            // Try to get EXIF GPS if available, otherwise use current geoLocation
            if (geoLocation) { photo.lat = geoLocation.lat; photo.lng = geoLocation.lng; }
            setPhotos(prev => [...prev, photo]);
          };
          reader.readAsDataURL(file);
        });
        e.target.value = "";
      };

      const removePhoto = (id) => setPhotos(prev => prev.filter(p => p.id !== id));
      const updatePhotoNote = (id, note) => setPhotos(prev => prev.map(p => p.id === id ? { ...p, note } : p));

      const setField = (id, val) => setData(prev => ({ ...prev, [id]: val }));

      const renderField = (f) => {
        const val = data[f.id];
        if (f.type === "text") return <input value={val || ""} onChange={e => setField(f.id, e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.navy }} />;
        if (f.type === "number") return <input type="number" value={val || ""} onChange={e => setField(f.id, e.target.value)} style={{ width: 120, padding: "8px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.navy }} />;
        if (f.type === "select") return <select value={val || ""} onChange={e => setField(f.id, e.target.value)} style={{ padding: "8px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.navy, background: C.white }}><option value="">Select...</option>{f.options.map(o => <option key={o} value={o}>{o}</option>)}</select>;
        if (f.type === "check") return <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}><input type="checkbox" checked={!!val} onChange={e => setField(f.id, e.target.checked)} style={{ width: 16, height: 16 }} /><span style={{ fontSize: 12, color: val ? C.green : C.gray500 }}>{val ? "Yes" : "No"}</span></label>;
        if (f.type === "rating") return <div style={{ display: "flex", gap: 4 }}>{[1,2,3,4,5].map(n => <button key={n} onClick={() => setField(f.id, n)} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${val >= n ? C.navy : C.gray300}`, background: val >= n ? C.navy : C.white, color: val >= n ? C.white : C.gray400, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{n}</button>)}</div>;
        return null;
      };

      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(17,29,53,0.5)", display: "flex", flexDirection: "column" }}>
          <div style={{ background: C.navy, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={onClose} style={{ background: "none", border: "none", color: C.white, fontSize: 18, cursor: "pointer" }}>←</button>
              <span style={{ color: C.white, fontSize: 15, fontWeight: 700 }}>🔍 Roof Inspection</span>
              <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: C.white, fontSize: 11, fontWeight: 600 }}>
                {INSPECTION_STATUSES.map(s => <option key={s} value={s} style={{ color: C.navy }}>{s}</option>)}
              </select>
            </div>
            <button onClick={() => onSave({ ...inspection, data, status, summary, assignedTo, scheduledDate, photos, geoLocation, updatedAt: new Date().toISOString(), updatedBy: user.name })} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: C.green, color: C.white, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save Inspection</button>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 24, maxWidth: 800, margin: "0 auto", width: "100%" }}>
            {/* Scheduling & Assignment */}
            <div style={{ marginBottom: 16, background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.gray500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Assigned Inspector</label>
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.navy, background: C.white }}>
                  <option value="">— Unassigned —</option>
                  {allUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.gray500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Scheduled Date</label>
                <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, color: C.navy }} />
              </div>
            </div>
            {INSPECTION_SECTIONS.map(sec => (
              <div key={sec.id} style={{ marginBottom: 16, background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, overflow: "hidden" }}>
                <div onClick={() => setExpandedSection(expandedSection === sec.id ? null : sec.id)} style={{ padding: "14px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: expandedSection === sec.id ? C.navy : C.white }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: expandedSection === sec.id ? C.white : C.navy }}>{sec.label}</span>
                  <span style={{ fontSize: 11, color: expandedSection === sec.id ? "rgba(255,255,255,0.6)" : C.gray400 }}>{sec.fields.filter(f => data[f.id] != null && data[f.id] !== "" && data[f.id] !== false).length}/{sec.fields.length} filled</span>
                </div>
                {expandedSection === sec.id && (
                  <div style={{ padding: 20 }}>
                    {sec.fields.map(f => (
                      <div key={f.id} style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>{f.label}</label>
                        {renderField(f)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, padding: 20, marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>Inspector Summary / Recommendations</label>
              <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={4} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, resize: "vertical", outline: "none" }} placeholder="Overall findings and recommended actions..." />
            </div>

            {/* Geo-Tagged Photo Report */}
            <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>📍 Geo-Tagged Photo Report</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={captureLocation} disabled={capturingGeo} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: geoLocation ? C.greenBg : C.white, color: geoLocation ? C.green : C.navy, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    {capturingGeo ? "Locating..." : geoLocation ? `📍 ${geoLocation.lat.toFixed(5)}, ${geoLocation.lng.toFixed(5)}` : "📍 Capture Location"}
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: C.navy, color: C.white, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>📷 Add Photos</button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple capture="environment" onChange={handlePhotoUpload} style={{ display: "none" }} />
                </div>
              </div>
              {geoError && <div style={{ fontSize: 11, color: C.red, marginBottom: 8 }}>{geoError}</div>}

              {/* Satellite Map Preview */}
              {geoLocation && (
                <div style={{ marginBottom: 16, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.gray200}` }}>
                  <iframe
                    title="Satellite view"
                    width="100%"
                    height="300"
                    frameBorder="0"
                    style={{ display: "block", border: "none" }}
                    src={`https://www.google.com/maps?q=${geoLocation.lat},${geoLocation.lng}&z=19&t=k&output=embed`}
                    allowFullScreen
                  />
                  <div style={{ padding: "8px 12px", background: C.gray50, fontSize: 11, color: C.gray500 }}>
                    Lat: {geoLocation.lat.toFixed(6)} · Lng: {geoLocation.lng.toFixed(6)} · Accuracy: ±{Math.round(geoLocation.accuracy || 0)}m · Captured: {new Date(geoLocation.capturedAt).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Photo Grid */}
              {photos.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: C.gray400, fontSize: 12, border: `2px dashed ${C.gray200}`, borderRadius: 8 }}>No photos yet. Capture location first, then add photos — they'll be automatically geo-tagged.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                  {photos.map(p => (
                    <div key={p.id} style={{ borderRadius: 8, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
                      <div style={{ position: "relative" }}>
                        <img src={p.dataUrl} alt={p.name} style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                        <button onClick={() => removePhoto(p.id)} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, background: "rgba(0,0,0,0.6)", border: "none", color: C.white, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                        {p.lat && <div style={{ position: "absolute", bottom: 4, left: 4, padding: "2px 6px", borderRadius: 4, background: "rgba(0,0,0,0.6)", color: C.white, fontSize: 9 }}>📍 {p.lat.toFixed(4)}, {p.lng.toFixed(4)}</div>}
                      </div>
                      <div style={{ padding: 8 }}>
                        <input value={p.note || ""} onChange={e => updatePhotoNote(p.id, e.target.value)} placeholder="Add note..." style={{ width: "100%", padding: "4px 6px", border: `1px solid ${C.gray200}`, borderRadius: 4, fontSize: 10, color: C.navy }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ============================================================
    // COMPONENT: INSPECTION PHOTOS


export default InspectionForm;
