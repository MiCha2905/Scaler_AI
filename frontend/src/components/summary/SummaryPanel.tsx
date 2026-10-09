"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckSquare,
  Bookmark,
  Bot,
  RotateCw,
  Loader2,
  Tag as TagIcon,
} from "lucide-react";
import { MeetingDetail, Chapter, ActionItem, Participant, Summary } from "@/types/api";
import { ChaptersList } from "./ChaptersList";
import { ActionItemList } from "./ActionItemList";
import { MeetingChat } from "./MeetingChat";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface SummaryPanelProps {
  meeting: MeetingDetail;
  currentTime: number;
  onSeek: (startSec: number) => void;
  onSummaryUpdated: (newSummary: Summary) => void;
}

export function SummaryPanel({
  meeting,
  currentTime,
  onSeek,
  onSummaryUpdated,
}: SummaryPanelProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"summary" | "actions" | "chapters" | "chat">("summary");
  const [regenerating, setRegenerating] = useState<boolean>(false);

  const summary = meeting.summary;
  const keywords = summary?.keywords || [];
  const actionItems = meeting.action_items || [];
  const chapters = meeting.chapters || [];

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const updated = await api.regenerateSummary(meeting.id);
      onSummaryUpdated(updated);
      showToast("Summary and chapters regenerated", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to regenerate summary", "error");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl flex flex-col h-full shadow-sm overflow-hidden">
      {/* Header Tabs & Regenerate Button */}
      <div className="p-3 border-b border-border flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("summary")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "summary"
                ? "bg-card text-brand-600 dark:text-brand-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Summary</span>
          </button>

          <button
            onClick={() => setActiveTab("actions")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "actions"
                ? "bg-card text-brand-600 dark:text-brand-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Action Items</span>
            {actionItems.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                {actionItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("chapters")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "chapters"
                ? "bg-card text-brand-600 dark:text-brand-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Chapters</span>
            {chapters.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                {chapters.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "chat"
                ? "bg-card text-brand-600 dark:text-brand-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Ask AI</span>
          </button>
        </div>

        {/* Regenerate Action */}
        <button
          onClick={handleRegenerate}
          disabled={regenerating || meeting.duration_sec === 0}
          title="Re-run AI summary generator"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-30 shrink-0"
        >
          {regenerating ? (
            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
          ) : (
            <RotateCw className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* Tab 1: Summary & Keywords */}
        {activeTab === "summary" && (
          <div className="space-y-6 animate-in fade-in">
            {/* Overview */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                <span>Executive Overview</span>
              </h4>
              {summary?.overview ? (
                <div className="p-4 rounded-xl bg-muted/30 border border-border text-xs sm:text-sm text-foreground/90 leading-relaxed space-y-2">
                  <p>{summary.overview}</p>
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                  No overview available for this meeting.
                </div>
              )}
            </div>

            {/* Keywords */}
            {keywords.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                  <TagIcon className="w-3.5 h-3.5 text-brand-500" />
                  <span>Key Discussion Topics</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/80 dark:bg-brand-950 dark:text-brand-200 dark:border-brand-700/60 shadow-xs hover:border-brand-400 transition-colors"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Action Items */}
        {activeTab === "actions" && (
          <div className="animate-in fade-in">
            <ActionItemList
              meetingId={meeting.id}
              initialItems={actionItems}
              participants={meeting.participants}
            />
          </div>
        )}

        {/* Tab 3: Chapters */}
        {activeTab === "chapters" && (
          <div className="animate-in fade-in">
            <ChaptersList
              chapters={chapters}
              currentTime={currentTime}
              onSeek={onSeek}
            />
          </div>
        )}

        {/* Tab 4: Ask AI Chat */}
        {activeTab === "chat" && (
          <div className="animate-in fade-in">
            <MeetingChat meetingId={meeting.id} onSeekToSegment={onSeek} />
          </div>
        )}
      </div>
    </div>
  );
}
