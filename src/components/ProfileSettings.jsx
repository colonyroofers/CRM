import React, { useState } from 'react';
import { C } from '../utils/constants';

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


export default ProfileSettings;
