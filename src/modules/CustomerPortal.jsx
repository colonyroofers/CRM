import React, { useState } from 'react';
import { C } from '../utils/constants';

    function CustomerPortal({ token }) {
      const [project, setProject] = useState(null);
      const [loading, setLoading] = useState(true);
      const [activeTab, setActiveTab] = useState("summary");

      useEffect(() => {
        const loadProject = async () => {
          if (!firestoreDb || !token) return;
          try {
            const snap = await firestoreDb.collection("cr_portal_projects").where("portalToken", "==", token).get();
            if (snap.docs.length > 0) {
              setProject(snap.docs[0].data());
            }
            setLoading(false);
          } catch (err) {
            console.error("Portal load error:", err);
            setLoading(false);
          }
        };
        loadProject();
      }, [token]);

      if (loading) return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.gray50 }}>
          <Spinner size={24} color={C.navy} />
        </div>
      );

      if (!project) return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.gray50 }}>
          <div style={{ textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: C.navy, margin: "0 0 8px" }}>Link Expired</h1>
            <p style={{ fontSize: 14, color: C.gray600 }}>This project portal link is no longer valid.</p>
          </div>
        </div>
      );

      return (
        <div style={{ minHeight: "100vh", background: C.gray50 }}>
          <div style={{ background: C.white, borderBottom: "1px solid " + C.gray200, padding: "24px" }}>
            <div style={{ maxWidth: 1000, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: 700 }}>CR</div>
                <div>
                  <h1 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>Colony Roofers Project Portal</h1>
                  <p style={{ fontSize: 12, color: C.gray500, margin: "4px 0 0" }}>{project.projectName || "Project Details"}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, borderBottom: "1px solid " + C.gray200, paddingBottom: 12 }}>
                {["summary", "documents", "timeline"].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "8px 16px", borderRadius: "6px 6px 0 0", border: "none", background: activeTab === tab ? C.white : "transparent", color: activeTab === tab ? C.navy : C.gray500, fontSize: 12, fontWeight: 600, cursor: "pointer", borderBottom: activeTab === tab ? "2px solid " + C.navy : "none" }}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px" }}>
            {activeTab === "summary" && (
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ background: C.white, borderRadius: 10, padding: 20 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 16px" }}>Project Information</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {[
                      { label: "Address", value: project.propertyAddress },
                      { label: "Homeowner", value: project.ownerName },
                      { label: "Phone", value: project.ownerPhone },
                      { label: "Status", value: project.status },
                      { label: "Estimated Start", value: project.startDate ? new Date(project.startDate).toLocaleDateString() : "TBD" },
                      { label: "Project Value", value: formatCurrency(project.contractValue || 0) }
                    ].map((item, i) => (
                      <div key={i}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: C.gray600, textTransform: "uppercase", marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "documents" && (
              <div style={{ background: C.white, borderRadius: 10, padding: 20 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 16px" }}>Project Documents</h2>
                <DocumentList entityType="project" entityId={project.id} />
              </div>
            )}

            {activeTab === "timeline" && (
              <div style={{ background: C.white, borderRadius: 10, padding: 20 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 16px" }}>Project Timeline</h2>
                <ActivityTimeline activities={project.activities || []} documents={project.documents || []} />
              </div>
            )}
          </div>
        </div>
      );
    }


export default CustomerPortal;
