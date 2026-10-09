"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  LayoutGrid,
  Search,
  Bot,
  Users,
  Settings,
  Plug,
  BarChart3,
  Plus,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface SidebarProps {
  onOpenNewMeeting?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ onOpenNewMeeting, isOpenMobile = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "My Meetings", href: "/", icon: LayoutGrid, active: pathname === "/" || pathname.startsWith("/meetings") },
    { label: "Global Search", href: "/search", icon: Search, active: pathname === "/search" },
  ];

  const comingSoonItems = [
    { label: "Live Notetaker Bot", href: "/settings?tab=bot", icon: Radio, badge: "Soon" },
    { label: "Team Workspace", href: "/settings?tab=team", icon: Users, badge: "Soon" },
    { label: "Integrations", href: "/integrations", icon: Plug, badge: "Soon" },
    { label: "Conversation Intel", href: "/settings?tab=analytics", icon: BarChart3, badge: "Soon" },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-border/60">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-brand-900 to-brand-600 dark:from-white dark:via-brand-200 dark:to-brand-400 bg-clip-text text-transparent">
                Fireflies.ai
              </span>
            </Link>
          </div>

          {/* Quick Action Button */}
          <div className="p-4">
            <button
              onClick={() => {
                if (onOpenNewMeeting) onOpenNewMeeting();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm shadow-md shadow-brand-500/25 transition-all hover:shadow-lg active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Transcribe Meeting</span>
            </button>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Workspace
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      item.active
                        ? "bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-300 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", item.active ? "text-brand-600 dark:text-brand-400" : "text-muted-foreground")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Coming Soon Features */}
          <div className="px-3 py-2 mt-4 border-t border-border/40">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Coming Soon
            </p>
            <nav className="space-y-0.5">
              {comingSoonItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onCloseMobile}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-muted-foreground/70" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer: User profile & Theme Toggle */}
        <div className="p-4 border-t border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-bold ring-2 ring-brand-500/20">
              SC
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">Sarah Chen</span>
              <span className="text-[11px] text-muted-foreground">Product Lead</span>
            </div>
          </div>

          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
