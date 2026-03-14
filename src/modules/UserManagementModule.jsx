import React, { useState } from 'react';
import { C, generateId } from '../utils/constants';

    function UserManagementModule({ user, role, crmUsers, setCrmUsers }) {
      const [search, setSearch] = useState("");
      const [showInvite, setShowInvite] = useState(false);
      const [editUser, setEditUser] = useState(null);

      const filtered = crmUsers.filter(u => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));
      const activeCount = crmUsers.filter(u => u.active !== false).length;

      // Build teams list from user data
      const teams = [...new Set(crmUsers.map(u => u.team).filter(Boolean))];

      const handleUpdateUser = (userId, updates) => {
        setCrmUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
        setEditUser(null);
      };

      const handleInvite = (data) => {
        const newUser = { ...data, id: generateId(), active: true, createdAt: new Date().toISOString() };
        setCrmUsers(prev => [...prev, newUser]);
        setShowInvite(false);
      };

      const handleDeactivate = (userId) => {
        if (!confirm("Deactivate this user? They will lose access.")) return;
        setCrmUsers(prev => prev.map(u => u.id === userId ? { ...u, active: false } : u));
        setEditUser(null);
      };

      const handleReactivate = (userId) => {
        setCrmUsers(prev => prev.map(u => u.id === userId ? { ...u, active: true } : u));
      };

      const fs = { width: "100%", padding: "10px 12px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none", boxSizing: "border-box" };
      const ls = { fontSize: 11, fontWeight: 600, color: C.gray600, marginBottom: 3, display: "block" };

      // ── Edit User Panel ──
      const EditUserPanel = () => {
        if (!editUser) return null;
        const u = crmUsers.find(x => x.id === editUser);
        if (!u) return null;
        const [form, setForm] = useState({ ...u, modules: u.modules || ROLE_PRESETS[u.role]?.modules || ALL_MODULES });

        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(17,29,53,0.5)", display: "flex", justifyContent: "center", alignItems: "flex-start", overflowY: "auto" }} onClick={() => setEditUser(null)}>
            <div style={{ width: "100%", maxWidth: 800, background: C.white, margin: "40px auto", borderRadius: 16, boxShadow: "0 25px 60px rgba(0,0,0,0.3)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: "20px 24px", background: `linear-gradient(135deg, ${C.navyDark}, ${C.navy})`, color: C.white }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <button onClick={() => setEditUser(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: C.white, padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600 }}>← Close</button>
                  {u.active !== false ? (
                    <button onClick={() => handleDeactivate(u.id)} style={{ background: "rgba(239,68,68,0.3)", border: "none", cursor: "pointer", color: "#FCA5A5", padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600 }}>Deactivate</button>
                  ) : (
                    <button onClick={() => handleReactivate(u.id)} style={{ background: "rgba(16,185,129,0.3)", border: "none", cursor: "pointer", color: "#6EE7B7", padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600 }}>Reactivate</button>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>{(u.name || "?")[0]}</div>
                  <div><h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{u.name}</h2><p style={{ fontSize: 12, opacity: 0.7, margin: "2px 0 0" }}>{u.email}</p></div>
                </div>
              </div>
              <div style={{ padding: "20px 24px", display: "grid", gap: 16 }}>
                {/* Basic info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={ls}>Name</label><input style={fs} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><label style={ls}>Email</label><input style={fs} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                </div>

                {/* Role */}
                <div>
                  <label style={ls}>Role</label>
                  <select style={fs} value={form.role} onChange={e => {
                    const newRole = e.target.value;
                    setForm(f => ({ ...f, role: newRole, modules: ROLE_PRESETS[newRole]?.modules || f.modules }));
                  }}>
                    {Object.entries(ROLE_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <p style={{ fontSize: 10, color: C.gray400, margin: "4px 0 0" }}>Changing role resets modules to that role's defaults. Customize below.</p>
                </div>

                {/* Team */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={ls}>Team</label>
                    <input style={fs} value={form.team || ""} onChange={e => setForm(f => ({ ...f, team: e.target.value }))} placeholder="e.g. Atlanta Crew" list="team-list" />
                    <datalist id="team-list">{teams.map(t => <option key={t} value={t} />)}</datalist>
                  </div>
                  <div>
                    <label style={ls}>Manager</label>
                    <select style={fs} value={form.managerId || ""} onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}>
                      <option value="">— None —</option>
                      {crmUsers.filter(x => x.id !== u.id && x.active !== false).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Markets */}
                <div>
                  <label style={ls}>Markets</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {MARKETS.map(m => (
                      <label key={m} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.navy, cursor: "pointer" }}>
                        <input type="checkbox" checked={(form.markets || MARKETS).includes(m)} onChange={e => {
                          const current = form.markets || [...MARKETS];
                          setForm(f => ({ ...f, markets: e.target.checked ? [...current, m] : current.filter(x => x !== m) }));
                        }} />
                        {MARKET_LABELS[m]}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Module Access */}
                <div>
                  <label style={{ ...ls, marginBottom: 8 }}>Module Access</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {ALL_MODULES.map(m => (
                      <label key={m} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, border: `1px solid ${form.modules.includes(m) ? C.green + "60" : C.gray200}`, background: form.modules.includes(m) ? C.greenBg + "40" : C.white, cursor: "pointer", fontSize: 12 }}>
                        <input type="checkbox" checked={form.modules.includes(m)} onChange={e => {
                          setForm(f => ({ ...f, modules: e.target.checked ? [...f.modules, m] : f.modules.filter(x => x !== m) }));
                        }} />
                        <span>{MODULE_ICONS[m]}</span>
                        <span style={{ fontWeight: 600, color: form.modules.includes(m) ? C.navy : C.gray500 }}>{MODULE_LABELS[m]}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Visibility */}
                <div>
                  <label style={ls}>Data Visibility</label>
                  <select style={fs} value={form.visibility || "all"} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}>
                    <option value="all">See all data across the platform</option>
                    <option value="team">Only see their team's data</option>
                    <option value="assigned">Only see data assigned to them</option>
                  </select>
                </div>

                <button onClick={() => handleUpdateUser(u.id, form)} style={{ padding: "12px 0", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.green}, #059669)`, color: C.white, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save Changes</button>
              </div>
            </div>
          </div>
        );
      };

      // ── Invite User Modal ──
      const InviteModal = () => {
        const [form, setForm] = useState({ name: "", email: "", role: "estimator", team: "", modules: ROLE_PRESETS.estimator.modules, markets: [...MARKETS], visibility: "all" });
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }} onClick={() => setShowInvite(false)}>
            <div style={{ background: C.white, borderRadius: 16, width: 520, maxHeight: "85vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${C.gray200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>Add Team Member</h2>
                <button onClick={() => setShowInvite(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400 }}>{I.x}</button>
              </div>
              <div style={{ padding: "20px 28px 28px", display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={ls}>Name *</label><input style={fs} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><label style={ls}>Email * (Google account)</label><input style={fs} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={ls}>Role</label><select style={fs} value={form.role} onChange={e => { const r = e.target.value; setForm(f => ({ ...f, role: r, modules: ROLE_PRESETS[r]?.modules || f.modules })); }}>{Object.entries(ROLE_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                  <div><label style={ls}>Team</label><input style={fs} value={form.team} onChange={e => setForm(f => ({ ...f, team: e.target.value }))} placeholder="e.g. Tampa Crew" list="team-list-invite" /><datalist id="team-list-invite">{teams.map(t => <option key={t} value={t} />)}</datalist></div>
                </div>
                <div><label style={{ ...ls, marginBottom: 8 }}>Module Access</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                    {ALL_MODULES.map(m => (
                      <label key={m} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "4px 6px", cursor: "pointer" }}>
                        <input type="checkbox" checked={form.modules.includes(m)} onChange={e => setForm(f => ({ ...f, modules: e.target.checked ? [...f.modules, m] : f.modules.filter(x => x !== m) }))} />
                        {MODULE_ICONS[m]} {MODULE_LABELS[m]}
                      </label>
                    ))}
                  </div>
                </div>
                <div><label style={ls}>Visibility</label><select style={fs} value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}><option value="all">All data</option><option value="team">Team only</option><option value="assigned">Assigned only</option></select></div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowInvite(false)} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button onClick={() => { if (form.name && form.email) handleInvite(form); }} disabled={!form.name || !form.email} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: form.name && form.email ? C.green : C.gray200, color: form.name && form.email ? C.white : C.gray400, fontSize: 13, fontWeight: 600, cursor: form.name && form.email ? "pointer" : "default" }}>Add Member</button>
                </div>
              </div>
            </div>
          </div>
        );
      };

      return (
        <div style={{ background: C.gray50, minHeight: "calc(100vh - 56px)" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div><h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, margin: 0 }}>User Management</h1><p style={{ fontSize: 14, color: C.gray500, margin: "4px 0 0" }}>Control who can access what — modules, data, and teams</p></div>
              <button onClick={() => setShowInvite(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, color: C.white, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 12px ${C.red}30` }}>{I.plus} Add Member</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              <StatCard label="Active Users" value={activeCount} icon={I.user} accent={C.green} />
              <StatCard label="Teams" value={teams.length || 1} icon={I.layers} accent={C.blue} />
              <StatCard label="Total Users" value={crmUsers.length} icon={I.building} accent={C.navy} />
            </div>

            <div style={{ position: "relative", marginBottom: 16 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.gray400 }}>{I.search}</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." style={{ width: "100%", padding: "10px 10px 10px 34px", border: `1px solid ${C.gray300}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none", background: C.white, boxSizing: "border-box" }} />
            </div>

            <div style={{ borderRadius: 10, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ background: C.gray50 }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>User</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Role</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Team</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Modules</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Visibility</th>
                  <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Status</th>
                </tr></thead>
                <tbody>{filtered.map(u => {
                  const rc = ROLE_COLORS[u.role] || C.gray500;
                  return (
                    <tr key={u.id} onClick={() => setEditUser(u.id)} style={{ cursor: "pointer", borderTop: `1px solid ${C.gray100}`, opacity: u.active === false ? 0.5 : 1 }}
                      onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{(u.name || "?")[0]}</div>
                          <div><div style={{ fontWeight: 700, color: C.navy }}>{u.name}</div><div style={{ fontSize: 10, color: C.gray400 }}>{u.email}</div></div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 8px" }}><span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: rc + "18", color: rc }}>{ROLE_PRESETS[u.role]?.label || u.role}</span></td>
                      <td style={{ padding: "10px 8px", color: C.gray600, fontSize: 11 }}>{u.team || "—"}</td>
                      <td style={{ padding: "10px 8px" }}>
                        <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                          {(u.modules || ROLE_PRESETS[u.role]?.modules || []).slice(0, 4).map(m => <span key={m} style={{ fontSize: 12 }} title={MODULE_LABELS[m]}>{MODULE_ICONS[m]}</span>)}
                          {(u.modules || ROLE_PRESETS[u.role]?.modules || []).length > 4 && <span style={{ fontSize: 10, color: C.gray400 }}>+{(u.modules || ROLE_PRESETS[u.role]?.modules || []).length - 4}</span>}
                        </div>
                      </td>
                      <td style={{ padding: "10px 8px", color: C.gray600, fontSize: 11 }}>{{ all: "All data", team: "Team only", assigned: "Assigned only" }[u.visibility] || "All data"}</td>
                      <td style={{ padding: "10px 8px", textAlign: "center" }}>{u.active === false ? <span style={{ padding: "2px 8px", borderRadius: 8, background: C.redBg, color: C.red, fontSize: 10, fontWeight: 700 }}>Inactive</span> : <span style={{ padding: "2px 8px", borderRadius: 8, background: C.greenBg, color: C.green, fontSize: 10, fontWeight: 700 }}>Active</span>}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
              {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", color: C.gray400, fontSize: 12 }}>No users found</div>}
            </div>

            {/* Role presets reference */}
            <div style={{ marginTop: 24, padding: "16px 20px", borderRadius: 10, background: C.white, border: `1px solid ${C.gray200}` }}>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: C.navy, margin: "0 0 10px" }}>Role Presets</h4>
              <p style={{ fontSize: 11, color: C.gray400, margin: "0 0 12px" }}>When you set a role, it applies default modules. You can customize per user after.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {Object.entries(ROLE_PRESETS).map(([k, v]) => (
                  <div key={k} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${v.color}30`, background: v.color + "08" }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: v.color, marginBottom: 4 }}>{v.label}</div>
                    <div style={{ fontSize: 10, color: C.gray500 }}>{v.modules.map(m => MODULE_LABELS[m]).join(", ")}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {showInvite && <InviteModal />}
          <EditUserPanel />
        </div>
      );
    }

    // ============================================================
    // MAIN APP SHELL (with dynamic user permissions)
    // ============================================================
    const DEFAULT_CRM_USERS = [
      { id: "u1", name: "Zach Reece", email: "zach@colonyroofers.com", altEmails: ["zachreececpa@gmail.com"], role: "admin", modules: ALL_MODULES, team: "Leadership", markets: ["ATL", "TPA", "DFW"], visibility: "all", active: true },
      { id: "u2", name: "Brayleigh Gardner", email: "brayleigh@colonyroofers.com", role: "coordinator", modules: ROLE_PRESETS.coordinator.modules, team: "Operations", markets: ["ATL", "TPA", "DFW"], visibility: "all", active: true },
      { id: "u3", name: "Lucio Martinez", email: "lucio@colonyroofers.com", role: "superintendent", modules: ROLE_PRESETS.superintendent.modules, team: "Tampa Crew", markets: ["TPA"], visibility: "team", active: true },
      { id: "u4", name: "Derrick Newsome", email: "derrick@colonyroofers.com", role: "superintendent", modules: ROLE_PRESETS.superintendent.modules, team: "Atlanta Crew", markets: ["ATL"], visibility: "team", active: true },
      { id: "u5", name: "Joseph", email: "joseph@colonyroofers.com", role: "estimator", modules: ROLE_PRESETS.estimator.modules, team: "Estimating", markets: ["ATL", "TPA", "DFW"], visibility: "all", active: true },
      { id: "u6", name: "J. Garside", email: "jgarside@colonyroofers.com", role: "estimator", modules: ROLE_PRESETS.estimator.modules, team: "Estimating", markets: ["ATL", "TPA", "DFW"], visibility: "all", active: true },
    ];

    function ProfileSettings({ user, crmUser, crmUsers, setCrmUsers, role }) {
      const allowedModules = role === "admin" ? ALL_MODULES : (crmUser?.modules || ROLE_PRESETS[role]?.modules || ALL_MODULES);
      return (
        <React.Fragment>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, margin: "0 0 8px" }}>My Profile</h1>
          <p style={{ fontSize: 14, color: C.gray500, margin: "0 0 28px" }}>Your account details and CRM permissions</p>
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "24px 28px", background: `linear-gradient(135deg, ${C.navyDark}, ${C.navy})`, color: C.white, display: "flex", alignItems: "center", gap: 16 }}>
              {user.picture ? <img src={user.picture} alt="" style={{ width: 56, height: 56, borderRadius: 16, border: "3px solid rgba(255,255,255,0.3)" }} referrerPolicy="no-referrer" /> : <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }}>{(user.name || "?")[0]}</div>}
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{user.name}</h2>
                <p style={{ fontSize: 13, opacity: 0.7, margin: "2px 0 0" }}>{user.email}</p>
              </div>
            </div>
            <div style={{ padding: "20px 28px" }}>
              {[
                ["Role", ROLE_PRESETS[role]?.label || role],
                ["Team", crmUser?.team || "—"],
                ["Markets", (crmUser?.markets || MARKETS).map(m => MARKET_LABELS[m]).join(", ")],
                ["Visibility", { all: "All data", team: "Team only", assigned: "Assigned only" }[crmUser?.visibility] || "All data"],
                ["Modules", (crmUser?.modules || allowedModules).map(m => MODULE_LABELS[m]).join(", ")],
                ["Member Since", crmUser?.createdAt ? new Date(crmUser.createdAt).toLocaleDateString() : "—"],
              ].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.gray100}` }}>
                  <span style={{ fontSize: 13, color: C.gray500 }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.navy, textAlign: "right", maxWidth: "60%" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, padding: "20px 28px" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 14px" }}>Your Module Access</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {ALL_MODULES.map(m => {
                const hasAccess = (crmUser?.modules || allowedModules).includes(m);
                return (
                  <div key={m} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: hasAccess ? C.greenBg + "40" : C.gray50, border: `1px solid ${hasAccess ? C.green + "40" : C.gray200}` }}>
                    <span style={{ fontSize: 16 }}>{MODULE_ICONS[m]}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: hasAccess ? C.navy : C.gray400 }}>{MODULE_LABELS[m]}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: hasAccess ? C.green : C.gray400 }}>{hasAccess ? "✓" : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </React.Fragment>
      );
    }

    // ============================================================
    // CUSTOMER PORTAL COMPONENT
    // ============================================================


export default UserManagementModule;
