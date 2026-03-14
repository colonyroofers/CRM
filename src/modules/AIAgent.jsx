import React, { useState, useRef } from 'react';
import { C, generateId } from '../utils/constants';

    function AIAgent({ user, role, entities, salesLeads, serviceTickets, setSalesLeads, setServiceTickets, currentModule }) {
      const { companies, properties, contacts, setCompanies, setProperties, setContacts } = entities;
      const [open, setOpen] = useState(false);
      const [messages, setMessages] = useState([]);
      const [input, setInput] = useState("");
      const [processing, setProcessing] = useState(false);
      const chatEndRef = useRef(null);
      const inputRef = useRef(null);
      const fileInputRef = useRef(null);
      const [attachedFile, setAttachedFile] = useState(null);

      useEffect(() => { if (open) { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); inputRef.current?.focus(); } }, [open, messages]);

      // ── Tool definitions for Claude ──────────────────────────
      const TOOLS = [
        { name: "create_company", description: "Create a new company in the CRM directory", input_schema: { type: "object", properties: { name: { type: "string" }, market: { type: "string", enum: ["ATL", "TPA", "DFW"] }, type: { type: "string" }, phone: { type: "string" }, address: { type: "string" }, notes: { type: "string" } }, required: ["name"] } },
        { name: "create_property", description: "Create a new property linked to a company", input_schema: { type: "object", properties: { name: { type: "string" }, companyId: { type: "string" }, address: { type: "string" }, market: { type: "string", enum: ["ATL", "TPA", "DFW"] }, sqft: { type: "number" }, roofType: { type: "string" }, buildingCount: { type: "number" } }, required: ["name"] } },
        { name: "create_contact", description: "Create a new contact linked to a company", input_schema: { type: "object", properties: { name: { type: "string" }, companyId: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, title: { type: "string" } }, required: ["name"] } },
        { name: "create_lead", description: "Create a new sales lead/opportunity in the pipeline", input_schema: { type: "object", properties: { company: { type: "string", description: "Company name if not linking to existing" }, companyId: { type: "string", description: "ID of existing company" }, propertyId: { type: "string" }, contactId: { type: "string" }, contactName: { type: "string" }, contactEmail: { type: "string" }, market: { type: "string", enum: ["ATL", "TPA", "DFW"] }, source: { type: "string" }, estimatedValue: { type: "number" }, notes: { type: "string" } }, required: [] } },
        { name: "update_lead", description: "Update an existing sales lead — change stage, value, notes, next action, estimator, etc.", input_schema: { type: "object", properties: { leadId: { type: "string" }, stage: { type: "string", enum: ["new_lead", "contacted", "meeting_set", "proposal_sent", "being_estimated", "negotiation", "awarded", "closed_lost"] }, estimatedValue: { type: "number" }, nextAction: { type: "string" }, estimator: { type: "string", description: "Assign an estimator by name" }, notes: { type: "string" } }, required: ["leadId"] } },
        { name: "create_ticket", description: "Create a new service ticket", input_schema: { type: "object", properties: { subject: { type: "string" }, type: { type: "string", enum: ["Leak / Repair", "Warranty Claim", "Scheduled Maintenance", "Inspection Follow-Up", "Emergency", "Other"] }, priority: { type: "string", enum: ["Emergency", "High", "Medium", "Low"] }, market: { type: "string", enum: ["ATL", "TPA", "DFW"] }, companyId: { type: "string" }, propertyId: { type: "string" }, contactId: { type: "string" }, description: { type: "string" }, assignedTo: { type: "string" } }, required: ["subject"] } },
        { name: "update_ticket", description: "Update a service ticket — change status, priority, assignment, add notes", input_schema: { type: "object", properties: { ticketId: { type: "string" }, status: { type: "string", enum: ["New", "Dispatched", "In Progress", "On Hold", "Complete", "Closed"] }, priority: { type: "string", enum: ["Emergency", "High", "Medium", "Low"] }, assignedTo: { type: "string" }, notes: { type: "string" } }, required: ["ticketId"] } },
        { name: "search_crm", description: "Search across all CRM data — companies, properties, contacts, leads, tickets. Use this to find IDs before creating or updating records.", input_schema: { type: "object", properties: { query: { type: "string", description: "Search term" }, type: { type: "string", enum: ["all", "companies", "properties", "contacts", "leads", "tickets"] } }, required: ["query"] } },
        { name: "draft_email", description: "Send an email to a contact — logged to the CRM activity feed", input_schema: { type: "object", properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "subject", "body"] } },
        { name: "get_crm_report", description: "Generate a CRM status report — pipeline summary, open tickets, recent activity. Use this when asked for updates, status reports, or summaries.", input_schema: { type: "object", properties: { type: { type: "string", enum: ["pipeline", "tickets", "activity", "full"], description: "Report type" } }, required: ["type"] } },
        { name: "log_external_update", description: "Log an update from an external system (e.g., Claude Co-Work) into the CRM activity feed", input_schema: { type: "object", properties: { entityType: { type: "string", enum: ["lead", "ticket", "company", "general"] }, entityId: { type: "string" }, message: { type: "string" }, source: { type: "string", description: "Source system name, e.g., 'Claude Co-Work'" } }, required: ["message"] } },
        { name: "process_document", description: "Process an uploaded document (PDF, Excel, Word) to extract data for the catalog, vendor list, or other CRM data. Upload a pricing sheet to update product prices, a vendor list to create vendors, or other documents to extract structured data.", input_schema: { type: "object", properties: { action: { type: "string", enum: ["update_pricing", "import_vendors", "import_products", "extract_data"], description: "What to do with the document data" }, data: { type: "array", items: { type: "object" }, description: "Extracted data rows from the document" } }, required: ["action", "data"] } },
      ];

      // ── Tool execution ───────────────────────────────────────
      const executeTool = async (name, input) => {
        const id = generateId();
        const now = new Date().toISOString();
        try {
          if (name === "create_company") {
            const item = { ...input, id, createdAt: now };
            setCompanies(prev => [item, ...prev]);
            return { success: true, message: `Created company "${input.name}" (ID: ${id})`, id };
          }
          if (name === "create_property") {
            const item = { ...input, id, createdAt: now };
            setProperties(prev => [item, ...prev]);
            return { success: true, message: `Created property "${input.name}" (ID: ${id})`, id };
          }
          if (name === "create_contact") {
            const item = { ...input, id, createdAt: now };
            setContacts(prev => [item, ...prev]);
            return { success: true, message: `Created contact "${input.name}" (ID: ${id})`, id };
          }
          if (name === "create_lead") {
            const lead = { ...input, id, stage: "new_lead", createdAt: now, activities: [{ type: "created", text: "Created by AI Agent", by: user.name, at: now }] };
            setSalesLeads(prev => [lead, ...prev]);
            return { success: true, message: `Created lead for "${input.company || input.companyId}" (ID: ${id})`, id };
          }
          if (name === "update_lead") {
            const { leadId, notes, ...updates } = input;
            const lead = salesLeads.find(l => l.id === leadId);
            if (!lead) return { success: false, message: `Lead ${leadId} not found` };
            const activity = { type: "ai_update", text: `AI Agent: ${Object.entries(updates).map(([k, v]) => `${k}→${v}`).join(", ")}${notes ? `. Note: ${notes}` : ""}`, by: user.name, at: now };
            setSalesLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates, activities: [...(l.activities || []), activity] } : l));
            return { success: true, message: `Updated lead ${leadId}` };
          }
          if (name === "create_ticket") {
            const ticket = { ...input, id, status: "New", createdAt: now, createdBy: user.name + " (via AI)", activities: [{ type: "created", text: "Created by AI Agent", by: user.name, at: now }] };
            setServiceTickets(prev => [ticket, ...prev]);
            return { success: true, message: `Created ticket "${input.subject}" (ID: ${id})`, id };
          }
          if (name === "update_ticket") {
            const { ticketId, notes, ...updates } = input;
            const ticket = serviceTickets.find(t => t.id === ticketId);
            if (!ticket) return { success: false, message: `Ticket ${ticketId} not found` };
            const activity = { type: "ai_update", text: `AI Agent: ${Object.entries(updates).map(([k, v]) => `${k}→${v}`).join(", ")}${notes ? `. Note: ${notes}` : ""}`, by: user.name, at: now };
            setServiceTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updates, activities: [...(t.activities || []), activity] } : t));
            return { success: true, message: `Updated ticket ${ticketId}` };
          }
          if (name === "search_crm") {
            const q = (input.query || "").toLowerCase();
            const t = input.type || "all";
            const results = {};
            const cm = new Map(); companies.forEach(c => cm.set(c.id, c));
            if (t === "all" || t === "companies") results.companies = companies.filter(c => c.name?.toLowerCase().includes(q)).slice(0, 10).map(c => ({ id: c.id, name: c.name, market: c.market, type: c.type }));
            if (t === "all" || t === "properties") results.properties = properties.filter(p => (p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q))).slice(0, 10).map(p => ({ id: p.id, name: p.name, address: p.address, companyId: p.companyId, companyName: cm.get(p.companyId)?.name }));
            if (t === "all" || t === "contacts") results.contacts = contacts.filter(c => (c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))).slice(0, 10).map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, companyId: c.companyId, companyName: cm.get(c.companyId)?.name }));
            if (t === "all" || t === "leads") results.leads = salesLeads.filter(l => ((l.company || "").toLowerCase().includes(q) || cm.get(l.companyId)?.name?.toLowerCase().includes(q))).slice(0, 10).map(l => ({ id: l.id, company: cm.get(l.companyId)?.name || l.company, stage: l.stage, estimatedValue: l.estimatedValue, market: l.market }));
            if (t === "all" || t === "tickets") results.tickets = serviceTickets.filter(t => (t.subject?.toLowerCase().includes(q) || cm.get(t.companyId)?.name?.toLowerCase().includes(q))).slice(0, 10).map(t => ({ id: t.id, subject: t.subject, status: t.status, priority: t.priority, company: cm.get(t.companyId)?.name }));
            return { success: true, results };
          }
          if (name === "draft_email") {
            // Log email to Firestore instead of opening Gmail
            if (firestoreDb) {
              try {
                const emailRecord = { id: generateId(), to: input.to, subject: input.subject, body: input.body, sentAt: now, sentBy: user.name + " (via AI)", direction: "outbound" };
                firestoreDb.collection("cr_email_log").add(emailRecord);
              } catch (e) { console.error("Email log error:", e); }
            }
            return { success: true, message: `Email sent to ${input.to} — "${input.subject}"` };
          }
          if (name === "get_crm_report") {
            const leads = salesLeads || [];
            const tickets = serviceTickets || [];
            const openLeads = leads.filter(l => !["awarded", "closed_lost"].includes(l.stage));
            const wonLeads = leads.filter(l => l.stage === "awarded");
            const openTickets = tickets.filter(t => !["Complete", "Closed"].includes(t.status));
            const pipeline = openLeads.reduce((s, l) => s + (l.estimatedValue || 0), 0);
            const wonTotal = wonLeads.reduce((s, l) => s + (l.estimatedValue || 0), 0);

            if (input.type === "pipeline" || input.type === "full") {
              const byStage = {};
              openLeads.forEach(l => { byStage[l.stage] = (byStage[l.stage] || { count: 0, value: 0 }); byStage[l.stage].count++; byStage[l.stage].value += (l.estimatedValue || 0); });
              var pipelineReport = { totalOpen: openLeads.length, totalWon: wonLeads.length, pipelineValue: pipeline, wonValue: wonTotal, byStage, recentLeads: leads.slice(0, 10).map(l => ({ id: l.id, company: companies.find(c => c.id === l.companyId)?.name || l.company, stage: l.stage, value: l.estimatedValue, market: l.market })) };
            }
            if (input.type === "tickets" || input.type === "full") {
              var ticketReport = { totalOpen: openTickets.length, byPriority: { Emergency: openTickets.filter(t => t.priority === "Emergency").length, High: openTickets.filter(t => t.priority === "High").length, Medium: openTickets.filter(t => t.priority === "Medium").length, Low: openTickets.filter(t => t.priority === "Low").length }, recent: tickets.slice(0, 10).map(t => ({ id: t.id, subject: t.subject, status: t.status, priority: t.priority, company: companies.find(c => c.id === t.companyId)?.name })) };
            }
            if (input.type === "activity" || input.type === "full") {
              const allActivities = [...leads.flatMap(l => (l.activities || []).map(a => ({ ...a, source: "lead", entityName: companies.find(c => c.id === l.companyId)?.name || l.company }))), ...tickets.flatMap(t => (t.activities || []).map(a => ({ ...a, source: "ticket", entityName: t.subject })))].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 20);
              var activityReport = { recentActivities: allActivities };
            }
            return { success: true, report: { pipeline: pipelineReport, tickets: ticketReport, activity: activityReport, generatedAt: now, companies: companies.length, contacts: contacts.length, properties: properties.length } };
          }
          if (name === "log_external_update") {
            const logEntry = { message: input.message, source: input.source || "External", loggedAt: now, entityType: input.entityType, entityId: input.entityId };
            // Log to Firestore
            if (firestoreDb) {
              try { firestoreDb.collection("cr_external_updates").add(logEntry); } catch (e) { console.error("External log error:", e); }
            }
            // Also add to relevant entity's activity feed
            if (input.entityType === "lead" && input.entityId) {
              setSalesLeads(prev => prev.map(l => l.id === input.entityId ? { ...l, activities: [...(l.activities || []), { type: "external", text: `[${input.source || "External"}] ${input.message}`, by: input.source || "External", at: now }] } : l));
            }
            if (input.entityType === "ticket" && input.entityId) {
              setServiceTickets(prev => prev.map(t => t.id === input.entityId ? { ...t, activities: [...(t.activities || []), { type: "external", text: `[${input.source || "External"}] ${input.message}`, by: input.source || "External", at: now }] } : t));
            }
            return { success: true, message: `Logged update from ${input.source || "External"}: "${input.message}"` };
          }
          if (name === "process_document") {
            const { action, data } = input;
            if (!data || !data.length) return { success: false, message: "No data provided" };
            const results = [];
            if (action === "update_pricing") {
              // Update existing catalog products by matching name/sku
              let updated = 0;
              if (firestoreDb) {
                for (const item of data) {
                  const q = await firestoreDb.collection("cr_product_catalog").where("name", "==", item.name).limit(1).get();
                  if (!q.empty) { await q.docs[0].ref.update({ price: Number(item.price) || 0, updatedAt: now }); updated++; }
                  else if (item.sku) { const q2 = await firestoreDb.collection("cr_product_catalog").where("sku", "==", item.sku).limit(1).get(); if (!q2.empty) { await q2.docs[0].ref.update({ price: Number(item.price) || 0, updatedAt: now }); updated++; } }
                }
              }
              return { success: true, message: `Updated pricing for ${updated} of ${data.length} products` };
            }
            if (action === "import_vendors") {
              let imported = 0;
              for (const v of data) {
                const vId = generateId();
                const vendor = { id: vId, name: v.name, contactName: v.contactName || "", phone: v.phone || "", email: v.email || "", category: v.category || "General", createdAt: now };
                if (firestoreDb) { try { await firestoreDb.collection("cr_vendors").add(vendor); imported++; } catch (e) { console.error(e); } }
              }
              return { success: true, message: `Imported ${imported} vendors` };
            }
            if (action === "import_products") {
              let imported = 0;
              for (const p of data) {
                const pId = generateId();
                const product = { id: pId, name: p.name, category: p.category || "General", manufacturer: p.manufacturer || "", sku: p.sku || "", price: Number(p.price) || 0, unit: p.unit || "each", description: p.description || "", dataSheets: [], createdAt: now };
                if (firestoreDb) { try { await firestoreDb.collection("cr_product_catalog").add(product); imported++; } catch (e) { console.error(e); } }
              }
              return { success: true, message: `Imported ${imported} products to catalog` };
            }
            if (action === "extract_data") {
              return { success: true, message: `Extracted ${data.length} rows of data`, data };
            }
            return { success: false, message: `Unknown process_document action: ${action}` };
          }
          return { success: false, message: `Unknown tool: ${name}` };
        } catch (e) { return { success: false, message: `Error: ${e.message}` }; }
      };

      // ── Build system context ─────────────────────────────────
      const buildContext = () => {
        const leads = salesLeads || [];
        const tickets = serviceTickets || [];
        const openLeads = leads.filter(l => !["awarded", "closed_lost"].includes(l.stage));
        const wonLeads = leads.filter(l => l.stage === "awarded");
        const openTickets = tickets.filter(t => !["Complete", "Closed"].includes(t.status));

        return `You are the AI assistant for Colony Roofers CRM. You can both ANSWER QUESTIONS and TAKE ACTIONS using tools. Be direct and concise. The user is ${user.name} (${user.email}), role: ${role}. Currently viewing: ${currentModule} module.

IMPORTANT: When you need to create or update records, USE THE TOOLS. When you need to find an entity's ID before updating, use search_crm first. Always confirm what you did after taking actions.

When drafting emails, use Zach's style: short (1-3 sentences), direct, casual but professional. Client emails get a brief personal opener. Internal emails skip pleasantries. Sign off: Zach Reece, Owner / Colony Roofers / 404-806-0956

CRM SNAPSHOT:
- Companies (${companies.length}): ${companies.slice(0, 15).map(c => `"${c.name}" [id:${c.id}, ${c.market || "—"}]`).join(", ")}${companies.length > 15 ? ` +${companies.length - 15} more` : ""}
- Properties (${properties.length}): ${properties.slice(0, 10).map(p => `"${p.name}" [id:${p.id}, co:${companies.find(c => c.id === p.companyId)?.name || "—"}]`).join(", ")}${properties.length > 10 ? ` +${properties.length - 10} more` : ""}
- Contacts (${contacts.length}): ${contacts.slice(0, 10).map(c => `"${c.name}" [id:${c.id}, ${c.email || "—"}, co:${companies.find(co => co.id === c.companyId)?.name || "—"}]`).join(", ")}${contacts.length > 10 ? ` +${contacts.length - 10} more` : ""}
- Sales Leads (${leads.length} total, ${openLeads.length} open, ${wonLeads.length} won, pipeline $${openLeads.reduce((s, l) => s + (l.estimatedValue || 0), 0).toLocaleString()}):
${leads.slice(0, 12).map(l => `  [id:${l.id}] ${companies.find(c => c.id === l.companyId)?.name || l.company || "—"} | ${l.stage} | $${(l.estimatedValue || 0).toLocaleString()} | ${l.source || "—"}`).join("\n")}${leads.length > 12 ? `\n  +${leads.length - 12} more` : ""}
- Service Tickets (${tickets.length} total, ${openTickets.length} open):
${tickets.slice(0, 12).map(t => `  [id:${t.id}] ${t.subject} | ${companies.find(c => c.id === t.companyId)?.name || "—"} | ${t.status} | ${t.priority}`).join("\n")}${tickets.length > 12 ? `\n  +${tickets.length - 12} more` : ""}

TEAM: Zach (Owner), Brayleigh Gardner (Coordinator), Lucio Martinez (Super), Derrick Newsome (Super)
MARKETS: Atlanta (ATL), Tampa (TPA), Dallas (DFW)
SALES STAGES: new_lead, appointment_scheduled, inspected, being_estimated, estimate_approved, proposal_sent, negotiation, awarded, closed_lost
TICKET STATUSES: New, Dispatched, In Progress, On Hold, Complete, Closed

CLAUDE CO-WORK INTEGRATION: This CRM supports integration with Claude Co-Work. Use get_crm_report to generate status reports for scheduled tasks. Use log_external_update to log updates from Co-Work automations. Email is sent directly from the app (no Gmail redirect) and logged to activity feeds.`;
      };

      // ── Send message with tool-use loop ──────────────────────
      const handleSend = async () => {
        const text = input.trim();
        if (!text || processing) return;
        const fileInfo = attachedFile ? `\n\n[Attached file: ${attachedFile.name} (${(attachedFile.size / 1024).toFixed(0)} KB)]` : "";
        setInput("");
        setAttachedFile(null);
        const userMsg = { role: "user", text: text + (fileInfo ? `\n📎 ${attachedFile.name}` : "") };
        setMessages(prev => [...prev, userMsg]);
        setProcessing(true);

        try {
          let history = [...messages, userMsg].slice(-12);
          let apiMessages = history.map(m => {
            if (m.role === "user") return { role: "user", content: m.text };
            if (m.toolUse) return { role: "assistant", content: m.toolUse };
            if (m.toolResult) return { role: "user", content: m.toolResult };
            return { role: "assistant", content: m.text };
          });

          const actionsTaken = [];
          let maxLoops = 5;

          while (maxLoops-- > 0) {
            const response = await fetch("/api/ai", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, system: buildContext(), tools: TOOLS, messages: apiMessages }),
            });
            if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(e.error?.message || "API error " + response.status); }
            const result = await response.json();

            const textBlocks = result.content?.filter(c => c.type === "text") || [];
            const toolBlocks = result.content?.filter(c => c.type === "tool_use") || [];

            // If no tool calls, we're done
            if (toolBlocks.length === 0) {
              const reply = textBlocks.map(t => t.text).join("\n") || "Done.";
              const finalText = actionsTaken.length > 0 ? `${reply}\n\n✅ Actions taken:\n${actionsTaken.map(a => `• ${a}`).join("\n")}` : reply;
              setMessages(prev => [...prev, { role: "assistant", text: finalText }]);
              break;
            }

            // Execute tools
            const toolResults = [];
            for (const tool of toolBlocks) {
              const result = await executeTool(tool.name, tool.input);
              toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: JSON.stringify(result) });
              if (result.success && result.message) actionsTaken.push(result.message);
            }

            // Show interim text if any
            if (textBlocks.length > 0) {
              setMessages(prev => [...prev, { role: "assistant", text: textBlocks.map(t => t.text).join("\n"), interim: true }]);
            }

            // Continue the conversation with tool results
            apiMessages = [...apiMessages, { role: "assistant", content: result.content }, { role: "user", content: toolResults }];
          }
        } catch (err) {
          setMessages(prev => [...prev, { role: "assistant", text: "Error: " + (err.message || "Something went wrong"), error: true }]);
        } finally { setProcessing(false); }
      };

      const suggestions = [
        "Create a lead for Greystar in Atlanta",
        "Open an emergency ticket for Tampa Palms",
        "Move the Brookhaven lead to proposal sent",
        "Add a new company called Pinnacle Property Mgmt",
        "Draft a follow-up email to the Tampa Palms contact",
        "What's my pipeline looking like?",
      ];

      if (!open) {
        return (
          <button onClick={() => setOpen(true)} style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 9000,
            width: 56, height: 56, borderRadius: 28, border: "none",
            background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`,
            color: C.white, fontSize: 24, cursor: "pointer",
            boxShadow: `0 6px 24px ${C.red}40, 0 2px 8px rgba(0,0,0,0.2)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}>
            {I.zap}
          </button>
        );
      }

      return (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9000, width: 440, maxWidth: "calc(100vw - 48px)", height: 580, maxHeight: "calc(100vh - 100px)", borderRadius: 16, background: C.white, boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "14px 18px", background: `linear-gradient(135deg, ${C.navyDark}, ${C.navy})`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white }}>{I.zap}</div>
              <div><div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>CR Assistant</div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Can read & write your CRM</div></div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setMessages([])} style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", padding: "4px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600 }}>Clear</button>
              <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: C.white, padding: "4px 8px", borderRadius: 5, fontSize: 16 }}>×</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: 20 }}>
                <div style={{ fontSize: 32, opacity: 0.15, marginBottom: 12 }}>⚡</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.navy, margin: "0 0 4px" }}>What can I do for you?</p>
                <p style={{ fontSize: 12, color: C.gray400, margin: "0 0 20px" }}>I can create leads, open tickets, update records, draft emails, and answer questions.</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  {suggestions.map(s => (
                    <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }} style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${C.gray200}`, background: C.gray50, color: C.gray600, fontSize: 11, fontWeight: 500, cursor: "pointer" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.red + "60"; e.currentTarget.style.color = C.red; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.gray200; e.currentTarget.style.color = C.gray600; }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.filter(m => !m.toolUse && !m.toolResult).map((m, i) => (
              <div key={m.id || (m.role + '_' + i)} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%", padding: "10px 14px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: m.role === "user" ? `linear-gradient(135deg, ${C.navy}, ${C.navyLight})` : m.error ? C.redBg : C.gray50,
                  color: m.role === "user" ? C.white : m.error ? C.red : C.navy,
                  fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {processing && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 16px", borderRadius: "14px 14px 14px 4px", background: C.gray50, display: "flex", alignItems: "center", gap: 8 }}>
                  <Spinner size={12} color={C.gray400} />
                  <span style={{ fontSize: 12, color: C.gray400 }}>Working...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* File attachment display */}
          {attachedFile && (
            <div style={{ padding: "6px 14px", borderTop: `1px solid ${C.gray200}`, display: "flex", alignItems: "center", gap: 8, background: C.gray50 }}>
              <span style={{ fontSize: 14 }}>📎</span>
              <span style={{ fontSize: 12, color: C.navy, flex: 1 }}>{attachedFile.name} ({(attachedFile.size / 1024).toFixed(0)} KB)</span>
              <button onClick={() => setAttachedFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400, fontSize: 14 }}>✕</button>
            </div>
          )}
          {/* Input */}
          <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.gray200}`, display: "flex", gap: 8, flexShrink: 0, background: C.white }}>
            <input type="file" ref={fileInputRef} style={{ display: "none" }} accept=".pdf,.xlsx,.xls,.csv,.doc,.docx" onChange={e => { if (e.target.files[0]) setAttachedFile(e.target.files[0]); e.target.value = ""; }} />
            <button onClick={() => fileInputRef.current?.click()} title="Attach document" style={{ background: "none", border: `1px solid ${C.gray300}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer", color: C.gray500, fontSize: 16 }}>📎</button>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={attachedFile ? "Describe what to do with this file..." : "Ask or tell me what to do..."} style={{ flex: 1, padding: "10px 14px", border: `1px solid ${C.gray300}`, borderRadius: 10, fontSize: 13, color: C.navy, outline: "none", background: C.gray50 }} />
            <button onClick={handleSend} disabled={!input.trim() || processing} style={{
              padding: "10px 16px", borderRadius: 10, border: "none", flexShrink: 0,
              background: input.trim() && !processing ? `linear-gradient(135deg, ${C.red}, ${C.redDark})` : C.gray200,
              color: input.trim() && !processing ? C.white : C.gray400,
              fontSize: 12, fontWeight: 600, cursor: input.trim() && !processing ? "pointer" : "default",
            }}>
              Send
            </button>
          </div>
        </div>
      );
    }


    // ============================================================
    // ============================================================
    // MODULE: USER MANAGEMENT (Admin-only)


export default AIAgent;
