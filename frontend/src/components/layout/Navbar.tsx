"use client";

import React from "react";
import Link from "next/link";
import { Menu, Search, Plus, Sparkles } from "lucide-react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface NavbarProps {
  onOpenMobileMenu: () => void;
  onOpenNewMeeting?: () => void;
}

export function Navbar({ onOpenMobileMenu, onOpenNewMeeting }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sm:px-8">
      {/* Mobile Toggle & Brand */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center text-white">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground">Fireflies</span>
        </Link>
      </div>

      {/* Desktop Search Shortcut Trigger */}
      <div className="hidden sm:flex items-center gap-2">
        <Link
          href="/search"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-xs text-muted-foreground transition-all hover:border-brand-500/40 w-64"
        >
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Search meetings, transcripts...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border border-border bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </Link>
      </div>

      {/* Action CTA & Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />

        <button
          onClick={onOpenNewMeeting}
          className="flex items-center gap-2 py-1.5 px-3.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs shadow-sm transition-all hover:shadow active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Meeting</span>
        </button>

        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-bold ring-2 ring-brand-500/20">
          SC
        </div>
      </div>
    </header>
  );
}
