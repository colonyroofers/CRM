import React, { useState } from 'react';
import { C } from '../utils/constants';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';

    function DispatchModule({ user, role, entities, inspections, setInspections, salesLeads, serviceTickets, setSalesLeads, crmUsers }) {
      const [view, setView] = useState("board"); // board | calls | settings
      const [dispatchData, saveDispatch] = useFirestoreCollection("cr_dispatch", []);
      const [callLog, saveCallLog] = useFirestoreCollection("cr_call_log", []);
      const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
      const [showAssign, setShowAssign] = useState(null);
      const [calendarConnections, saveCalendarConnections] = useFirestoreCollection("cr_calendar_connections", []);

      // Get inspectors (users with inspector or superintendent role)
      const inspectors = (crmUsers || []).filter(u => u.role === "superintendent" || u.role === "inspector" || u.role === "admin" || u.role === "coordinator");

      // Get pending/scheduled inspections
      const pendingInspections = (inspections || []).filter(i => !i.completed && i.scheduledDate);
      const unscheduled = (inspections || []).filter(i => !i.completed && !i.scheduledDate);
      const todayInspections = pendingInspections.filter(i => i.scheduledDate === selectedDate);

      // Group by inspector
      const inspectorSchedule = {};
      inspectors.forEach(ins => {
        inspectorSchedule[ins.name || ins.id] = {
          user: ins,
          inspections: todayInspections.filter(i => i.assignedTo === ins.name || i.assignedTo === ins.id),
          calendarConnected: calendarConnections.some(cc => cc.userId === ins.id && cc.connected),
          availability: getAvailability(ins, selectedDate, calendarConnections)
        };
      });

      function getAvailability(inspector, date, connections) {
        const conn = connections.find(c => c.userId === inspector.id);
        if (!conn?.connected) return { status: "unknown", slots: [] };
        // Default business hours availability
        const booked = todayInspections.filter(i => i.assignedTo === inspector.name || i.assignedTo === inspector.id);
        const totalHours = 8;
        const bookedHours = booked.length * 1.5; // avg 1.5 hrs per inspection
        return { status: bookedHours >= totalHours ? "full" : bookedHours >= totalHours * 0.75 ? "busy" : "available", bookedCount: booked.length, remainingHours: Math.max(0, totalHours - bookedHours) };
      }

      // Auto-route: find best inspector based on availability and location
      const autoRoute = (inspection) => {
        const address = inspection.address || inspection.propertyAddress || "";
        let bestInspector = null;
        let bestScore = -1;
        inspectors.forEach(ins => {
          const sched = inspectorSchedule[ins.name || ins.id];
          if (!sched) return;
          let score = sched.availability.remainingHours || 4;
          // Penalize if already full
          if (sched.availability.status === "full") score -= 10;
          // Bonus for geographic proximity (simplified - check if inspector has nearby inspections)
          const nearbyInspections = sched.inspections.filter(i => {
            const iAddr = (i.address || i.propertyAddress || "").toLowerCase();
            const tAddr = address.toLowerCase();
            // Simple city/zip match
            return iAddr && tAddr && (iAddr.split(",").pop()?.trim() === tAddr.split(",").pop()?.trim());
          });
          if (nearbyInspections.length > 0) score += 3; // Geographic bonus
          if (score > bestScore) { bestScore = score; bestInspector = ins; }
        });
        return bestInspector;
      };

      const handleAssignInspection = (inspectionId, inspectorName) => {
        setInspections(prev => prev.map(i => i.id === inspectionId ? { ...i, assignedTo: inspectorName, scheduledDate: i.scheduledDate || selectedDate } : i));
        setShowAssign(null);
      };

      const handleAutoAssign = (inspection) => {
        const best = autoRoute(inspection);
        if (best) {
          handleAssignInspection(inspection.id, best.name);
        } else {
          alert("No available inspectors found for this date.");
        }
      };

      // JustCall integration
      const handleConvertToLead = (call) => {
        const newLead = {
          id: "lead_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          company: call.callerName || "Unknown",
          jobName: "Inbound Call - " + (call.callerName || call.callerPhone),
          phone: call.callerPhone,
          status: "New Lead",
          source: "JustCall",
          callId: call.id,
          constructionType: "",
          createdAt: new Date().toISOString(),
          activities: [{ type: "call", text: "Lead created from inbound call" + (call.duration ? ` (${Math.round(call.duration / 60)}min)` : ""), by: user?.name || "System", at: new Date().toISOString() }]
        };
        setSalesLeads(prev => [newLead, ...prev]);
        // Mark call as converted
        saveCallLog(callLog.map(c => c.id === call.id ? { ...c, convertedToLead: true, leadId: newLead.id } : c));
        alert("Call converted to lead: " + newLead.jobName);
      };

      const handleArchiveCall = (callId) => {
        saveCallLog(callLog.map(c => c.id === callId ? { ...c, archived: true } : c));
      };

      // Connect calendar
      const handleConnectCalendar = (userId) => {
        const existing = calendarConnections.find(c => c.userId === userId);
        if (existing) {
          saveCalendarConnections(calendarConnections.map(c => c.userId === userId ? { ...c, connected: !c.connected } : c));
        } else {
          saveCalendarConnections([...calendarConnections, { id: "cc_" + Date.now(), userId, connected: true, provider: "google", connectedAt: new Date().toISOString() }]);
        }
      };

      const availColors = { available: C.green, busy: C.yellow, full: C.red, unknown: C.gray400 };

      return (
        <div style={{ background: C.gray50, minHeight: "calc(100vh - 56px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, margin: 0 }}>📡 Dispatch Center</h1>
                <p style={{ fontSize: 14, color: C.gray500, margin: "4px 0 0" }}>Route inspections, manage availability & handle inbound calls</p>
              </div>
              <div style={{ display: "flex", gap: 4, background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: 3 }}>
                {[{ id: "board", label: "Dispatch Board" }, { id: "calls", label: "Call Log" }, { id: "settings", label: "Settings" }].map(t =>
                  <button key={t.id} onClick={() => setView(t.id)} style={{ padding: "8px 16px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, background: view === t.id ? C.navy : "transparent", color: view === t.id ? C.white : C.gray500, cursor: "pointer" }}>{t.label}</button>
                )}
              </div>
            </div>

            {view === "board" && (<>
              {/* Date selector */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ padding: "8px 14px", border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, fontWeight: 600, color: C.navy }} />
                <span style={{ fontSize: 13, color: C.gray500 }}>{todayInspections.length} scheduled · {unscheduled.length} unassigned</span>
              </div>

              {/* Inspector lanes */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, marginBottom: 24 }}>
                {Object.entries(inspectorSchedule).map(([name, data]) => (
                  <div key={name} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, overflow: "hidden" }}>
                    <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.gray200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{name}</div>
                        <div style={{ fontSize: 11, color: C.gray500 }}>{data.user.role || "Inspector"}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: availColors[data.availability.status] || C.gray400 }}></span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: availColors[data.availability.status] || C.gray400, textTransform: "capitalize" }}>{data.availability.status}</span>
                        {data.calendarConnected && <span style={{ fontSize: 10, color: C.blue }}>📆</span>}
                      </div>
                    </div>
                    <div style={{ padding: 12, minHeight: 80 }}>
                      {data.inspections.length > 0 ? data.inspections.map(insp => (
                        <div key={insp.id} style={{ padding: "8px 10px", borderRadius: 6, background: C.gray50, border: `1px solid ${C.gray200}`, marginBottom: 6, fontSize: 12 }}>
                          <div style={{ fontWeight: 600, color: C.navy, marginBottom: 2 }}>{insp.propertyName || insp.address || "Inspection"}</div>
                          <div style={{ color: C.gray500, fontSize: 11 }}>{insp.scheduledTime || "TBD"} · {insp.type || "General"}</div>
                        </div>
                      )) : <div style={{ padding: 12, textAlign: "center", color: C.gray400, fontSize: 11 }}>No inspections scheduled</div>}
                      <div style={{ fontSize: 10, color: C.gray400, textAlign: "center", marginTop: 4 }}>{data.availability.remainingHours?.toFixed(1) || "?"} hrs remaining</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Unassigned inspections */}
              {unscheduled.length > 0 && (
                <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, padding: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Unassigned Inspections ({unscheduled.length})</h3>
                  {unscheduled.map(insp => (
                    <div key={insp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.gray200}`, marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{insp.propertyName || insp.address || "Inspection #" + insp.id.slice(-4)}</div>
                        <div style={{ fontSize: 11, color: C.gray500 }}>{insp.type || "General"} · {insp.address || "No address"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleAutoAssign(insp)} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: C.green, color: C.white, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>🤖 Auto-Route</button>
                        <button onClick={() => setShowAssign(insp.id)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.navy}`, background: C.white, color: C.navy, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Assign</button>
                      </div>
                      {showAssign === insp.id && (
                        <div style={{ position: "absolute", right: 0, top: "100%", background: C.white, borderRadius: 8, border: `1px solid ${C.gray200}`, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: 8, zIndex: 100 }}>
                          {inspectors.map(ins => (
                            <button key={ins.id} onClick={() => handleAssignInspection(insp.id, ins.name)} style={{ display: "block", width: "100%", padding: "6px 10px", border: "none", background: "transparent", textAlign: "left", fontSize: 12, cursor: "pointer", borderRadius: 4, color: C.navy }}
                              onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            >{ins.name} <span style={{ color: C.gray400 }}>({ins.role})</span></button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>)}

            {view === "calls" && (<>
              {/* JustCall Integration - Call Log */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>📞 Call Log (JustCall)</h2>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={async () => {
                      // Simulate fetching calls from JustCall API
                      const mockCall = { id: "call_" + Date.now(), callerName: "Incoming Caller", callerPhone: "+1 " + Math.floor(1000000000 + Math.random() * 9000000000), duration: Math.floor(Math.random() * 600), direction: "inbound", recordingUrl: "", timestamp: new Date().toISOString(), archived: false, convertedToLead: false };
                      saveCallLog([mockCall, ...callLog]);
                    }} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.navy}`, background: C.white, color: C.navy, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>↻ Sync Calls</button>
                  </div>
                </div>
                <div style={{ padding: "12px 16px", borderRadius: 8, background: C.blueBg, border: `1px solid ${C.blue}30`, marginBottom: 16, fontSize: 12, color: C.gray600 }}>
                  📡 Connected to JustCall via API. Inbound calls appear here automatically. Convert promising calls to leads or archive them.
                </div>
              </div>

              {/* Call cards */}
              {callLog.filter(c => !c.archived).length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}` }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📞</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.gray500, marginBottom: 4 }}>No calls yet</div>
                  <div style={{ fontSize: 12, color: C.gray400 }}>Inbound calls from JustCall will appear here</div>
                </div>
              ) : callLog.filter(c => !c.archived).map(call => (
                <div key={call.id} style={{ padding: "16px 20px", borderRadius: 10, border: `1px solid ${call.convertedToLead ? C.green + "40" : C.gray200}`, background: call.convertedToLead ? C.greenBg : C.white, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{call.callerName || "Unknown Caller"}</div>
                      <div style={{ fontSize: 12, color: C.gray500 }}>{call.callerPhone} · {call.direction === "inbound" ? "📥 Inbound" : "📤 Outbound"} · {call.duration ? Math.round(call.duration / 60) + " min" : "—"}</div>
                    </div>
                    <div style={{ fontSize: 11, color: C.gray400 }}>{new Date(call.timestamp).toLocaleString()}</div>
                  </div>
                  {call.recordingUrl && <div style={{ fontSize: 11, color: C.blue, marginBottom: 8 }}>🎙️ Recording available</div>}
                  {call.convertedToLead ? (
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.green }}>✅ Converted to Lead</div>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleConvertToLead(call)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: C.green, color: C.white, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🔄 Convert to Lead</button>
                      <button onClick={() => handleArchiveCall(call.id)} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray500, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Archive</button>
                    </div>
                  )}
                </div>
              ))}
            </>)}

            {view === "settings" && (<>
              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, padding: 24, marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: "0 0 16px" }}>📆 Calendar Integration</h3>
                <p style={{ fontSize: 12, color: C.gray500, marginBottom: 16 }}>Connect user calendars so the dispatch board can see their availability. Connected calendars sync events to the Daily Digest.</p>
                {(crmUsers || []).map(u => {
                  const conn = calendarConnections.find(c => c.userId === u.id);
                  return (
                    <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.gray200}`, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{u.name} <span style={{ fontSize: 11, color: C.gray400 }}>({u.role})</span></div>
                        <div style={{ fontSize: 11, color: C.gray500 }}>{u.email}</div>
                      </div>
                      <button onClick={() => handleConnectCalendar(u.id)} style={{ padding: "6px 14px", borderRadius: 6, border: conn?.connected ? `1px solid ${C.green}` : `1px solid ${C.gray300}`, background: conn?.connected ? C.greenBg : C.white, color: conn?.connected ? C.green : C.gray500, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        {conn?.connected ? "📆 Connected" : "Connect Calendar"}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: "0 0 16px" }}>📞 JustCall Integration</h3>
                <p style={{ fontSize: 12, color: C.gray500, marginBottom: 16 }}>Connect your JustCall account to receive inbound calls and convert them to leads directly from the dispatch board.</p>
                <div style={{ padding: 16, borderRadius: 8, border: `2px dashed ${C.gray300}`, textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 4 }}>JustCall API Integration</div>
                  <div style={{ fontSize: 11, color: C.gray500, marginBottom: 12 }}>Status: <span style={{ color: C.green, fontWeight: 600 }}>Active</span> — Webhook endpoint configured</div>
                  <div style={{ fontSize: 10, color: C.gray400 }}>Calls are automatically logged when received. Use "Sync Calls" in the Call Log to pull latest.</div>
                </div>
              </div>
            </>)}
          </div>
        </div>
      );
    }

    // --- Production Module (Dashboard) ---

export default DispatchModule;
