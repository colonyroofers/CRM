import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  useFirebaseAuth,
  useIsMobile,
  useOnlineStatus,
  useNotificationEngine,
  useFirestoreCollection
} from './hooks';
import {
  C,
  ALL_MODULES,
  MODULE_LABELS,
  MODULE_ICONS,
  ROLE_PRESETS,
  ROLE_COLORS,
  DEFAULT_ROLE_MAP,
  getUserRole,
  canAccess,
  generateId,
  formatCurrency,
  MARKETS,
  MARKET_LABELS
} from './utils/constants';
import { stripDocsForStorage, detectDateFromText, downloadCSV } from './utils/helpers';

// Import all modules
import EstimatingModule from './modules/EstimatingModule';
import ProductionModule from './modules/ProductionModule';
import SalesModule from './modules/SalesModule';
import DispatchModule from './modules/DispatchModule';
import InspectionsModule from './modules/InspectionsModule';
import ServiceModule from './modules/ServiceModule';
import TaskManagerModule from './modules/TaskManagerModule';
import DirectoryModule from './modules/DirectoryModule';
import ProductCatalogModule from './modules/ProductCatalogModule';
import FinanceModule from './modules/FinanceModule';
import ReportsModule from './modules/ReportsModule';
import CalendarModule from './modules/CalendarModule';
import DailyDigestModule from './modules/DailyDigestModule';
import AIAgent from './modules/AIAgent';
import UserManagementModule from './modules/UserManagementModule';
import CustomerPortal from './modules/CustomerPortal';

// Import components
import ProfileSettings from './components/ProfileSettings';
import LoginScreen from './components/LoginScreen';
import EmailCompose from './components/EmailCompose';
import Portal from './components/Portal';
import Spinner from './components/Spinner';

// Default CRM users fallback
const DEFAULT_CRM_USERS = [
  { id: "u1", name: "Zach Reece", email: "zach@colonyroofers.com", altEmails: ["zachreececpa@gmail.com"], role: "admin", modules: ALL_MODULES, team: "Leadership", markets: ["ATL", "TPA", "DFW"], visibility: "all", active: true },
  { id: "u2", name: "Brayleigh Gardner", email: "brayleigh@colonyroofers.com", role: "coordinator", modules: ROLE_PRESETS.coordinator.modules, team: "Operations", markets: ["ATL", "TPA", "DFW"], visibility: "all", active: true },
  { id: "u3", name: "Lucio Martinez", email: "lucio@colonyroofers.com", role: "superintendent", modules: ROLE_PRESETS.superintendent.modules, team: "Tampa Crew", markets: ["TPA"], visibility: "team", active: true },
  { id: "u4", name: "Derrick Newsome", email: "derrick@colonyroofers.com", role: "superintendent", modules: ROLE_PRESETS.superintendent.modules, team: "Atlanta Crew", markets: ["ATL"], visibility: "team", active: true },
  { id: "u5", name: "Joseph", email: "joseph@colonyroofers.com", role: "estimator", modules: ROLE_PRESETS.estimator.modules, team: "Estimating", markets: ["ATL", "TPA", "DFW"], visibility: "all", active: true },
  { id: "u6", name: "J. Garside", email: "jgarside@colonyroofers.com", role: "estimator", modules: ROLE_PRESETS.estimator.modules, team: "Estimating", markets: ["ATL", "TPA", "DFW"], visibility: "all", active: true },
];

