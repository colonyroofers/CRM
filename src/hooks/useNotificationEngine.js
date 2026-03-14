import { useState, useEffect, useRef } from 'react';
import { daysBetweenDates } from '../utils/calculations.js';

export function useNotificationEngine(
  salesLeads = [],
  serviceTickets = [],
  inspections = [],
  submissions = [],
  user,
  crmUsers = []
) {
  const [alerts, setAlerts] = useState([]);
  const alertsRef = useRef({});

  useEffect(() => {
    const generateAlerts = () => {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const newAlerts = [];
      const seen = {};

      // 1. Bid due in 48 hours
      salesLeads.forEach(lead => {
        if (lead.status === "being_estimated" && lead.bidDueDate) {
          const daysUntilDue = daysBetweenDates(now, lead.bidDueDate);
          if (daysUntilDue >= 0 && daysUntilDue <= 2) {
            const key = `bid_due_${lead.id}`;
            if (!seen[key]) {
              newAlerts.push({
                id: lead.id + "_bid_due",
                type: "bid_due",
                title: `Bid Due Soon: ${lead.projectName}`,
                message: `Bid is due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}`,
                severity: daysUntilDue === 0 ? "critical" : "warning",
                module: "sales",
                entityId: lead.id,
                createdAt: now.toISOString()
              });
              seen[key] = true;
            }
          }
        }
      });

      // 2. Stale lead (new_lead or contacted with 3+ days no activity)
      salesLeads.forEach(lead => {
        if ((lead.status === "new_lead" || lead.status === "contacted") && lead.createdAt) {
          const daysSinceActivity = daysBetweenDates(lead.lastActivityAt || lead.createdAt, now);
          if (daysSinceActivity >= 3) {
            const key = `stale_lead_${lead.id}`;
            if (!seen[key]) {
              newAlerts.push({
                id: lead.id + "_stale",
                type: "stale_lead",
                title: `Stale Lead: ${lead.projectName}`,
                message: `No activity for ${daysSinceActivity} days`,
                severity: "info",
                module: "sales",
                entityId: lead.id,
                createdAt: now.toISOString()
              });
              seen[key] = true;
            }
          }
        }
      });

      // 3. Follow-up needed (proposal_sent with 3+ days no activity)
      salesLeads.forEach(lead => {
        if (lead.status === "proposal_sent" && lead.createdAt) {
          const daysSinceActivity = daysBetweenDates(lead.lastActivityAt || lead.createdAt, now);
          if (daysSinceActivity >= 3) {
            const key = `followup_${lead.id}`;
            if (!seen[key]) {
              newAlerts.push({
                id: lead.id + "_followup",
                type: "follow_up",
                title: `Follow-up Needed: ${lead.projectName}`,
                message: `Proposal sent ${daysSinceActivity} days ago`,
                severity: "warning",
                module: "sales",
                entityId: lead.id,
                createdAt: now.toISOString()
              });
              seen[key] = true;
            }
          }
        }
      });

      // 4. Emergency ticket (Emergency priority + New status)
      serviceTickets.forEach(ticket => {
        if (ticket.priority === "Emergency" && ticket.status === "New") {
          const key = `emergency_${ticket.id}`;
          if (!seen[key]) {
            newAlerts.push({
              id: ticket.id + "_emergency",
              type: "emergency",
              title: `Emergency Service Ticket: ${ticket.title}`,
              message: `Requires immediate attention`,
              severity: "critical",
              module: "service",
              entityId: ticket.id,
              createdAt: now.toISOString()
            });
            seen[key] = true;
          }
        }
      });

      // 5. Inspection today
      inspections.forEach(inspection => {
        if (inspection.scheduledDate === today) {
          const key = `inspection_${inspection.id}`;
          if (!seen[key]) {
            newAlerts.push({
              id: inspection.id + "_today",
              type: "inspection",
              title: `Inspection Today: ${inspection.propertyAddress}`,
              message: `Scheduled for ${inspection.inspector || "TBD"}`,
              severity: "info",
              module: "inspections",
              entityId: inspection.id,
              createdAt: now.toISOString()
            });
            seen[key] = true;
          }
        }
      });

      setAlerts(newAlerts);
    };

    generateAlerts();
    const interval = setInterval(generateAlerts, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [salesLeads, serviceTickets, inspections, submissions, user, crmUsers]);

  return alerts;
}
