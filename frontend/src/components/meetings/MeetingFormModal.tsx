"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  FileText,
  UploadCloud,
  FileCode,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface MeetingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MeetingFormModal({ isOpen, onClose, onSuccess }: MeetingFormModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"form" | "paste" | "upload">("form");

  // Form State
  const [title, setTitle] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 16));
  const [participants, setParticipants] = useState<{ name: string; email: string }[]>([
    { name: "", email: "" },
  ]);
  const [transcriptText, setTranscriptText] = useState<string>("");

  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Loading & Error State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddParticipantRow = () => {
    setParticipants([...participants, { name: "", email: "" }]);
  };

  const handleRemoveParticipantRow = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleParticipantChange = (index: number, field: "name" | "email", val: string) => {
    const updated = [...participants];
    updated[index][field] = val;
    setParticipants(updated);
  };

  const resetForm = () => {
    setTitle("");
    setDate(new Date().toISOString().slice(0, 16));
    setParticipants([{ name: "", email: "" }]);
    setTranscriptText("");
    setSelectedFile(null);
    setError(null);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (activeTab === "form" || activeTab === "paste") {
      if (!title.trim()) {
        setError("Meeting title is required");
        return;
      }

      setLoading(true);
      try {
        const validParticipants = participants
          .filter((p) => p.name.trim().length > 0)
          .map((p) => ({
            name: p.name.trim(),
            email: p.email.trim() || undefined,
          }));

        const result = await api.createMeeting({
          title: title.trim(),
          date: date ? new Date(date).toISOString() : undefined,
          participants: validParticipants.length > 0 ? validParticipants : undefined,
          transcript_text: activeTab === "paste" ? transcriptText : undefined,
        });

        showToast("Meeting created successfully", "success");
        resetForm();
        if (onSuccess) onSuccess();
        onClose();
        router.push(`/meetings/${result.id}`);
      } catch (err: any) {
        setError(err.message || "Failed to create meeting");
        showToast(err.message || "Failed to create meeting", "error");
      } finally {
        setLoading(false);
      }
    } else if (activeTab === "upload") {
      if (!selectedFile) {
        setError("Please select a transcript file (.vtt, .txt, or .json)");
        return;
      }

      setLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        if (title.trim()) formData.append("title", title.trim());
        if (date) formData.append("date", new Date(date).toISOString());

        const result = await api.uploadMeeting(formData);

        showToast("Transcript parsed and meeting created!", "success");
        resetForm();
        if (onSuccess) onSuccess();
        onClose();
        router.push(`/meetings/${result.id}`);
      } catch (err: any) {
        setError(err.message || "Failed to upload transcript file");
        showToast(err.message || "Failed to upload transcript file", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">New Meeting</h2>
              <p className="text-xs text-muted-foreground">
                Create a meeting, paste a transcript, or upload an audio log
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-border bg-muted/30 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={cn(
              "flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold transition-colors",
              activeTab === "form"
                ? "border-brand-500 text-brand-600 dark:text-brand-400 bg-card/60 rounded-t-lg"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="w-4 h-4" />
            <span>Meeting Details</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("paste")}
            className={cn(
              "flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold transition-colors",
              activeTab === "paste"
                ? "border-brand-500 text-brand-600 dark:text-brand-400 bg-card/60 rounded-t-lg"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <FileCode className="w-4 h-4" />
            <span>Paste Transcript</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={cn(
              "flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold transition-colors",
              activeTab === "upload"
                ? "border-brand-500 text-brand-600 dark:text-brand-400 bg-card/60 rounded-t-lg"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload File (.vtt, .txt, .json)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Common Fields: Title and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Meeting Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q4 Growth & Revenue Review"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Meeting Date & Time
              </label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Tab 1: Form Tab (Participants) */}
          {activeTab === "form" && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Meeting Participants
                </label>
                <button
                  type="button"
                  onClick={handleAddParticipantRow}
                  className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Person</span>
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                {participants.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Full Name (e.g. Alex Rivera)"
                      value={p.name}
                      onChange={(e) => handleParticipantChange(idx, "name", e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    />
                    <input
                      type="email"
                      placeholder="Email (optional)"
                      value={p.email}
                      onChange={(e) => handleParticipantChange(idx, "email", e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    />
                    {participants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipantRow(idx)}
                        className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Paste Transcript Tab */}
          {activeTab === "paste" && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Transcript Text (WebVTT or Speaker lines)
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Auto-extracts speakers & timestamps
                </span>
              </div>
              <textarea
                rows={7}
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                placeholder={`Alex: Let's discuss the Q4 architecture roadmap.\nSarah: I'll finish the security audit spec by tomorrow.\nElena: Great, I will share the Figma prototypes on Friday.`}
                className="w-full p-3 font-mono text-xs rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/30 leading-relaxed"
              />
            </div>
          )}

          {/* Tab 3: Upload File Tab */}
          {activeTab === "upload" && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Upload File (Max 2MB)
              </label>
              <div
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById("file-upload-input")?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3",
                  dragActive
                    ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/50 scale-[0.99]"
                    : "border-border hover:border-brand-500/60 bg-muted/20"
                )}
              >
                <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-300 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  {selectedFile ? (
                    <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                      {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-foreground">
                        Drag and drop your file here, or{" "}
                        <span className="text-brand-600 dark:text-brand-400 font-semibold underline">
                          browse
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Supports .vtt (WebVTT), .txt, and .json transcripts
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="file-upload-input"
                  type="file"
                  accept=".vtt,.txt,.json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setSelectedFile(file);
                      if (!title) {
                        setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/25 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {activeTab === "upload"
                  ? "Upload & Process"
                  : activeTab === "paste"
                  ? "Process Transcript"
                  : "Create Meeting"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
