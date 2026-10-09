"use client";

import React from "react";
import { Plug, Zap, Check } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

export default function IntegrationsPage() {
  const integrations = [
    { name: "Slack", category: "Notifications", desc: "Auto-send meeting summaries & action items to team channels." },
    { name: "Jira Software", category: "Project Management", desc: "Convert meeting action items directly into trackable Jira issues." },
    { name: "Notion", category: "Knowledge Base", desc: "Sync meeting transcripts and AI executive briefs into team databases." },
    { name: "Salesforce / HubSpot", category: "CRM", desc: "Log customer call notes and action points to CRM deal timelines." },
    { name: "Linear", category: "Issue Tracking", desc: "Auto-create Linear cycles from engineering sprint retros." },
    { name: "Zapier", category: "Automation", desc: "Trigger 5000+ custom automations when a meeting completes." },
  ];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrations & Workflows</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Connect Fireflies with your existing productivity, CRM, and project management stack
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((item) => (
            <div key={item.name} className="p-5 rounded-2xl border border-border bg-card space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {item.category}
                  </span>
                  <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 rounded">
                    Coming Soon
                  </span>
                </div>
                <h3 className="text-sm font-bold">{item.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>

              <button
                disabled
                className="w-full py-1.5 px-3 rounded-xl border border-border text-xs font-semibold text-muted-foreground bg-muted/40 cursor-not-allowed"
              >
                Connect
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