function App() {
  // ── PORTAL DETECTION ──────────────────────────────────────
  const portalToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("portal");
  }, []);

  if (portalToken) return <CustomerPortal token={portalToken} />;

  const { user, loading, error, signIn, signOut } = useFirebaseAuth();
  const isOnline = useOnlineStatus();
  const isMobile = useIsMobile();
  const [activeModule, setActiveModule] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [settingsView, setSettingsView] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [showFloatingEmail, setShowFloatingEmail] = useState(false);
  const [floatingEmailCtx, setFloatingEmailCtx] = useState(null); // { contactId, contactEmail, contactName, subject }
  // Expose email context setter globally so any module can set it
  window.__crm_setEmailCtx = setFloatingEmailCtx;
  window.__crm_openEmail = (ctx) => { setFloatingEmailCtx(ctx || null); setShowFloatingEmail(true); };
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handle = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    if (showMenu) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showMenu]);

  // ── SHARED ENTITY STORES ─────────────────────────────────
  const [companiesData, saveCompanies] = useFirestoreCollection("cr_companies", []);
  const companiesRef = useRef(companiesData); companiesRef.current = companiesData;
  const setCompanies = useCallback(u => { const n = typeof u === "function" ? u(companiesRef.current) : u; saveCompanies(n); }, [saveCompanies]);

  const [propertiesData, saveProperties] = useFirestoreCollection("cr_properties", []);
  const propertiesRef = useRef(propertiesData); propertiesRef.current = propertiesData;
  const setProperties = useCallback(u => { const n = typeof u === "function" ? u(propertiesRef.current) : u; saveProperties(n); }, [saveProperties]);

  const [contactsData, saveContacts] = useFirestoreCollection("cr_contacts", []);
  const contactsRef = useRef(contactsData); contactsRef.current = contactsData;
  const setContacts = useCallback(u => { const n = typeof u === "function" ? u(contactsRef.current) : u; saveContacts(n); }, [saveContacts]);

  const [subcontractorsData, saveSubcontractors] = useFirestoreCollection("cr_subcontractors", []);
  const subcontractorsRef = useRef(subcontractorsData); subcontractorsRef.current = subcontractorsData;
  const setSubcontractors = useCallback(u => { const n = typeof u === "function" ? u(subcontractorsRef.current) : u; saveSubcontractors(n); }, [saveSubcontractors]);

  const [salesLeadsData, saveSalesLeads] = useFirestoreCollection("cr_sales_leads", []);
  const salesLeadsRef = useRef(salesLeadsData); salesLeadsRef.current = salesLeadsData;
  const setSalesLeads = useCallback(u => { const n = typeof u === "function" ? u(salesLeadsRef.current) : u; saveSalesLeads(n); }, [saveSalesLeads]);
  const salesLeads = salesLeadsData;

  const [serviceTicketsData, saveServiceTickets] = useFirestoreCollection("cr_service_tickets", []);
  const serviceTicketsRef = useRef(serviceTicketsData); serviceTicketsRef.current = serviceTicketsData;
  const setServiceTickets = useCallback(u => { const n = typeof u === "function" ? u(serviceTicketsRef.current) : u; saveServiceTickets(n); }, [saveServiceTickets]);
  const serviceTickets = serviceTicketsData;

  // ── CRM USERS (dynamic permissions) ──────────────────────
  const [crmUsersData, saveCrmUsers] = useFirestoreCollection("cr_crm_users", DEFAULT_CRM_USERS);
  const crmUsersRef = useRef(crmUsersData); crmUsersRef.current = crmUsersData;
  const setCrmUsers = useCallback(u => { const n = typeof u === "function" ? u(crmUsersRef.current) : u; saveCrmUsers(n); }, [saveCrmUsers]);
  const crmUsers = crmUsersData;

  // ── INSPECTIONS ─────────────────────────────────────────
  const [inspectionsData, saveInspections] = useFirestoreCollection("cr_inspections", []);
  const inspectionsRef = useRef(inspectionsData); inspectionsRef.current = inspectionsData;
  const setInspections = useCallback(u => { const n = typeof u === "function" ? u(inspectionsRef.current) : u; saveInspections(n); }, [saveInspections]);

  // ── MENTIONS / NOTIFICATIONS ──────────────────────────────
  const [mentionsData, saveMentions] = useFirestoreCollection("cr_mentions", []);
  const mentionsRef = useRef(mentionsData); mentionsRef.current = mentionsData;
  const setMentions = useCallback(u => { const n = typeof u === "function" ? u(mentionsRef.current) : u; saveMentions(n); }, [saveMentions]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handle = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false); };
    if (showNotifications) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showNotifications]);

  // Match mentions for current user across all known emails (login email + CRM user email)
  const myEmailSet = useMemo(() => {
    const emails = new Set();
    if (user?.email) emails.add(user.email.toLowerCase());
    // Also include emails from CRM users that match this user by name or email
    (crmUsers || []).forEach(u => {
      if (u.email && (u.email.toLowerCase() === user?.email?.toLowerCase() || u.name === user?.name)) {
        emails.add(u.email.toLowerCase());
      }
    });
    return emails;
  }, [user, crmUsers]);
  const myMentions = mentionsData.filter(m => m.targetEmail && myEmailSet.has(m.targetEmail.toLowerCase()));
  const unreadCount = myMentions.filter(m => !m.read).length;

  const addMention = useCallback((targetEmail, context) => {
    const mention = { id: generateId(), targetEmail, from: user.name, fromEmail: user.email, context, createdAt: new Date().toISOString(), read: false };
    setMentions(prev => [mention, ...prev]);
  }, [user, setMentions]);

  const markMentionRead = useCallback((id) => {
    setMentions(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  }, [setMentions]);

  const markAllRead = useCallback(() => {
    setMentions(prev => prev.map(m => m.targetEmail && myEmailSet.has(m.targetEmail.toLowerCase()) ? { ...m, read: true } : m));
  }, [myEmailSet, setMentions]);

  // Enhanced notification engine
  const engineAlerts = useNotificationEngine(salesLeadsData, serviceTicketsData, inspectionsData, [], user, crmUsers);
  const allNotifications = useMemo(() => {
    const mentionNotifs = myMentions.map(m => ({ id: m.id, type: "mention", title: m.from, message: m.context, severity: "info", createdAt: m.createdAt, read: m.read, source: "mention" }));
    const engineNotifs = engineAlerts.map(a => ({ ...a, read: false, source: "engine" }));
    return [...mentionNotifs, ...engineNotifs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [myMentions, engineAlerts]);
  const totalUnread = allNotifications.filter(n => !n.read).length;

  const sharedEntities = { companies: companiesData, properties: propertiesData, contacts: contactsData, subcontractors: subcontractorsData, setCompanies, setProperties, setContacts, setSubcontractors };
  const companyMap = useMemo(() => { const m = new Map(); companiesData.forEach(c => m.set(c.id, c)); return m; }, [companiesData]);

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${C.navyDark}, ${C.navyLight})` }}><Spinner size={24} color="rgba(255,255,255,0.5)" /></div>;
  if (!user) return <LoginScreen onSignIn={signIn} loading={loading} error={error} />;

  // ── Resolve current user's permissions ───────────────────
  const crmUser = crmUsers.find(u => u.email?.toLowerCase() === user.email?.toLowerCase() || (u.altEmails || []).some(e => e.toLowerCase() === user.email?.toLowerCase()));
  const role = crmUser?.role || getUserRole(user.email);
  const userModules = crmUser?.modules || ROLE_PRESETS[role]?.modules || ALL_MODULES;
  const isAdmin = role === "admin";

  // Admin always has full access; also ensure any new modules added to ALL_MODULES are available
  const allowedModules = isAdmin ? ALL_MODULES : userModules;
  const currentModule = activeModule && allowedModules.includes(activeModule) ? activeModule : allowedModules[0] || "directory";

  // Check if user is active
  if (crmUser && crmUser.active === false) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${C.navyDark}, ${C.navyLight})` }}>
        <div style={{ background: C.white, borderRadius: 16, padding: "40px", textAlign: "center", maxWidth: 420 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: "0 0 8px" }}>Account Deactivated</h2>
          <p style={{ fontSize: 14, color: C.gray500, margin: "0 0 20px" }}>Your access to Colony Roofers CRM has been deactivated. Contact your admin for assistance.</p>
          <button onClick={signOut} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: C.red, color: C.white, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Sign Out</button>
        </div>
      </div>
    );
  }

  const modules = [
    { key: "daily_digest", label: "Daily Digest", icon: "📅" },
    { key: "tasks", label: "Tasks", icon: "✅" },
    { key: "directory", label: "Directory", icon: "📇" },
    { key: "dispatch", label: "Dispatch", icon: "📡" },
    { key: "inspections", label: "Inspections", icon: "🔍" },
    { key: "sales", label: "Project Sales", icon: "💼" },
    { key: "estimating", label: "Estimating", icon: "📐" },
    { key: "production", label: "Production", icon: "🏗️" },
    { key: "service", label: "Service", icon: "🔧" },
    { key: "finance", label: "Finance", icon: "💰" },
    { key: "reports", label: "Reports", icon: "📊" },
    { key: "calendar", label: "Calendar", icon: "📆" },
    { key: "catalog", label: "Catalog", icon: "📦" },
  ].filter(m => allowedModules.includes(m.key));

  const roleColor = ROLE_COLORS[role] || C.gray500;

  return (
    <div style={{ minHeight: "100vh", background: C.gray50, display: "flex" }}>
      {/* Left Sidebar */}
      <div style={{ width: sidebarOpen ? (isMobile ? "100%" : 230) : 0, minWidth: sidebarOpen ? (isMobile ? "280px" : 230) : 0, background: C.navy, transition: "width 0.2s ease, min-width 0.2s ease", overflow: "hidden", display: "flex", flexDirection: "column", height: "100vh", position: isMobile && sidebarOpen ? "fixed" : "sticky", top: 0, zIndex: isMobile && sidebarOpen ? 998 : 0, left: 0 }}>
        {/* Sidebar Header / Logo + Collapse */}
        <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: C.white, flexShrink: 0 }}>CR</div>
          <div style={{ color: C.white, whiteSpace: "nowrap", flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>Colony Roofers</div><div style={{ fontSize: 9, opacity: 0.5, letterSpacing: "0.1em", textTransform: "uppercase" }}>CRM</div></div>
          <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: isMobile ? 16 : 14, cursor: "pointer", padding: "4px 6px", borderRadius: 4, flexShrink: 0 }} title={isMobile ? "Close menu" : "Collapse menu"}>{isMobile ? "✕" : "◀"}</button>
        </div>
        {/* Module Nav Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
          {modules.map(m => (
            <button key={m.key} onClick={() => { setActiveModule(m.key); setSettingsView(null); if (isMobile) setSidebarOpen(false); }} style={{ width: "100%", padding: "10px 14px", border: "none", borderRadius: 8, background: currentModule === m.key && !settingsView ? "rgba(255,255,255,0.12)" : "transparent", color: currentModule === m.key && !settingsView ? C.white : "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", marginBottom: 2, whiteSpace: "nowrap", transition: "background 0.15s" }}
              onMouseEnter={e => { if (currentModule !== m.key || settingsView) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={e => { if (currentModule !== m.key || settingsView) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ fontSize: 16, width: 22, textAlign: "center" }}>{m.icon}</span> {m.label}
              {currentModule === m.key && !settingsView && <div style={{ width: 4, height: 4, borderRadius: 2, background: C.red, marginLeft: "auto" }} />}
            </button>
          ))}
        </div>
        {/* Sidebar Footer */}
        <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.08)" }} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 997, display: "flex" }} />
      )}

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top Bar (thin - hamburger, notifications, profile) */}
        <div style={{ background: C.white, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, borderBottom: `1px solid ${C.gray200}`, position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: `1px solid ${C.gray300}`, borderRadius: 6, padding: "6px 8px", cursor: "pointer", fontSize: 16, color: C.navy, display: "flex", alignItems: "center" }} title="Open menu">☰</button>
            )}
            <span style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{settingsView === "profile" ? "My Profile" : settingsView === "users" ? "User Management" : settingsView === "integrations" ? "Integrations" : modules.find(m => m.key === currentModule)?.label || ""}</span>
          </div>
          {/* Notifications + Profile */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!isOnline && <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700, background: "#FEF3C7", color: "#D97706" }}>⚡ Offline</span>}
            <div ref={notifRef} style={{ position: "relative" }}>
              <button onClick={() => setShowNotifications(!showNotifications)} style={{ position: "relative", background: showNotifications ? C.gray100 : "transparent", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: C.navy, fontSize: 18, display: "flex", alignItems: "center" }} title="Notifications">
                🔔
                {totalUnread > 0 && <span style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: 8, background: C.red, color: C.white, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{totalUnread > 9 ? "9+" : totalUnread}</span>}
              </button>
              {showNotifications && (
                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, width: 360, maxHeight: 480, background: C.white, borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)", overflow: "hidden", zIndex: 9999 }}>
                  <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.gray200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>Notifications</span>
                    {totalUnread > 0 && <button onClick={markAllRead} style={{ fontSize: 11, color: C.blue, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Mark all read</button>}
                  </div>
                  <div style={{ maxHeight: 400, overflowY: "auto" }}>
                    {allNotifications.length === 0 ? (
                      <div style={{ padding: 32, textAlign: "center", color: C.gray400, fontSize: 13 }}>No notifications yet</div>
                    ) : allNotifications.slice(0, 20).map(n => {
                      const severityColor = n.severity === "critical" ? C.red : n.severity === "warning" ? C.yellow : C.blue;
                      const iconMap = { bid_due: "🔔", stale_lead: "⚠️", follow_up: "📋", emergency: "🚨", inspection: "🔍", mention: "💬" };
                      const icon = iconMap[n.type] || "📌";
                      return (
                        <div key={n.id} onClick={() => { if (n.source === "mention") markMentionRead(n.id); }} style={{ padding: "10px 16px", borderBottom: `1px solid ${C.gray100}`, borderLeft: `3px solid ${severityColor}`, background: n.read ? C.white : "#EFF6FF", cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => { if (n.read) e.currentTarget.style.background = C.gray50; }} onMouseLeave={e => e.currentTarget.style.background = n.read ? C.white : "#EFF6FF"}>
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span style={{ fontSize: 14, marginTop: 1 }}>{icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{n.title}</div>
                              <div style={{ fontSize: 11, color: C.gray600, lineHeight: 1.3 }}>{n.message}</div>
                              <div style={{ fontSize: 9, color: C.gray400, marginTop: 3 }}>{new Date(n.createdAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                          {!n.read && <div style={{ width: 6, height: 6, borderRadius: 3, background: C.blue, position: "absolute", right: 16, marginTop: -18 }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: "uppercase", background: roleColor + "30", color: roleColor, letterSpacing: "0.05em" }}>{ROLE_PRESETS[role]?.label || role}</span>
            <div ref={menuRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <div onClick={() => setShowMenu(!showMenu)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 8px", borderRadius: 8, background: showMenu ? C.gray100 : "transparent", transition: "background 0.15s" }}>
                {user.picture ? <img src={user.picture} alt="" style={{ width: 30, height: 30, borderRadius: 8, border: `2px solid ${C.gray200}` }} referrerPolicy="no-referrer" /> : <div style={{ width: 30, height: 30, borderRadius: 8, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: C.white, fontWeight: 700 }}>{(user.name || "?")[0]}</div>}
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{user.name}</div>
                  <div style={{ fontSize: 10, color: C.gray400 }}>{crmUser?.team || "—"}</div>
                </div>
                <span style={{ color: C.gray400, fontSize: 8, marginLeft: 2 }}>▼</span>
              </div>
              {showMenu && (
                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, width: 220, background: C.white, borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)", overflow: "hidden", zIndex: 9999 }}>
                  <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.gray200}`, background: C.gray50 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: C.gray400 }}>{user.email}</div>
                  </div>
                  <div style={{ padding: "6px" }}>
                    <button onClick={() => { setSettingsView("profile"); setShowMenu(false); }} style={{ width: "100%", padding: "10px 12px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderRadius: 8, fontSize: 13, color: C.navy, fontWeight: 500, textAlign: "left" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ fontSize: 16 }}>👤</span> My Profile
                    </button>
                    {isAdmin && (
                      <button onClick={() => { setSettingsView("users"); setShowMenu(false); }} style={{ width: "100%", padding: "10px 12px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderRadius: 8, fontSize: 13, color: C.navy, fontWeight: 500, textAlign: "left" }}
                        onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <span style={{ fontSize: 16 }}>👥</span> User Management
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => { setSettingsView("integrations"); setShowMenu(false); }} style={{ width: "100%", padding: "10px 12px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderRadius: 8, fontSize: 13, color: C.navy, fontWeight: 500, textAlign: "left" }}
                        onMouseEnter={e => e.currentTarget.style.background = C.gray50} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <span style={{ fontSize: 16 }}>🔗</span> Integrations
                      </button>
                    )}
                    <div style={{ height: 1, background: C.gray200, margin: "4px 0" }} />
                    <button onClick={() => { setShowMenu(false); signOut(); }} style={{ width: "100%", padding: "10px 12px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderRadius: 8, fontSize: 13, color: C.red, fontWeight: 500, textAlign: "left" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.redBg} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ fontSize: 16 }}>🚪</span> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Module Content */}
        <div style={{ flex: 1, minHeight: 0 }}>
          {settingsView === "profile" && (
            <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px" }}>
              <button onClick={() => setSettingsView(null)} style={{ background: C.gray100, border: "none", cursor: "pointer", color: C.navy, padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>← Back to CRM</button>
              <ProfileSettings user={user} crmUser={crmUser} crmUsers={crmUsers} setCrmUsers={setCrmUsers} role={role} />
            </div>
          )}
          {settingsView === "users" && isAdmin && (
            <UserManagementModule user={user} role={role} crmUsers={crmUsers} setCrmUsers={setCrmUsers} />
          )}
          {settingsView === "integrations" && isAdmin && (
            <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px" }}>
              <button onClick={() => setSettingsView(null)} style={{ background: C.gray100, border: "none", cursor: "pointer", color: C.navy, padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>← Back to CRM</button>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: "0 0 4px" }}>Integrations</h2>
              <p style={{ fontSize: 13, color: C.gray500, margin: "0 0 24px" }}>Connect Colony Roofers CRM with external systems for bi-directional data sync.</p>
              {/* Acculynx */}
              <div style={{ padding: "20px 24px", borderRadius: 12, border: `2px solid ${C.navy}20`, background: C.white, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1E3A5F", display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 18, fontWeight: 800 }}>AX</div>
                    <div><div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>AccuLynx</div><div style={{ fontSize: 11, color: C.gray500 }}>Roofing project management & production</div></div>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#FEF3C7", color: "#D97706" }}>Coming Soon</span>
                </div>
                <div style={{ fontSize: 12, color: C.gray600, lineHeight: 1.6, marginBottom: 12 }}>
                  Two-way sync between Colony CRM and AccuLynx. When connected, the following data will sync automatically:
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ padding: "10px 12px", borderRadius: 8, background: C.gray50 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", marginBottom: 4 }}>CRM → AccuLynx</div>
                    <div style={{ fontSize: 11, color: C.gray600 }}>Contacts, Companies, Properties, Awarded Jobs, Estimates, Documents</div>
                  </div>
                  <div style={{ padding: "10px 12px", borderRadius: 8, background: C.gray50 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", marginBottom: 4 }}>AccuLynx → CRM</div>
                    <div style={{ fontSize: 11, color: C.gray600 }}>Production Status, Work Orders, Material Orders, Change Orders, Completion Data</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: 11, color: "#1E40AF" }}>
                  <strong>Integration Ready:</strong> All CRM objects include external ID fields (externalId, acculynxId) for mapping. Data models support bi-directional sync with conflict resolution timestamps.
                </div>
              </div>
              {/* Distribution Supply Integrations */}
              <div style={{ padding: "20px 24px", borderRadius: 12, border: `2px solid #F59E0B20`, background: C.white, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 16, fontWeight: 800 }}>📦</div>
                    <div><div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>Distribution Supply APIs</div><div style={{ fontSize: 11, color: C.gray500 }}>SRS Distribution · ABC Supply · QXO</div></div>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#FEF3C7", color: "#D97706" }}>Coming Soon</span>
                </div>
                <div style={{ fontSize: 12, color: C.gray600, lineHeight: 1.6, marginBottom: 12 }}>Auto-sync product pricing, availability, and ordering directly from your distribution partners into the product catalog.</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[{ name: "SRS Distribution", code: "SRS" }, { name: "ABC Supply", code: "ABC" }, { name: "QXO", code: "QXO" }].map(d => (
                    <div key={d.code} style={{ padding: "10px 12px", borderRadius: 8, background: C.gray50, textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>{d.code}</div>
                      <div style={{ fontSize: 10, color: C.gray500, marginTop: 2 }}>{d.name}</div>
                      <div style={{ fontSize: 9, color: "#D97706", fontWeight: 600, marginTop: 4 }}>Pending API Access</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sage Intacct */}
              <div style={{ padding: "20px 24px", borderRadius: 12, border: `2px solid #6366F120`, background: C.white, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#6366F1", display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 16, fontWeight: 800 }}>SI</div>
                    <div><div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>Sage Intacct</div><div style={{ fontSize: 11, color: C.gray500 }}>Accounting & financial management</div></div>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#FEF3C7", color: "#D97706" }}>Coming Soon</span>
                </div>
                <div style={{ fontSize: 12, color: C.gray600, lineHeight: 1.6, marginBottom: 12 }}>Bi-directional sync with Sage Intacct for invoicing, GL entries, AP/AR, and financial reporting.</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ padding: "10px 12px", borderRadius: 8, background: C.gray50 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", marginBottom: 4 }}>CRM → Sage</div>
                    <div style={{ fontSize: 11, color: C.gray600 }}>Invoices, Schedule of Values, Customer Records, Project Budgets</div>
                  </div>
                  <div style={{ padding: "10px 12px", borderRadius: 8, background: C.gray50 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", marginBottom: 4 }}>Sage → CRM</div>
                    <div style={{ fontSize: 11, color: C.gray600 }}>Payment Status, GL Balances, AR Aging, Financial Reports</div>
                  </div>
                </div>
              </div>

              {/* Claude Co-Work */}
              <div style={{ padding: "20px 24px", borderRadius: 12, border: `2px solid ${C.green}30`, background: C.white, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#D97706", display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 16 }}>🤖</div>
                    <div><div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>Claude Co-Work</div><div style={{ fontSize: 11, color: C.gray500 }}>AI assistant for reports, updates & automation</div></div>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: C.greenBg, color: C.green }}>Active</span>
                </div>
                <div style={{ fontSize: 12, color: C.gray600 }}>Connected via Firestore API. Claude can read/write CRM data, generate reports, and perform automated tasks.</div>
              </div>
            </div>
          )}
          {!settingsView && currentModule === "daily_digest" && <DailyDigestModule user={user} role={role} entities={sharedEntities} salesLeads={salesLeads} serviceTickets={serviceTickets} inspections={inspectionsData} crmUsers={crmUsers} />}
          {!settingsView && currentModule === "tasks" && <TaskManagerModule user={user} role={role} entities={sharedEntities} salesLeads={salesLeads} serviceTickets={serviceTickets} inspections={inspectionsData} crmUsers={crmUsers} />}
          {!settingsView && currentModule === "estimating" && <EstimatingModule user={user} role={role} entities={sharedEntities} salesLeads={salesLeads} setSalesLeads={setSalesLeads} crmUsers={crmUsers} />}
          {!settingsView && currentModule === "production" && <ProductionModule user={user} role={role} />}
          {!settingsView && currentModule === "sales" && <SalesModule user={user} role={role} entities={sharedEntities} crmUsers={crmUsers} onMention={addMention} inspections={inspectionsData} setInspections={setInspections} />}
          {!settingsView && currentModule === "dispatch" && <DispatchModule user={user} role={role} entities={sharedEntities} inspections={inspectionsData} setInspections={setInspections} salesLeads={salesLeads} serviceTickets={serviceTickets} setSalesLeads={setSalesLeads} crmUsers={crmUsers} />}
          {!settingsView && currentModule === "inspections" && <InspectionsModule user={user} role={role} inspections={inspectionsData} setInspections={setInspections} entities={sharedEntities} crmUsers={crmUsers} salesLeads={salesLeads} serviceTickets={serviceTickets} />}
          {!settingsView && currentModule === "service" && <ServiceModule user={user} role={role} entities={sharedEntities} crmUsers={crmUsers} onMention={addMention} inspections={inspectionsData} setInspections={setInspections} />}
          {!settingsView && currentModule === "directory" && <DirectoryModule user={user} role={role} entities={sharedEntities} salesLeads={salesLeads} serviceTickets={serviceTickets} setSalesLeads={setSalesLeads} setServiceTickets={setServiceTickets} crmUsers={crmUsers} />}
          {!settingsView && currentModule === "finance" && <FinanceModule user={user} role={role} />}
          {!settingsView && currentModule === "reports" && <ReportsModule user={user} role={role} entities={sharedEntities} salesLeads={salesLeads} serviceTickets={serviceTickets} />}
          {!settingsView && currentModule === "calendar" && <CalendarModule user={user} role={role} entities={sharedEntities} salesLeads={salesLeads} serviceTickets={serviceTickets} inspections={inspectionsData} />}
          {!settingsView && currentModule === "catalog" && <ProductCatalogModule user={user} role={role} crmUsers={crmUsers} />}
        </div>

        <AIAgent user={user} role={role} entities={sharedEntities} salesLeads={salesLeads} serviceTickets={serviceTickets} setSalesLeads={setSalesLeads} setServiceTickets={setServiceTickets} currentModule={currentModule} />
      </div>

      {/* Floating Email Button */}
      <button onClick={() => setShowFloatingEmail(true)} style={{ position: "fixed", bottom: 92, right: 24, width: 56, height: 56, borderRadius: "50%", border: "none", background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, color: C.white, fontSize: 24, cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,0.25)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.15s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} title="Compose Email">✉️</button>

      {/* Floating Email Compose Modal */}
      {showFloatingEmail && <div style={{ position: "fixed", inset: 0, zIndex: 2500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,29,53,0.6)" }} onClick={() => { setShowFloatingEmail(false); setFloatingEmailCtx(null); }}>
        <div style={{ width: 520 }} onClick={e => e.stopPropagation()}>
          <EmailCompose
            to={floatingEmailCtx?.contactEmail || ""}
            defaultSubject={floatingEmailCtx?.subject || ""}
            defaultBody={`\n\nZach Reece, Owner\nColony Roofers\n404-806-0956`}
            contacts={contactsData}
            defaultContactId={floatingEmailCtx?.contactId || ""}
            onCancel={() => { setShowFloatingEmail(false); setFloatingEmailCtx(null); }}
            onSent={() => { setShowFloatingEmail(false); setFloatingEmailCtx(null); }}
          />
        </div>
      </div>}
    </div>
  );
}

export default App;
