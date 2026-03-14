import React, { useState, useEffect } from 'react';
import { C } from '../utils/constants';
import { generateId } from '../utils/constants';
import { getFirestoreDb } from '../utils/firebase';

function EmailCompose({ to, defaultSubject, defaultBody, onSent, onCancel, entityType, entityId, entityName, contacts, defaultContactId }) {
  const [subject, setSubject] = useState(defaultSubject || "");
  const [body, setBody] = useState(defaultBody || `Hey,\n\nHope all is well.\n\n\n\nZach Reece, Owner\nColony Roofers\n404-806-0956`);
  const [toAddr, setToAddr] = useState(to || "");
  const [ccAddr, setCcAddr] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [thread, setThread] = useState([]);
  const fs = { width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none", boxSizing: "border-box" };

  // Load existing email thread for this entity from Firestore
  useEffect(() => {
    const firestoreDb = getFirestoreDb();
    if (!entityType || !entityId || !firestoreDb) return;
    const key = `cr_emails_${entityType}_${entityId}`;
    firestoreDb.collection("cr_email_threads").doc(key).get().then(doc => {
      if (doc.exists) setThread(doc.data().messages || []);
    }).catch(err => {
      console.warn("Email thread load error:", err.message);
    });
  }, [entityType, entityId]);

  const allContacts = contacts || [];
  const filteredContacts = allContacts.filter(c => {
    if (!pickerSearch) return true;
    const s = pickerSearch.toLowerCase();
    return (c.name || "").toLowerCase().includes(s) || (c.email || "").toLowerCase().includes(s);
  });

  const handlePickContact = (contact) => {
    setToAddr(contact.email || "");
    setShowPicker(false);
    setPickerSearch("");
  };

  const handleSend = async () => {
    if (!toAddr) return;
    setSending(true);
    const firestoreDb = getFirestoreDb();
    const emailRecord = {
      id: generateId(),
      to: toAddr,
      cc: ccAddr,
      subject,
      body,
      sentAt: new Date().toISOString(),
      sentBy: "Zach Reece",
      entityType,
      entityId,
      entityName,
      direction: "outbound"
    };

    // Save to Firestore email thread
    if (entityType && entityId && firestoreDb) {
      try {
        const key = `cr_emails_${entityType}_${entityId}`;
        const newThread = [...thread, emailRecord];
        await firestoreDb.collection("cr_email_threads").doc(key).set({ messages: newThread, updatedAt: new Date().toISOString() }, { merge: true });
        setThread(newThread);
      } catch (e) {
        console.error("Email log save error:", e);
      }
    }

    setSending(false);
    setSent(true);
    if (onSent) onSent(emailRecord);
    setTimeout(() => setSent(false), 3000);
  };

  // Simulate receiving a reply (for demo/manual logging)
  const handleLogReply = () => {
    const reply = prompt("Paste the reply text:");
    if (!reply) return;
    const firestoreDb = getFirestoreDb();
    const replyRecord = {
      id: generateId(),
      from: toAddr,
      subject: `Re: ${subject}`,
      body: reply,
      receivedAt: new Date().toISOString(),
      entityType,
      entityId,
      entityName,
      direction: "inbound"
    };
    const newThread = [...thread, replyRecord];
    setThread(newThread);
    if (entityType && entityId && firestoreDb) {
      const key = `cr_emails_${entityType}_${entityId}`;
      firestoreDb.collection("cr_email_threads").doc(key).set({ messages: newThread, updatedAt: new Date().toISOString() }, { merge: true }).catch(err => {
        console.error("Email thread save error:", err.message);
      });
    }
  };

  return (
    <div style={{ borderRadius: 10, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
      <div style={{ padding: "10px 14px", background: C.gray50, borderBottom: `1px solid ${C.gray200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>📧 Compose Email</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {thread.length > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: C.blue, background: C.blueBg, padding: "2px 8px", borderRadius: 4 }}>{thread.length} in thread</span>}
          {onCancel && <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400, fontSize: 12 }}>×</button>}
        </div>
      </div>
      <div style={{ padding: "14px" }}>
        {/* To field with contact picker */}
        <div style={{ marginBottom: 8, position: "relative" }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={toAddr} onChange={e => setToAddr(e.target.value)} placeholder="To email" style={{ ...fs, fontSize: 12, flex: 1 }} />
            <button onClick={() => setShowPicker(!showPicker)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: showPicker ? C.blueBg : C.white, color: showPicker ? C.blue : C.gray600, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>📇 Contacts</button>
          </div>
          {showPicker && (
            <div style={{ position: "absolute", top: "100%", right: 0, width: 320, zIndex: 100, marginTop: 4, borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.white, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 240, overflow: "hidden" }}>
              <div style={{ padding: 8, borderBottom: `1px solid ${C.gray100}` }}>
                <input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} placeholder="Search contacts..." autoFocus style={{ ...fs, fontSize: 11, padding: "6px 10px" }} />
              </div>
              <div style={{ maxHeight: 180, overflow: "auto" }}>
                {filteredContacts.length === 0 ? (
                  <div style={{ padding: 16, textAlign: "center", fontSize: 11, color: C.gray400 }}>No contacts found</div>
                ) : (
                  filteredContacts.map(c => (
                    <div key={c.id} onClick={() => handlePickContact(c)} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: `1px solid ${C.gray50}` }} onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: C.gray400 }}>{c.email || "No email"} {c.phone ? `· ${c.phone}` : ""}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div style={{ marginBottom: 8 }}><input value={ccAddr} onChange={e => setCcAddr(e.target.value)} placeholder="CC (optional)" style={{ ...fs, fontSize: 12 }} /></div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" style={{ ...fs, marginBottom: 8 }} />
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} style={{ ...fs, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {thread.length > 0 && <button onClick={handleLogReply} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Log Reply</button>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {onCancel && <button onClick={onCancel} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>}
            <button onClick={handleSend} disabled={!toAddr || sending} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: toAddr && !sending ? `linear-gradient(135deg, ${C.red}, ${C.redDark})` : C.gray200, color: toAddr && !sending ? C.white : C.gray400, fontSize: 12, fontWeight: 600, cursor: toAddr && !sending ? "pointer" : "default" }}>{sending ? "Sending..." : sent ? "✓ Sent" : "Send Email"}</button>
          </div>
        </div>
        {/* Email thread history */}
        {thread.length > 0 && (
          <div style={{ marginTop: 16, borderTop: `1px solid ${C.gray200}`, paddingTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", marginBottom: 8, letterSpacing: "0.08em" }}>Email Thread ({thread.length})</div>
            <div style={{ maxHeight: 200, overflow: "auto" }}>
              {thread.slice().reverse().map(msg => (
                <div key={msg.id} style={{ padding: "8px 10px", borderRadius: 6, border: `1px solid ${msg.direction === "inbound" ? C.blueBg : C.gray100}`, background: msg.direction === "inbound" ? C.blueBg + "40" : C.gray50, marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: msg.direction === "inbound" ? C.blue : C.navy }}>{msg.direction === "inbound" ? `← From: ${msg.from}` : `→ To: ${msg.to}`}</span>
                    <span style={{ fontSize: 9, color: C.gray400 }}>{new Date(msg.sentAt || msg.receivedAt).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.gray600 }}>{msg.subject}</div>
                  <div style={{ fontSize: 11, color: C.gray500, marginTop: 2, whiteSpace: "pre-line", maxHeight: 60, overflow: "hidden" }}>{(msg.body || "").substring(0, 200)}{(msg.body || "").length > 200 ? "..." : ""}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailCompose;
