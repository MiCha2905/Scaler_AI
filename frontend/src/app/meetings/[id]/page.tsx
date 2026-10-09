"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  FileText,
  Edit2,
  Trash2,
  Share2,
  Sparkles,
  Loader2,
  AlertCircle,
  MoreVertical,
  Volume2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MediaPlayer } from "@/components/player/MediaPlayer";
import { TranscriptPanel } from "@/components/transcript/TranscriptPanel";
import { SummaryPanel } from "@/components/summary/SummaryPanel";
import { DeleteDialog } from "@/components/meetings/DeleteDialog";
import { EditMeetingModal } from "@/components/meetings/EditMeetingModal";
import { MeetingDetail, TranscriptSegment, Summary } from "@/types/api";
import { api } from "@/lib/api";
import { usePlayer } from "@/hooks/usePlayer";
import { formatDuration, formatFullDate, getAvatarColor, getInitials } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export default function MeetingDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const meetingId = Number(params.id);

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [synthesizingAudio, setSynthesizingAudio] = useState<boolean>(false);

  // Modals state
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  // Responsive tab switcher for mobile screens
  const [mobileViewTab, setMobileViewTab] = useState<"transcript" | "summary">("transcript");

  const fetchMeetingData = useCallback(async () => {
    if (!meetingId) return;
    setLoading(true);
    setError(null);
    try {
      const [mDetail, mTranscript] = await Promise.all([
        api.getMeeting(meetingId),
        api.getTranscript(meetingId),
      ]);
      setMeeting(mDetail);
      setSegments(mTranscript);
    } catch (err: any) {
      setError(err.message || "Failed to load meeting");
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchMeetingData();
  }, [fetchMeetingData]);

  // Player Hook with Binary Search Segment Sync
  const player = usePlayer(
    meeting?.duration_sec || 0,
    meeting?.audio_url,
    segments
  );

  // Auto-seek if URL has ?t= timestamp parameter
  useEffect(() => {
    const tParam = searchParams.get("t");
    if (tParam && !isNaN(Number(tParam))) {
      const sec = Number(tParam);
      player.seek(sec);
    }
  }, [searchParams]);

  const handleSeek = useCallback(
    (sec: number) => {
      player.seek(sec);
      // Auto-start speaking when clicking any timeline box
      if (!player.isPlaying) {
        player.play();
      }
    },
    [player]
  );

  const handleDelete = async () => {
    try {
      await api.deleteMeeting(meetingId);
      showToast("Meeting deleted", "success");
      router.push("/");
    } catch (err: any) {
      showToast(err.message || "Failed to delete meeting", "error");
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("Meeting link copied to clipboard", "success");
    }
  };

  const handleGenerateAudio = async () => {
    setSynthesizingAudio(true);
    try {
      const updated = await api.generateAudio(meetingId);
      setMeeting(updated);
      const updatedTranscript = await api.getTranscript(meetingId);
      setSegments(updatedTranscript);
      showToast("Real multi-speaker audio synthesized and synchronized!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to synthesize audio", "error");
    } finally {
      setSynthesizingAudio(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="py-24 text-center space-y-3">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-brand-500" />
          <p className="text-sm font-medium text-muted-foreground">Loading meeting transcript & insights...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !meeting) {
    return (
      <AppShell>
        <div className="py-20 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Meeting Not Found</h2>
          <p className="text-xs text-muted-foreground">{error || "The requested meeting does not exist."}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Meetings</span>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-4 pb-12">
        {/* Navigation Breadcrumb & Back */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Meetings</span>
          </Link>

          {/* Action Menu */}
          <div className="flex items-center gap-2">
            {!meeting.audio_url && segments.length > 0 && (
              <button
                onClick={handleGenerateAudio}
                disabled={synthesizingAudio}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-50 dark:bg-brand-950/70 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 hover:bg-brand-100 transition-colors shadow-2xs disabled:opacity-50"
              >
                {synthesizingAudio ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                <span>{synthesizingAudio ? "Synthesizing Voice..." : "Generate Audio Track"}</span>
              </button>
            )}

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-border bg-card hover:bg-muted transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <a
              href={api.getExportUrl(meeting.id, "md")}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-border bg-card hover:bg-muted transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </a>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-50 w-48 bg-white dark:bg-[#181537] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1.5 animate-in fade-in zoom-in-95 ring-1 ring-black/5 dark:ring-white/10">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setEditOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#25224e] hover:text-slate-900 dark:hover:text-white transition-colors text-left"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Edit Details</span>
                    </button>
                    <a
                      href={api.getExportUrl(meeting.id, "md")}
                      download
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#25224e] hover:text-slate-900 dark:hover:text-white transition-colors text-left"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Export Markdown</span>
                    </a>
                    <a
                      href={api.getExportUrl(meeting.id, "txt")}
                      download
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#25224e] hover:text-slate-900 dark:hover:text-white transition-colors text-left"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Export TXT</span>
                    </a>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setDeleteOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors text-left border-t border-slate-100 dark:border-slate-800/80 mt-1 pt-2"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Delete Meeting</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Meeting Header Info */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {meeting.title}
          </h1>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatFullDate(meeting.date)}</span>
            </div>

            <div className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDuration(meeting.duration_sec)}</span>
            </div>

            {meeting.tags && meeting.tags.length > 0 && (
              <div className="flex items-center gap-1.5">
                {meeting.tags.map((t) => (
                  <span
                    key={t.id}
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-200 border border-brand-200/60 dark:border-brand-700/60"
                  >
                    #{t.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Participant Chips Stack */}
          {meeting.participants.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Attendees:</span>
              {meeting.participants.map((p) => {
                const palette = getAvatarColor(p.name);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-card shadow-2xs text-xs font-medium"
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${palette.bg} ${palette.text}`}
                    >
                      {getInitials(p.name)}
                    </div>
                    <span>{p.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Synchronized Media Player */}
        <MediaPlayer
          currentTime={player.currentTime}
          duration={meeting.duration_sec}
          isPlaying={player.isPlaying}
          isRealAudio={Boolean(meeting.audio_url)}
          hasAudio={Boolean(meeting.audio_url)}
          disabled={meeting.duration_sec <= 0}
          isGeneratingAudio={synthesizingAudio}
          onGenerateAudio={handleGenerateAudio}
          onTogglePlay={player.togglePlay}
          onSeek={player.seek}
          onSkipForward={player.skipForward}
          onSkipBackward={player.skipBackward}
        />

        {/* Mobile View Switcher */}
        <div className="flex sm:hidden border-b border-border bg-muted/40 p-1 rounded-xl">
          <button
            onClick={() => setMobileViewTab("transcript")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mobileViewTab === "transcript"
                ? "bg-card text-brand-600 shadow-xs"
                : "text-muted-foreground"
            }`}
          >
            Transcript ({segments.length})
          </button>
          <button
            onClick={() => setMobileViewTab("summary")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mobileViewTab === "summary"
                ? "bg-card text-brand-600 shadow-xs"
                : "text-muted-foreground"
            }`}
          >
            AI Insights
          </button>
        </div>

        {/* Main 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[680px]">
          {/* Left Column: Transcript (7 Cols / 60%) */}
          <div
            className={`lg:col-span-7 h-full ${
              mobileViewTab === "transcript" ? "block" : "hidden sm:block"
            }`}
          >
            <TranscriptPanel
              segments={segments}
              activeSegmentIndex={player.activeSegmentIndex}
              meetingId={meeting.id}
              isPlaying={player.isPlaying}
              onSeek={handleSeek}
            />
          </div>

          {/* Right Column: AI Summary & Insights (5 Cols / 40%) */}
          <div
            className={`lg:col-span-5 h-full ${
              mobileViewTab === "summary" ? "block" : "hidden sm:block"
            }`}
          >
            <SummaryPanel
              meeting={meeting}
              currentTime={player.currentTime}
              onSeek={handleSeek}
              onSummaryUpdated={(newSummary) => {
                setMeeting({ ...meeting, summary: newSummary });
              }}
            />
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <EditMeetingModal
          isOpen={editOpen}
          meeting={meeting}
          onClose={() => setEditOpen(false)}
          onSuccess={(updated) => {
            setMeeting(updated);
            setEditOpen(false);
          }}
        />
      )}

      {/* Delete Dialog */}
      {deleteOpen && (
        <DeleteDialog
          isOpen={deleteOpen}
          meetingTitle={meeting.title}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </AppShell>
  );
}
