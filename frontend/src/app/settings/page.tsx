"use client";

import React from "react";
import { Settings, Bot, Users, BarChart3, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workspace Settings</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your AI notetaker preferences, team members, and enterprise security policies
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 flex items-center justify-center font-bold">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold">Live Notetaker Bot</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Auto-join Google Meet, Zoom, and MS Teams calls to capture audio recordings and real-time transcripts.
            </p>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
              Coming Soon
            </span>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold">Team Workspace & RBAC</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Invite teammates, configure department workspaces, and set role-based access permissions.
            </p>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
              Coming Soon
            </span>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold">Conversation Intelligence</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Track talk-to-listen ratios, sentiment analysis, key competitor mentions, and customer objection trends.
            </p>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
              Coming Soon
            </span>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold">Security & Compliance</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Configure 90-day audio auto-purge data retention, audit log streaming, and SAML 2.0 single sign-on.
            </p>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
              Coming Soon
            </span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
