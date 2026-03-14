import React, { useState, useEffect } from 'react';
import { C } from '../utils/constants';
import GoogleLogo from './GoogleLogo';

function LoginScreen({ onSignIn, loading, error }) {
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimIn(true), 100);
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${C.navyDark} 0%, ${C.navy} 50%, ${C.navyLight} 100%)` }}>
      <div style={{ position: "fixed", inset: 0, opacity: 0.03, backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, #fff 35px, #fff 36px)`, pointerEvents: "none" }} />
      <div style={{ width: 420, padding: "48px 40px", borderRadius: 16, background: C.white, boxShadow: "0 25px 60px rgba(0,0,0,0.3)", transform: animIn ? "translateY(0)" : "translateY(20px)", opacity: animIn ? 1 : 0, transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: C.red }} />
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, margin: "0 auto 22px", background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 24px ${C.navy}40` }}>
            <span style={{ color: C.white, fontSize: 30, fontWeight: 800 }}>CR</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.navy, margin: 0 }}>Colony Roofers</h1>
          <p style={{ fontSize: 13, color: C.gray500, margin: "6px 0 0", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>CRM</p>
        </div>
        <p style={{ fontSize: 14, color: C.gray600, marginBottom: 20, textAlign: "center" }}>Sign in with your Colony Roofers Google account.</p>
        {loading ? (
          <div style={{ textAlign: "center", padding: 16, color: C.gray400 }}>Loading...</div>
        ) : (
          <button onClick={onSignIn} style={{ width: "100%", padding: "14px 0", border: `1px solid ${C.gray300}`, borderRadius: 10, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", fontSize: 15, fontWeight: 600, color: C.gray700 }}>
            <GoogleLogo /> Sign in with Google
          </button>
        )}
        {error && <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: C.redBg, fontSize: 12, color: C.red }}>{error}</div>}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.gray100}`, textAlign: "center" }}>
          <p style={{ fontSize: 11, color: C.gray400 }}>Access restricted to authorized Colony Roofers team members.</p>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
