import React, { useState, useMemo } from 'react';
import { C, formatCurrency, fmt } from '../utils/constants';

    function ReportsModule({ user, role, entities, salesLeads, serviceTickets }) {
      const { companies, properties, contacts } = entities;
      const leads = salesLeads || [];
      const tickets = serviceTickets || [];
      const [reportType, setReportType] = useState("company");
      const [search, setSearch] = useState("");
      const [reportTab, setReportTab] = useState("table");
      const [dateRange, setDateRange] = useState("all");

      const buildRows = () => {
        if (reportType === "company") {
          return companies.map(c => ({ id: c.id, name: c.name, icon: "🏢", sub: `${MARKET_LABELS[c.market] || "—"} · ${c.type || "—"}`, leads: leads.filter(l => l.companyId === c.id), tickets: tickets.filter(t => t.companyId === c.id), properties: properties.filter(p => p.companyId === c.id).length }));
        } else if (reportType === "property") {
          return properties.map(p => ({ id: p.id, name: p.name, icon: "🏠", sub: `${p.address || "—"} · ${companies.find(c => c.id === p.companyId)?.name || "—"}`, leads: leads.filter(l => l.propertyId === p.id), tickets: tickets.filter(t => t.propertyId === p.id), properties: 0 }));
        } else {
          return contacts.map(c => ({ id: c.id, name: c.name, icon: "👤", sub: `${c.email || "—"} · ${companies.find(co => co.id === c.companyId)?.name || "—"}`, leads: leads.filter(l => l.contactId === c.id), tickets: tickets.filter(t => t.contactId === c.id), properties: 0 }));
        }
      };

      const rows = buildRows().filter(r => !search || r.name?.toLowerCase().includes(search.toLowerCase()));
      const totalPipeline = leads.filter(l => !["awarded", "closed_lost"].includes(l.stage)).reduce((s, l) => s + (l.estimatedValue || 0), 0);
      const totalWon = leads.filter(l => l.stage === "awarded").reduce((s, l) => s + (l.estimatedValue || 0), 0);
      const openTickets = tickets.filter(t => !["Complete", "Closed"].includes(t.status)).length;

      // Chart data calculations
      const stageGroups = ["discovery", "proposal", "negotiation", "awarded", "closed_lost"];
      const pipelineData = stageGroups.map(stage => {
        const value = leads.filter(l => l.stage === stage && !["awarded", "closed_lost"].includes(l.stage)).length;
        return { label: stage.replace(/_/g, " "), value, displayValue: value, color: { discovery: C.blue, proposal: C.navy, negotiation: "#8B5CF6", awarded: C.green, closed_lost: C.red }[stage] || C.gray400 };
      }).filter(d => d.value > 0);

      const marketLeadData = ["ATL", "TPA", "DFW"].map(market => ({
        label: market,
        value: leads.filter(l => {
          const comp = companies.find(c => c.id === l.companyId);
          return comp?.market === market && !["awarded", "closed_lost"].includes(l.stage);
        }).length,
        displayValue: leads.filter(l => {
          const comp = companies.find(c => c.id === l.companyId);
          return comp?.market === market && !["awarded", "closed_lost"].includes(l.stage);
        }).length,
        color: market === "ATL" ? "#3B82F6" : market === "TPA" ? "#10B981" : "#F59E0B"
      }));

      const ticketPriorityData = ["high", "medium", "low"].map(priority => {
        const count = tickets.filter(t => t.priority === priority && !["Complete", "Closed"].includes(t.status)).length;
        return { label: priority, value: count, displayValue: count, color: priority === "high" ? C.red : priority === "medium" ? C.yellow : C.green };
      }).filter(d => d.value > 0);

      return (
        <div style={{ background: C.gray50, minHeight: "calc(100vh - 56px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
            <div style={{ marginBottom: 24 }}><h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, margin: 0 }}>Reports</h1><p style={{ fontSize: 14, color: C.gray500, margin: "4px 0 0" }}>Sales and service activity across your client database</p></div>
            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              <StatCard label="Pipeline Value" value={formatCurrency(totalPipeline)} icon={I.dollar} accent={C.navy} />
              <StatCard label="Won" value={formatCurrency(totalWon)} icon={I.check} accent={C.green} />
              <StatCard label="Total Leads" value={leads.length} icon={I.user} accent={C.blue} />
              <StatCard label="Open Tickets" value={openTickets} icon={I.alert} accent={openTickets > 0 ? C.yellow : C.green} />
            </div>

            {/* Tab toggle: Charts / Table */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 2, background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: 2 }}>
                {[{ id: "table", label: "Table View" }, { id: "charts", label: "Charts" }].map(t => (
                  <button key={t.id} onClick={() => setReportTab(t.id)} style={{ padding: "7px 16px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, background: reportTab === t.id ? C.navy : "transparent", color: reportTab === t.id ? C.white : C.gray500, cursor: "pointer" }}>{t.label}</button>
                ))}
              </div>
              {reportTab === "charts" && (
                <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ padding: "7px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 12, fontWeight: 600, color: C.navy, background: C.white, cursor: "pointer" }}>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last 12 months</option>
                  <option value="all">All time</option>
                </select>
              )}
              <button onClick={() => {
                if (reportTab === "table") {
                  const exportRows = rows.map(r => {
                    const pipeline = r.leads.filter(l => !["awarded", "closed_lost"].includes(l.stage)).reduce((s, l) => s + (l.estimatedValue || 0), 0);
                    const won = r.leads.filter(l => l.stage === "awarded").reduce((s, l) => s + (l.estimatedValue || 0), 0);
                    const openTix = r.tickets.filter(t => !["Complete", "Closed"].includes(t.status)).length;
                    return [r.name, r.leads.length, pipeline, won, r.tickets.length, openTix, ...(reportType === "company" ? [r.properties] : [])];
                  });
                  const headers = [reportType === "company" ? "Company" : reportType === "property" ? "Property" : "Contact", "Leads", "Pipeline", "Won", "Tickets", "Open", ...(reportType === "company" ? ["Properties"] : [])];
                  downloadCSV(`Colony_Roofers_Report_${new Date().toISOString().split("T")[0]}.csv`, headers, exportRows);
                } else {
                  const stageLabels = ["Pipeline by Stage", ...pipelineData.map(d => d.label)];
                  const marketLabels = ["Leads by Market", ...marketLeadData.map(d => d.label)];
                  const allSections = [
                    ["Pipeline by Stage", "Count"],
                    ...pipelineData.map(d => [d.label, d.value]),
                    [],
                    ["Leads by Market", "Count"],
                    ...marketLeadData.map(d => [d.label, d.value]),
                    [],
                    ["Win Rate by Market", "Won", "Lost", "Rate (%)"],
                    ...["ATL", "TPA", "DFW"].map(market => {
                      const awarded = leads.filter(l => { const comp = companies.find(c => c.id === l.companyId); return comp?.market === market && l.stage === "awarded"; }).length;
                      const lost = leads.filter(l => { const comp = companies.find(c => c.id === l.companyId); return comp?.market === market && l.stage === "closed_lost"; }).length;
                      const rate = ((awarded / (awarded + lost)) * 100 || 0).toFixed(0);
                      return [market, awarded, lost, rate];
                    }),
                    [],
                    ["Tickets by Priority", "Count"],
                    ...ticketPriorityData.map(d => [d.label, d.value])
                  ];
                  downloadCSV(`Colony_Roofers_Report_${new Date().toISOString().split("T")[0]}.csv`, allSections[0], allSections.slice(1));
                }
              }} style={{ padding: "7px 14px", border: `1px solid ${C.gray300}`, background: C.white, color: C.navy, fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer" }}>📥 Export CSV</button>
            </div>

            {/* Charts tab */}
            {reportTab === "charts" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
                {/* Pipeline funnel */}
                <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 16px" }}>Pipeline by Stage</h3>
                  {pipelineData.length > 0 ? <BarChart data={pipelineData} width={400} height={220} /> : <p style={{ color: C.gray400, fontSize: 12 }}>No pipeline data available</p>}
                </div>

                {/* Market distribution */}
                <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 16px" }}>Leads by Market</h3>
                  {marketLeadData.some(d => d.value > 0) ? <BarChart data={marketLeadData} width={400} height={220} /> : <p style={{ color: C.gray400, fontSize: 12 }}>No market data available</p>}
                </div>

                {/* Win rate donut charts by market */}
                {["ATL", "TPA", "DFW"].map(market => {
                  const awarded = leads.filter(l => {
                    const comp = companies.find(c => c.id === l.companyId);
                    return comp?.market === market && l.stage === "awarded";
                  }).length;
                  const lost = leads.filter(l => {
                    const comp = companies.find(c => c.id === l.companyId);
                    return comp?.market === market && l.stage === "closed_lost";
                  }).length;
                  const open = leads.filter(l => {
                    const comp = companies.find(c => c.id === l.companyId);
                    return comp?.market === market && !["awarded", "closed_lost"].includes(l.stage);
                  }).length;
                  const donutData = [
                    { value: awarded, color: C.green },
                    { value: lost, color: C.red },
                    { value: open, color: C.blue }
                  ].filter(d => d.value > 0);
                  return (
                    <div key={market} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 16px" }}>{market} Win Rate</h3>
                      {donutData.length > 0 ? <DonutChart data={donutData} size={160} label={`${((awarded / (awarded + lost)) * 100 || 0).toFixed(0)}%`} /> : <p style={{ color: C.gray400, fontSize: 12 }}>No data</p>}
                      <div style={{ fontSize: 11, color: C.gray500, marginTop: 12, textAlign: "center" }}>Awarded: {awarded} · Lost: {lost}</div>
                    </div>
                  );
                })}

                {/* Service priority tickets */}
                <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 16px" }}>Tickets by Priority</h3>
                  {ticketPriorityData.length > 0 ? <BarChart data={ticketPriorityData} width={400} height={220} /> : <p style={{ color: C.gray400, fontSize: 12 }}>No ticket data available</p>}
                </div>

                {/* Loss Reasons */}
                {(() => {
                  const lossReasons = leads.filter(l => l.stage === "closed_lost").reduce((acc, l) => {
                    const reason = l.closeReason || "Unknown";
                    const existing = acc.find(r => r.label === reason);
                    if (existing) { existing.value++; } else { acc.push({ label: reason, value: 1, displayValue: 1, color: C.red }); }
                    return acc;
                  }, []).sort((a, b) => b.value - a.value);
                  return (
                    <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: 20 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 16px" }}>Loss Reasons</h3>
                      {lossReasons.length > 0 ? <BarChart data={lossReasons} width={400} height={220} /> : <p style={{ color: C.gray400, fontSize: 12 }}>No lost deals yet</p>}
                    </div>
                  );
                })()}

                {/* Top Competitors */}
                {(() => {
                  const competitors = leads.filter(l => l.stage === "closed_lost" && l.lostToCompetitor).reduce((acc, l) => {
                    const comp = l.lostToCompetitor;
                    const existing = acc.find(c => c.name === comp);
                    const amount = l.estimatedValue || 0;
                    if (existing) { existing.count++; existing.amount += amount; } else { acc.push({ name: comp, count: 1, amount }); }
                    return acc;
                  }, []).sort((a, b) => b.count - a.count).slice(0, 10);
                  return (
                    <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.gray200}`, padding: 20 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 16px" }}>Top Competitors</h3>
                      {competitors.length > 0 ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          {competitors.map((c, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: C.gray50, borderRadius: 6 }}>
                              <div><div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{c.name}</div><div style={{ fontSize: 11, color: C.gray500 }}>Won {c.count} deal{c.count !== 1 ? "s" : ""}</div></div>
                              <div style={{ textAlign: "right" }}><div style={{ fontSize: 13, fontWeight: 700, color: C.red }}>{formatCurrency(c.amount)}</div><div style={{ fontSize: 11, color: C.gray500 }}>Total lost</div></div>
                            </div>
                          ))}
                        </div>
                      ) : <p style={{ color: C.gray400, fontSize: 12 }}>No competitor data available</p>}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Table tab */}
            {reportTab === "table" && (
              <>
                {/* Report type + search */}
                <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 2, background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: 2 }}>
                    {[{ id: "company", label: "By Company" }, { id: "property", label: "By Property" }, { id: "contact", label: "By Contact" }].map(t => <button key={t.id} onClick={() => setReportType(t.id)} style={{ padding: "7px 16px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, background: reportType === t.id ? C.navy : "transparent", color: reportType === t.id ? C.white : C.gray500, cursor: "pointer" }}>{t.label}</button>)}
                  </div>
                  <div style={{ position: "relative", flex: 1 }}><span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.gray400 }}>{I.search}</span>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: "100%", padding: "8px 10px 8px 34px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none", background: C.white }} /></div>
                </div>
                {/* Report table */}
            <div style={{ borderRadius: 10, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ background: C.gray50 }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>{reportType}</th>
                  <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Leads</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Pipeline</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Won</th>
                  <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Tickets</th>
                  <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Open</th>
                  {reportType === "company" && <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Properties</th>}
                </tr></thead>
                <tbody>{rows.map(r => {
                  const pipeline = r.leads.filter(l => !["awarded", "closed_lost"].includes(l.stage)).reduce((s, l) => s + (l.estimatedValue || 0), 0);
                  const won = r.leads.filter(l => l.stage === "awarded").reduce((s, l) => s + (l.estimatedValue || 0), 0);
                  const openTix = r.tickets.filter(t => !["Complete", "Closed"].includes(t.status)).length;
                  return (
                    <tr key={r.id} style={{ borderTop: `1px solid ${C.gray100}` }}>
                      <td style={{ padding: "10px 12px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span>{r.icon}</span><div><div style={{ fontWeight: 700, color: C.navy }}>{r.name}</div><div style={{ fontSize: 10, color: C.gray400 }}>{r.sub}</div></div></div></td>
                      <td style={{ padding: "10px 8px", textAlign: "center", fontWeight: 600, color: C.navy }}>{r.leads.length}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, color: C.navy }}>{pipeline > 0 ? formatCurrency(pipeline) : "—"}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, color: won > 0 ? C.green : C.gray400 }}>{won > 0 ? formatCurrency(won) : "—"}</td>
                      <td style={{ padding: "10px 8px", textAlign: "center", fontWeight: 600, color: C.navy }}>{r.tickets.length}</td>
                      <td style={{ padding: "10px 8px", textAlign: "center" }}>{openTix > 0 ? <span style={{ padding: "2px 8px", borderRadius: 8, background: C.yellowBg, color: C.yellow, fontSize: 10, fontWeight: 700 }}>{openTix}</span> : <span style={{ color: C.gray400 }}>0</span>}</td>
                      {reportType === "company" && <td style={{ padding: "10px 8px", textAlign: "center", color: C.gray600 }}>{r.properties}</td>}
                    </tr>
                  );
                })}</tbody>
              </table>
              {rows.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.gray400, fontSize: 12 }}>No data yet. Add companies, leads, and tickets to see reports here.</div>}
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    // ============================================================
    // AI AGENT (Platform-wide — can read AND write CRM data)


export default ReportsModule;
