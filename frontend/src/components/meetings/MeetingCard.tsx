"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Clock,
  Calendar,
  CheckSquare,
  MoreVertical,
  Edit2,
  Trash2,
  Download,
  FileText,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { MeetingListItem } from "@/types/api";
import { formatDuration, formatRelativeDate, getAvatarColor, getInitials } from "@/lib/utils";
import { api } from "@/lib/api";

interface MeetingCardProps {
  meeting: MeetingListItem;
  onEdit?: (m: MeetingListItem) => void;
  onDelete?: (m: MeetingListItem) => void;
}

export function MeetingCard({ meeting, onEdit, onDelete }: MeetingCardProps) {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  const sourceLabels = {
    seed: { text: "Seed", color: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300" },
    upload: { text: "Uploaded", color: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300" },
    manual: { text: "Manual", color: "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300" },
  };

  const sourceBadge = sourceLabels[meeting.source as keyof typeof sourceLabels] || sourceLabels.manual;

  return (
    <div className="group relative bg-card border border-border/80 hover:border-brand-500/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Card Header: Source & Action Menu */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${sourceBadge.color}`}>
              {sourceBadge.text}
            </span>
            {meeting.has_transcript ? (
              <span className="flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-400 font-medium bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded-md">
                <Sparkles className="w-3 h-3" />
                <span>AI Synced</span>
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                No transcript
              </span>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-50 w-48 bg-white dark:bg-[#181537] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1.5 animate-in fade-in zoom-in-95 ring-1 ring-black/5 dark:ring-white/10">
                  {onEdit && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(meeting);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#25224e] hover:text-slate-900 dark:hover:text-white transition-colors text-left"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Edit Details</span>
                    </button>
                  )}
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
                  {onDelete && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(meeting);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors text-left border-t border-slate-100 dark:border-slate-800/80 mt-1 pt-2"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Delete Meeting</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <Link href={`/meetings/${meeting.id}`} className="block group/link">
          <h3 className="text-base font-bold text-foreground group-hover/link:text-brand-600 dark:group-hover/link:text-brand-400 transition-colors line-clamp-2 leading-snug">
            {meeting.title}
          </h3>
        </Link>

        {/* Tags */}
        {meeting.tags && meeting.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {meeting.tags.map((t) => (
              <span
                key={t.id}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground"
              >
                #{t.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between gap-2">
        {/* Participants Avatars */}
        <div className="flex items-center -space-x-2 overflow-hidden">
          {meeting.participants.slice(0, 4).map((p) => {
            const palette = getAvatarColor(p.name);
            return (
              <div
                key={p.id}
                title={p.name}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-card ${palette.bg} ${palette.text}`}
              >
                {getInitials(p.name)}
              </div>
            );
          })}
          {meeting.participants.length > 4 && (
            <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-semibold ring-2 ring-card">
              +{meeting.participants.length - 4}
            </div>
          )}
        </div>

        {/* Meta Pills */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1" title="Duration">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDuration(meeting.duration_sec)}</span>
          </div>

          <div className="flex items-center gap-1" title="Date">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatRelativeDate(meeting.date)}</span>
          </div>

          {meeting.action_items_count > 0 && (
            <div className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-medium" title="Action Items">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{meeting.action_items_count}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
