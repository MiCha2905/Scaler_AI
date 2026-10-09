"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2, Edit3, Tag as TagIcon } from "lucide-react";
import { MeetingDetail, Participant, Tag } from "@/types/api";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface EditMeetingModalProps {
  isOpen: boolean;
  meeting: MeetingDetail;
  onClose: () => void;
  onSuccess: (updated: MeetingDetail) => void;
}

export function EditMeetingModal({ isOpen, meeting, onClose, onSuccess }: EditMeetingModalProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState<string>(meeting.title);
  const [date, setDate] = useState<string>(
    meeting.date ? new Date(meeting.date).toISOString().slice(0, 16) : ""
  );
  const [participants, setParticipants] = useState<{ id?: number; name: string; email?: string }[]>(
    []
  );
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(meeting.title);
      setDate(meeting.date ? new Date(meeting.date).toISOString().slice(0, 16) : "");
      setParticipants(
        meeting.participants.map((p) => ({ id: p.id, name: p.name, email: p.email || "" }))
      );
      setSelectedTagIds(meeting.tags.map((t) => t.id));

      // Fetch all tags
      api.getTags().then(setAllTags).catch(() => {});
    }
  }, [isOpen, meeting]);

  if (!isOpen) return null;

  const handleAddParticipant = () => {
    setParticipants([...participants, { name: "", email: "" }]);
  };

  const handleRemoveParticipant = (idx: number) => {
    setParticipants(participants.filter((_, i) => i !== idx));
  };

  const handleParticipantChange = (idx: number, field: "name" | "email", val: string) => {
    const copy = [...participants];
    copy[idx][field] = val;
    setParticipants(copy);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const created = await api.createTag(newTagName.trim());
      setAllTags([...allTags, created]);
      setSelectedTagIds([...selectedTagIds, created.id]);
      setNewTagName("");
    } catch (e: any) {
      showToast(e.message || "Failed to create tag", "error");
    }
  };

  const toggleTag = (id: number) => {
    if (selectedTagIds.includes(id)) {
      setSelectedTagIds(selectedTagIds.filter((tId) => tId !== id));
    } else {
      setSelectedTagIds([...selectedTagIds, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const validParticipants = participants
        .filter((p) => p.name.trim().length > 0)
        .map((p) => {
          if (p.id) return p.id;
          return { name: p.name.trim(), email: p.email?.trim() || undefined };
        });

      const updated = await api.updateMeeting(meeting.id, {
        title: title.trim(),
        date: date ? new Date(date).toISOString() : undefined,
        participants: validParticipants,
        tag_ids: selectedTagIds,
      });

      showToast("Meeting updated successfully", "success");
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update meeting");
      showToast(err.message || "Failed to update meeting", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Edit Meeting Details</h2>
              <p className="text-xs text-muted-foreground">Update title, date, participants, and tags</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <TagIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Tags</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {allTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      isSelected
                        ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                        : "bg-muted/40 text-muted-foreground border-border hover:border-brand-500/40"
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New tag..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <button
                type="button"
                onClick={handleCreateTag}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted hover:bg-muted/80 text-foreground"
              >
                Add Tag
              </button>
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Participants</label>
              <button
                type="button"
                onClick={handleAddParticipant}
                className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Person</span>
              </button>
            </div>

            <div className="space-y-2 max-h-44 overflow-y-auto">
              {participants.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={p.name}
                    onChange={(e) => handleParticipantChange(idx, "name", e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={p.email}
                    onChange={(e) => handleParticipantChange(idx, "email", e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(idx)}
                    className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/20 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
