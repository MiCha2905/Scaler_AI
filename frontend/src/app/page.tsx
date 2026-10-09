"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, Plus, Loader2, RefreshCw, AlertCircle, Inbox } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MeetingCard } from "@/components/meetings/MeetingCard";
import { MeetingFilters } from "@/components/meetings/MeetingFilters";
import { DeleteDialog } from "@/components/meetings/DeleteDialog";
import { EditMeetingModal } from "@/components/meetings/EditMeetingModal";
import { MeetingListItem, Participant, Tag, MeetingDetail } from "@/types/api";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

export default function LibraryPage() {
  const { showToast } = useToast();
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(12);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [filters, setFilters] = useState<{
    q?: string;
    participant_id?: number;
    tag?: string;
    date_from?: string;
    date_to?: string;
    sort?: string;
  }>({});

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [deleteTarget, setDeleteTarget] = useState<MeetingListItem | null>(null);
  const [editTarget, setEditTarget] = useState<MeetingDetail | null>(null);
  const [editLoading, setEditLoading] = useState<boolean>(false);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMeetings({
        ...filters,
        page,
        page_size: pageSize,
      });
      setMeetings(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || "Failed to load meetings");
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  useEffect(() => {
    // Load participants and tags for filter dropdowns
    api.getParticipants().then(setParticipants).catch(() => {});
    api.getTags().then(setTags).catch(() => {});

    // Listen for global meeting_created event
    const handleCreated = () => fetchMeetings();
    window.addEventListener("meeting_created", handleCreated);
    return () => window.removeEventListener("meeting_created", handleCreated);
  }, [fetchMeetings]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteMeeting(deleteTarget.id);
      showToast("Meeting deleted", "success");
      fetchMeetings();
    } catch (err: any) {
      showToast(err.message || "Failed to delete meeting", "error");
    }
  };

  const handleOpenEdit = async (m: MeetingListItem) => {
    setEditLoading(true);
    try {
      const fullDetail = await api.getMeeting(m.id);
      setEditTarget(fullDetail);
    } catch (err: any) {
      showToast(err.message || "Failed to load meeting details", "error");
    } finally {
      setEditLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
              <span>My Meetings</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-300 border border-brand-200/60 dark:border-brand-900/60">
                {total} Total
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Synchronized meeting recordings, AI generated summaries, and action items
            </p>
          </div>

          <button
            onClick={() => fetchMeetings()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters */}
        <MeetingFilters
          participants={participants}
          tags={tags}
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            setPage(1);
          }}
        />

        {/* Loading State / Skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-48 rounded-2xl bg-muted/40 border border-border/60 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{error}</p>
            <button
              onClick={() => fetchMeetings()}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : meetings.length === 0 ? (
          <div className="p-16 text-center rounded-2xl border border-dashed border-border bg-card space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">No meetings found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No meetings match your current search filters. Try clearing filters or create a new meeting.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {meetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onEdit={handleOpenEdit}
                onDelete={(m) => setDeleteTarget(m)}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} meetings
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs font-semibold px-2 text-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <DeleteDialog
          isOpen={Boolean(deleteTarget)}
          meetingTitle={deleteTarget.title}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {/* Edit Meeting Modal */}
      {editTarget && (
        <EditMeetingModal
          isOpen={Boolean(editTarget)}
          meeting={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            fetchMeetings();
          }}
        />
      )}
    </AppShell>
  );
}
