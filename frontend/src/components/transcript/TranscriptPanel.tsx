"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  ArrowDown,
  MessageSquare,
  Sparkles,
  Send,
  X,
} from "lucide-react";
import { TranscriptSegment, Comment } from "@/types/api";
import { TranscriptLine } from "./TranscriptLine";
import { TranscriptSearch } from "./TranscriptSearch";
import { computeTotalMatches, findSegmentForMatchIndex } from "@/lib/highlight";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  activeSegmentIndex: number;
  meetingId: number;
  isPlaying: boolean;
  onSeek: (startSec: number) => void;
}

export function TranscriptPanel({
  segments,
  activeSegmentIndex,
  meetingId,
  isPlaying,
  onSeek,
}: TranscriptPanelProps) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [userHasScrolled, setUserHasScrolled] = useState<boolean>(false);
  const [commentTargetSegment, setCommentTargetSegment] = useState<TranscriptSegment | null>(null);
  const [commentText, setCommentText] = useState<string>("");
  const [comments, setComments] = useState<Comment[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollingRef = useRef<boolean>(false);

  const totalMatches = computeTotalMatches(segments, searchQuery);

  // Fetch comments
  useEffect(() => {
    if (meetingId) {
      api.getComments(meetingId).then(setComments).catch(() => {});
    }
  }, [meetingId]);

  // Smart Auto-Scroll to Active Segment
  useEffect(() => {
    if (activeSegmentIndex < 0 || userHasScrolled || !containerRef.current) return;

    const targetEl = document.getElementById(`transcript-segment-${activeSegmentIndex}`);
    if (targetEl) {
      isAutoScrollingRef.current = true;
      targetEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 350);
    }
  }, [activeSegmentIndex, userHasScrolled]);

  // Detect manual user scroll
  const handleScroll = () => {
    if (isAutoScrollingRef.current) return;
    setUserHasScrolled(true);
  };

  const jumpToActive = useCallback(() => {
    setUserHasScrolled(false);
    if (activeSegmentIndex >= 0) {
      const targetEl = document.getElementById(`transcript-segment-${activeSegmentIndex}`);
      targetEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeSegmentIndex]);

  // Handle Search Navigation
  const scrollToMatch = (matchIdx: number) => {
    const segIdx = findSegmentForMatchIndex(segments, searchQuery, matchIdx);
    if (segIdx >= 0) {
      const el = document.getElementById(`transcript-segment-${segIdx}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleNextMatch = () => {
    if (totalMatches <= 0) return;
    const nextIdx = (currentMatchIndex + 1) % totalMatches;
    setCurrentMatchIndex(nextIdx);
    scrollToMatch(nextIdx);
  };

  const handlePrevMatch = () => {
    if (totalMatches <= 0) return;
    const prevIdx = (currentMatchIndex - 1 + totalMatches) % totalMatches;
    setCurrentMatchIndex(prevIdx);
    scrollToMatch(prevIdx);
  };

  const handleAddCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentTargetSegment || !commentText.trim()) return;

    try {
      const newComment = await api.addComment(meetingId, {
        segment_id: commentTargetSegment.id,
        body: commentText.trim(),
      });
      setComments([...comments, newComment]);
      showToast("Comment saved", "success");
      setCommentText("");
      setCommentTargetSegment(null);
    } catch (err: any) {
      showToast(err.message || "Failed to add comment", "error");
    }
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl flex flex-col h-full shadow-sm overflow-hidden relative">
      {/* Header & Search Bar */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h3 className="font-bold text-sm">Transcript</h3>
            <span className="text-xs text-muted-foreground">({segments.length} turns)</span>
          </div>

          {comments.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded-md">
              <MessageSquare className="w-3 h-3" />
              <span>{comments.length} comments</span>
            </span>
          )}
        </div>

        <TranscriptSearch
          query={searchQuery}
          totalMatches={totalMatches}
          currentMatchIndex={currentMatchIndex}
          onQueryChange={(q) => {
            setSearchQuery(q);
            setCurrentMatchIndex(0);
          }}
          onNextMatch={handleNextMatch}
          onPrevMatch={handlePrevMatch}
          onClear={() => {
            setSearchQuery("");
            setCurrentMatchIndex(0);
          }}
        />
      </div>

      {/* Segments Stream */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-1.5 scroll-smooth"
      >
        {segments.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">No transcript yet</h4>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              This meeting has no transcript data. You can upload a .vtt or .txt file when creating a new meeting.
            </p>
          </div>
        ) : (
          segments.map((seg, idx) => (
            <div key={seg.id} className="space-y-1">
              <TranscriptLine
                segment={seg}
                index={idx}
                isActive={activeSegmentIndex === idx}
                searchQuery={searchQuery}
                onSeek={(sec) => {
                  setUserHasScrolled(false);
                  onSeek(sec);
                }}
                onAddComment={(s) => setCommentTargetSegment(s)}
              />

              {/* Display comments on this segment if any */}
              {comments
                .filter((c) => c.segment_id === seg.id)
                .map((c) => (
                  <div
                    key={c.id}
                    className="ml-12 p-2 rounded-xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-900/60 text-xs flex items-start gap-2 text-brand-900 dark:text-brand-200"
                  >
                    <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-brand-500 shrink-0" />
                    <span className="flex-1 leading-relaxed">{c.body}</span>
                  </div>
                ))}
            </div>
          ))
        )}
      </div>

      {/* Floating "Jump to current segment" button */}
      {userHasScrolled && isPlaying && activeSegmentIndex >= 0 && (
        <button
          onClick={jumpToActive}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-600 text-white text-xs font-semibold shadow-lg hover:bg-brand-700 transition-all animate-in fade-in slide-in-from-bottom-2"
        >
          <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
          <span>Jump to active line</span>
        </button>
      )}

      {/* Add Comment Popover Modal */}
      {commentTargetSegment && (
        <div className="p-3 border-t border-border bg-card shadow-lg flex flex-col gap-2 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-brand-500" />
              <span>Comment on line at {commentTargetSegment.start_sec}s</span>
            </span>
            <button
              onClick={() => setCommentTargetSegment(null)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <form onSubmit={handleAddCommentSubmit} className="flex gap-2">
            <input
              type="text"
              autoFocus
              placeholder="Type note or highlight takeaway..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              <span>Save</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
