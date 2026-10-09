"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  FileText,
  Sparkles,
  CheckSquare,
  Play,
  Calendar,
  Loader2,
  Inbox,
  ArrowRight,
  X,
  TrendingUp,
  Tag as TagIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { GlobalSearchResult } from "@/types/api";
import { formatRelativeDate, formatTime } from "@/lib/utils";

const SUGGESTED_QUERIES = [
  "roadmap",
  "audit log",
  "SOC2",
  "Figma",
  "security",
  "Acme Corp",
  "Alex Rivera",
  "token expiration",
];

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState<string>(initialQuery);
  const [activeType, setActiveType] = useState<string>("");
  const [results, setResults] = useState<GlobalSearchResult["results"]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);

  useEffect(() => {
    if (initialQuery && !query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setTotal(0);
      setSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.globalSearch(query.trim(), activeType || undefined);
        setResults(res.results);
        setTotal(res.total);
        setSearched(true);
      } catch {
        setResults([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, activeType]);

  const typeIcons = {
    title: <FileText className="w-4 h-4 text-blue-500" />,
    transcript: <Play className="w-4 h-4 text-brand-500" />,
    summary: <Sparkles className="w-4 h-4 text-amber-500" />,
    action_item: <CheckSquare className="w-4 h-4 text-emerald-500" />,
  };

  const highlightSnippet = (text: string, term: string) => {
    if (!term.trim()) return text;
    const parts = text.split(new RegExp(`(${term.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase() ? (
        <mark key={i} className="bg-amber-200 dark:bg-amber-900/60 text-slate-900 dark:text-amber-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Global Search</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Search across meeting titles, transcript dialogue, AI summaries, and action items
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          autoFocus
          placeholder="Search keywords, decisions, speakers, tasks (e.g. 'audit logs', 'Okta', 'Alex')..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-12 pr-10 py-3.5 text-sm rounded-2xl border border-border bg-card shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Type Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { label: "All Results", value: "" },
          { label: "Transcripts", value: "transcript" },
          { label: "Summaries", value: "summary" },
          { label: "Titles", value: "title" },
          { label: "Action Items", value: "action_item" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveType(tab.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
              activeType === tab.value
                ? "bg-brand-500 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Suggested Queries When Empty */}
      {!query.trim() && (
        <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <TrendingUp className="w-4 h-4 text-brand-500" />
            <span>Suggested Searches</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="px-3 py-1.5 text-xs font-medium rounded-xl border border-border/70 bg-muted/40 hover:bg-brand-50 dark:hover:bg-brand-950/40 hover:border-brand-500/40 text-foreground transition-all hover:scale-105 active:scale-95"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <Loader2 className="w-7 h-7 mx-auto animate-spin text-brand-500" />
            <p className="text-xs text-muted-foreground">Searching meetings database...</p>
          </div>
        ) : searched && results.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card space-y-2 animate-in fade-in">
            <Inbox className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <h3 className="text-sm font-bold text-foreground">No matches found</h3>
            <p className="text-xs text-muted-foreground">Try another keyword or check spelling.</p>
          </div>
        ) : (
          results.map((res, i) => (
            <Link
              key={i}
              href={
                res.timestamp_sec !== undefined && res.timestamp_sec !== null
                  ? `/meetings/${res.meeting_id}?t=${res.timestamp_sec}`
                  : `/meetings/${res.meeting_id}`
              }
              className="group block p-4 rounded-2xl border border-border/80 bg-card hover:border-brand-500/40 hover:shadow-md transition-all space-y-2 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {typeIcons[res.match_type as keyof typeof typeIcons] || typeIcons.transcript}
                  <span className="text-xs font-bold text-foreground group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {res.meeting_title}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {res.match_type.replace("_", " ")}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  {res.timestamp_sec !== undefined && res.timestamp_sec !== null && (
                    <span className="font-mono font-semibold bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-300 px-2 py-0.5 rounded-md border border-brand-500/20">
                      {formatTime(res.timestamp_sec)}
                    </span>
                  )}
                  <span>{formatRelativeDate(res.created_at)}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-brand-500" />
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed pl-6 line-clamp-2">
                {highlightSnippet(res.snippet, query)}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export default function GlobalSearchPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading search...</div>}>
        <SearchContent />
      </Suspense>
    </AppShell>
  );
}
