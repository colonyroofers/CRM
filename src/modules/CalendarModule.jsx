import React, { useState } from 'react';
import { C, generateId } from '../utils/constants';

    function CalendarModule({ user, role, entities, salesLeads = [], serviceTickets = [], inspections = [] }) {
      const [currentMonth, setCurrentMonth] = useState(new Date());
      const [selectedDay, setSelectedDay] = useState(null);
      const [filters, setFilters] = useState({ bids: true, inspections: true, service: true });

      const events = useMemo(() => {
        const evts = [];
        if (filters.bids) {
          salesLeads.filter(l => l.bidDueDate).forEach(l => {
            const comp = entities.companies?.find(c => c.id === l.companyId);
            evts.push({ date: l.bidDueDate, title: l.company || l.jobName || comp?.name || "Bid Due", type: "bid", color: "#F59E0B", module: "sales", entityId: l.id, detail: { company: comp?.name || l.company || "—", value: l.estimatedValue, stage: SALES_STAGES.find(s => s.id === l.stage)?.label || l.stage, estimator: l.estimator } });
          });
        }
        if (filters.inspections) {
          inspections.filter(i => i.scheduledDate).forEach(i => {
            evts.push({ date: i.scheduledDate, title: `Inspection: ${i.inspector || "TBD"}`, type: "inspection", color: "#3B82F6", module: "inspections", entityId: i.id, detail: { inspector: i.inspector || "TBD", status: i.status || "—", notes: i.summary || "" } });
          });
        }
        if (filters.service) {
          serviceTickets.filter(t => t.scheduledDate).forEach(t => {
            const comp = entities.companies?.find(c => c.id === t.companyId);
            evts.push({ date: t.scheduledDate, title: t.subject || "Service", type: "service", color: "#EF4444", module: "service", entityId: t.id, detail: { company: comp?.name || "—", priority: t.priority || "—", status: t.status || "—" } });
          });
        }
        return evts;
      }, [salesLeads, serviceTickets, inspections, filters, entities]);

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const today = new Date().toISOString().split("T")[0];
      const monthName = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });

      const days = [];
      for (let i = 0; i < firstDay; i++) days.push(null);
      for (let d = 1; d <= daysInMonth; d++) days.push(d);

      const getEventsForDay = (day) => {
        if (!day) return [];
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return events.filter(e => e.date && e.date.startsWith(dateStr));
      };

      const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

      return (
        <div style={{ background: C.gray50, minHeight: "calc(100vh - 56px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, margin: "0 0 8px" }}>Calendar</h1>
            <p style={{ fontSize: 14, color: C.gray500, margin: "0 0 24px" }}>Track bids, inspections, and service appointments across all clients</p>

            {/* Controls: Month nav + filters */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, background: C.white, padding: 16, borderRadius: 10, border: `1px solid ${C.gray200}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <button onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))} style={{ padding: "6px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, background: C.white, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.navy }}>← Prev</button>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, minWidth: 180, textAlign: "center" }}>{monthName}</div>
                <button onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))} style={{ padding: "6px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, background: C.white, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.navy }}>Next →</button>
              </div>
              <button onClick={() => setCurrentMonth(new Date())} style={{ padding: "6px 14px", border: `1px solid ${C.navy}`, borderRadius: 6, background: C.navy, color: C.white, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Today</button>
            </div>

            {/* Filter checkboxes */}
            <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
              {[
                { key: "bids", label: "Bid Due Dates", color: "#F59E0B" },
                { key: "inspections", label: "Inspections", color: "#3B82F6" },
                { key: "service", label: "Service Dispatch", color: "#EF4444" }
              ].map(f => (
                <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, color: C.navy }}>
                  <input type="checkbox" checked={filters[f.key]} onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.checked }))} style={{ cursor: "pointer" }} />
                  <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, background: f.color }}></span>
                  {f.label}
                </label>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: 16, marginBottom: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: C.gray200, padding: 1 }}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} style={{ padding: 12, textAlign: "center", fontWeight: 700, fontSize: 11, color: C.gray500, background: C.gray50, textTransform: "uppercase" }}>{d}</div>
                ))}
                {days.map((day, idx) => {
                  const dayEvents = getEventsForDay(day);
                  const dateStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
                  const isToday = dateStr === today;
                  return (
                    <div
                      key={idx}
                      onClick={() => day && setSelectedDay(day)}
                      style={{
                        padding: 12,
                        minHeight: 120,
                        background: C.white,
                        border: isToday ? `3px solid ${C.red}` : `1px solid ${C.gray100}`,
                        borderRadius: 6,
                        cursor: day ? "pointer" : "default",
                        transition: "background 0.2s",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6
                      }}
                      onMouseEnter={e => day && (e.currentTarget.style.background = C.gray50)}
                      onMouseLeave={e => e.currentTarget.style.background = C.white}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: day ? C.navy : C.gray200 }}>{day}</div>
                      {dayEvents.slice(0, 3).map((evt, i) => (
                        <div key={i} style={{ padding: "3px 6px", borderRadius: 4, background: evt.color + "20", fontSize: 10, color: evt.color, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {evt.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && <div style={{ fontSize: 9, color: C.gray400, fontWeight: 600 }}>+{dayEvents.length - 3} more</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected day detail panel */}
            {selectedDay && (
              <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>
                    {new Date(year, month, selectedDay).toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric" })}
                  </h2>
                  <button onClick={() => setSelectedDay(null)} style={{ padding: "6px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, background: C.white, cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.gray600 }}>Close</button>
                </div>
                {selectedDayEvents.length === 0 ? (
                  <p style={{ color: C.gray400, fontSize: 13 }}>No events scheduled for this day.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {selectedDayEvents.map((evt, i) => (
                      <div key={i} style={{ padding: 14, borderRadius: 8, border: `2px solid ${evt.color}30`, background: evt.color + "08" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: evt.color }}></span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{evt.title}</span>
                          <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: evt.color + "20", color: evt.color }}>{evt.type === "bid" ? "Bid Due" : evt.type === "inspection" ? "Inspection" : "Service"}</span>
                        </div>
                        {evt.detail && evt.type === "bid" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                          <div style={{ fontSize: 11, color: C.gray500 }}>Company: <span style={{ fontWeight: 600, color: C.navy }}>{evt.detail.company}</span></div>
                          {evt.detail.value > 0 && <div style={{ fontSize: 11, color: C.gray500 }}>Value: <span style={{ fontWeight: 600, color: C.green }}>{formatCurrency(evt.detail.value)}</span></div>}
                          <div style={{ fontSize: 11, color: C.gray500 }}>Stage: <span style={{ fontWeight: 600, color: C.navy }}>{evt.detail.stage}</span></div>
                          {evt.detail.estimator && <div style={{ fontSize: 11, color: C.gray500 }}>Estimator: <span style={{ fontWeight: 600, color: C.navy }}>{evt.detail.estimator}</span></div>}
                        </div>}
                        {evt.detail && evt.type === "inspection" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                          <div style={{ fontSize: 11, color: C.gray500 }}>Inspector: <span style={{ fontWeight: 600, color: C.navy }}>{evt.detail.inspector}</span></div>
                          <div style={{ fontSize: 11, color: C.gray500 }}>Status: <span style={{ fontWeight: 600, color: C.navy }}>{evt.detail.status}</span></div>
                          {evt.detail.notes && <div style={{ fontSize: 11, color: C.gray500, gridColumn: "1 / -1" }}>Notes: {evt.detail.notes}</div>}
                        </div>}
                        {evt.detail && evt.type === "service" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                          <div style={{ fontSize: 11, color: C.gray500 }}>Company: <span style={{ fontWeight: 600, color: C.navy }}>{evt.detail.company}</span></div>
                          <div style={{ fontSize: 11, color: C.gray500 }}>Priority: <span style={{ fontWeight: 600, color: C.navy }}>{evt.detail.priority}</span></div>
                          <div style={{ fontSize: 11, color: C.gray500 }}>Status: <span style={{ fontWeight: 600, color: C.navy }}>{evt.detail.status}</span></div>
                        </div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // ============================================================
    // HELPER: CSV Export


export default CalendarModule;
