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
        className="flex-1 overflow-y-auto p-3 space-y-2 scroll-smooth"
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
          segments.map((seg, idx) => {
            const segComments = comments.filter((c) => c.segment_id === seg.id);
            const isEditingComment = commentTargetSegment?.id === seg.id;

            return (
              <div key={seg.id} className="space-y-1.5">
                <TranscriptLine
                  segment={seg}
                  index={idx}
                  isActive={activeSegmentIndex === idx}
                  searchQuery={searchQuery}
                  commentCount={segComments.length}
                  onSeek={(sec) => {
                    setUserHasScrolled(false);
                    onSeek(sec);
                  }}
                  onAddComment={(s) => {
                    if (commentTargetSegment?.id === s.id) {
                      setCommentTargetSegment(null);
                      setCommentText("");
                    } else {
                      setCommentTargetSegment(s);
                      setCommentText("");
                    }
                  }}
                />

                {/* Display existing comments for this segment right here */}
                {segComments.map((c) => (
                  <div
                    key={c.id}
                    className="ml-11 mr-2 p-2.5 rounded-xl bg-brand-50/80 dark:bg-brand-950/60 border border-brand-200/80 dark:border-brand-900/80 text-xs flex items-start justify-between gap-2.5 text-brand-950 dark:text-brand-100 shadow-2xs group/comment animate-in fade-in duration-150"
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-brand-600 dark:text-brand-400 shrink-0" />
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <p className="leading-relaxed break-words font-medium">{c.body}</p>
                        <span className="text-[10px] text-muted-foreground block">
                          {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await api.deleteComment(c.id);
                          setComments((prev) => prev.filter((item) => item.id !== c.id));
                          showToast("Comment deleted", "info");
                        } catch (err: any) {
                          showToast("Failed to delete comment", "error");
                        }
                      }}
                      title="Delete comment"
                      className="opacity-0 group-hover/comment:opacity-100 p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Inline Comment Form right beneath this segment */}
                {isEditingComment && (
                  <div className="ml-11 mr-2 p-3 rounded-2xl bg-card border-2 border-brand-500/60 shadow-md space-y-2.5 animate-in fade-in zoom-in-98 duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Add Note / Comment</span>
                      </span>
                      <button
                        onClick={() => {
                          setCommentTargetSegment(null);
                          setCommentText("");
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <form onSubmit={handleAddCommentSubmit} className="space-y-2">
                      <textarea
                        autoFocus
                        rows={2}
                        placeholder="Type note, key takeaway, or follow-up question..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAddCommentSubmit(e);
                          } else if (e.key === "Escape") {
                            setCommentTargetSegment(null);
                            setCommentText("");
                          }
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background/80 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 resize-none transition-all placeholder:text-muted-foreground/70"
                      />

                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          Press <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[9px] border">Enter ↵</kbd> to save
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setCommentTargetSegment(null);
                              setCommentText("");
                            }}
                            className="px-2.5 py-1 text-xs rounded-lg text-muted-foreground hover:bg-muted font-medium transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={!commentText.trim()}
                            className="px-3 py-1 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-xs"
                          >
                            <Send className="w-3 h-3" />
                            <span>Post</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })
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
    </div>
  );
}
