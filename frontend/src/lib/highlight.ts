import React from "react";

export interface MatchOccurrence {
  segmentIndex: number;
  matchIndex: number; // 0-indexed global match number
  textIndex: number;
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightText(
  text: string,
  query: string,
  segmentIndex: number,
  activeMatchGlobalIndex?: number,
  globalMatchCounter?: { count: number }
): React.ReactNode[] {
  if (!query || !query.trim()) {
    return [text];
  }

  const cleanQuery = query.trim();
  const escaped = escapeRegex(cleanQuery);
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.toLowerCase() === cleanQuery.toLowerCase()) {
      let currentMatchIdx = -1;
      if (globalMatchCounter) {
        currentMatchIdx = globalMatchCounter.count;
        globalMatchCounter.count += 1;
      }
      const isActive = activeMatchGlobalIndex !== undefined && activeMatchGlobalIndex === currentMatchIdx;

      return React.createElement(
        "mark",
        {
          key: i,
          className: isActive
            ? "active-match bg-amber-400 text-slate-950 font-semibold px-0.5 rounded shadow-sm ring-2 ring-amber-500"
            : "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 px-0.5 rounded",
        },
        part
      );
    }
    return part;
  });
}

export function computeTotalMatches(segments: { text: string }[], query: string): number {
  if (!query || !query.trim()) return 0;
  const cleanQuery = query.trim();
  const escaped = escapeRegex(cleanQuery);
  const regex = new RegExp(escaped, "gi");
  let total = 0;
  for (const seg of segments) {
    const matches = seg.text.match(regex);
    if (matches) {
      total += matches.length;
    }
  }
  return total;
}

export function findSegmentForMatchIndex(
  segments: { text: string }[],
  query: string,
  targetMatchIndex: number
): number {
  if (!query || !query.trim()) return -1;
  const cleanQuery = query.trim();
  const escaped = escapeRegex(cleanQuery);
  const regex = new RegExp(escaped, "gi");
  let running = 0;

  for (let sIdx = 0; sIdx < segments.length; sIdx++) {
    const matches = segments[sIdx].text.match(regex);
    if (matches) {
      if (running + matches.length > targetMatchIndex) {
        return sIdx;
      }
      running += matches.length;
    }
  }
  return -1;
}
