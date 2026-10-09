"use client";

import React from "react";
import { Play, Bookmark } from "lucide-react";
import { Chapter } from "@/types/api";
import { formatTime } from "@/lib/utils";

interface ChaptersListProps {
  chapters: Chapter[];
  currentTime: number;
  onSeek: (startSec: number) => void;
}

export function ChaptersList({ chapters, currentTime, onSeek }: ChaptersListProps) {
  if (!chapters || chapters.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground space-y-1">
        <Bookmark className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-xs font-medium">No chapters generated yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {chapters.map((ch, idx) => {
        const nextChapter = chapters[idx + 1];
        const isCurrent =
          currentTime >= ch.start_sec &&
          (nextChapter ? currentTime < nextChapter.start_sec : true);

        return (
          <div
            key={ch.id || idx}
            onClick={() => onSeek(ch.start_sec)}
            className={`group p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
              isCurrent
                ? "bg-brand-50/70 dark:bg-brand-950/50 border-brand-500/50 shadow-xs"
                : "bg-card border-border/70 hover:border-brand-500/30 hover:bg-muted/30"
            }`}
          >
            {/* Timestamp Badge */}
            <span
              className={`font-mono text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1 shrink-0 ${
                isCurrent
                  ? "bg-brand-500 text-white shadow-xs"
                  : "bg-muted text-muted-foreground group-hover:bg-brand-500 group-hover:text-white transition-colors"
              }`}
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>{formatTime(ch.start_sec)}</span>
            </span>

            {/* Title & Description */}
            <div className="flex-1 min-w-0">
              <h4
                className={`text-xs font-bold leading-snug ${
                  isCurrent ? "text-brand-600 dark:text-brand-300" : "text-foreground"
                }`}
              >
                {ch.title}
              </h4>
              {ch.description && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                  {ch.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
