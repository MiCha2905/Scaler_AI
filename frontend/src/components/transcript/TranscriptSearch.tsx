"use client";

import React from "react";
import { Search, ChevronUp, ChevronDown, X } from "lucide-react";

interface TranscriptSearchProps {
  query: string;
  totalMatches: number;
  currentMatchIndex: number; // 0-indexed
  onQueryChange: (q: string) => void;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  onClear: () => void;
}

export function TranscriptSearch({
  query,
  totalMatches,
  currentMatchIndex,
  onQueryChange,
  onNextMatch,
  onPrevMatch,
  onClear,
}: TranscriptSearchProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/40 border border-border/80 rounded-xl">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search transcript..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-transparent bg-background focus:outline-none focus:border-brand-500/50"
        />
        {query && (
          <button
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {query.trim() && (
        <div className="flex items-center gap-1.5 shrink-0 pr-1">
          <span className="text-[11px] font-mono text-muted-foreground font-medium">
            {totalMatches > 0 ? `${currentMatchIndex + 1} of ${totalMatches}` : "0 matches"}
          </span>

          <button
            onClick={onPrevMatch}
            disabled={totalMatches === 0}
            title="Previous match"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-background disabled:opacity-30"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onNextMatch}
            disabled={totalMatches === 0}
            title="Next match"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-background disabled:opacity-30"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
