"use client";

import React from "react";
import { Play, MessageSquarePlus } from "lucide-react";
import { TranscriptSegment } from "@/types/api";
import { formatTime, getAvatarColor, getInitials, cn } from "@/lib/utils";
import { highlightText } from "@/lib/highlight";

interface TranscriptLineProps {
  segment: TranscriptSegment;
  index: number;
  isActive: boolean;
  searchQuery: string;
  activeMatchGlobalIndex?: number;
  commentCount?: number;
  onSeek: (startSec: number) => void;
  onAddComment?: (segment: TranscriptSegment) => void;
}

export const TranscriptLine = React.memo(function TranscriptLine({
  segment,
  index,
  isActive,
  searchQuery,
  activeMatchGlobalIndex,
  commentCount = 0,
  onSeek,
  onAddComment,
}: TranscriptLineProps) {
  const avatarStyle = getAvatarColor(segment.speaker_label);
  const initials = getInitials(segment.speaker_label);

  const highlightedNodes = highlightText(
    segment.text,
    searchQuery,
    index,
    activeMatchGlobalIndex
  );

  return (
    <div
      id={`transcript-segment-${index}`}
      onClick={() => onSeek(segment.start_sec)}
      className={cn(
        "group relative flex items-start gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all duration-150 border",
        isActive
          ? "bg-brand-50/80 dark:bg-brand-950/60 border-brand-500/50 shadow-sm ring-1 ring-brand-500/20"
          : "bg-transparent border-transparent hover:bg-muted/40 hover:border-border/60"
      )}
    >
      {/* Speaker Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ring-2 ring-card shadow-xs",
          avatarStyle.bg,
          avatarStyle.text
        )}
      >
        {initials}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Speaker Name & Timestamp */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">
              {segment.speaker_label}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground flex items-center gap-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              <Play className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 fill-current" />
              <span>{formatTime(segment.start_sec)}</span>
            </span>
          </div>

          {/* Comment Trigger / Badge */}
          {onAddComment && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddComment(segment);
              }}
              title={commentCount > 0 ? `${commentCount} comment${commentCount > 1 ? "s" : ""} - click to add note` : "Add note on this line"}
              className={cn(
                "p-1 rounded-md transition-all flex items-center gap-1 cursor-pointer",
                commentCount > 0
                  ? "opacity-100 text-brand-600 dark:text-brand-300 bg-brand-100/80 dark:bg-brand-900/80 px-1.5 py-0.5 border border-brand-300 dark:border-brand-700 font-semibold"
                  : "opacity-0 group-hover:opacity-100 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/70"
              )}
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              {commentCount > 0 && (
                <span className="text-[10px] font-bold text-brand-700 dark:text-brand-200">{commentCount}</span>
              )}
            </button>
          )}
        </div>

        {/* Text Body */}
        <p className="text-sm text-foreground/90 leading-relaxed break-words">
          {highlightedNodes}
        </p>
      </div>
    </div>
  );
});
