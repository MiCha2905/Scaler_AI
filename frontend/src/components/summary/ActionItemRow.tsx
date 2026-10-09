"use client";

import React, { useState } from "react";
import { Check, Trash2, Calendar, User, CheckCircle2, Circle } from "lucide-react";
import { ActionItem, Participant } from "@/types/api";
import { getAvatarColor, getInitials } from "@/lib/utils";

interface ActionItemRowProps {
  item: ActionItem;
  participants: Participant[];
  onToggleComplete: (id: number, currentCompleted: boolean) => Promise<void>;
  onUpdateAssignee: (id: number, assigneeId: number | null) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function ActionItemRow({
  item,
  participants,
  onToggleComplete,
  onUpdateAssignee,
  onDelete,
}: ActionItemRowProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [assigneeSelectOpen, setAssigneeSelectOpen] = useState<boolean>(false);

  const handleCheckboxClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onToggleComplete(item.id, item.is_completed);
    } finally {
      setLoading(false);
    }
  };

  const currentAssignee = item.assignee;
  const avatarStyle = currentAssignee ? getAvatarColor(currentAssignee.name) : null;

  return (
    <div
      className={`group p-3 rounded-xl border transition-all flex items-start gap-3 ${
        item.is_completed
          ? "bg-muted/20 border-border/40 opacity-70"
          : "bg-card border-border/80 hover:border-brand-500/30 hover:shadow-xs"
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={handleCheckboxClick}
        disabled={loading}
        className="mt-0.5 text-muted-foreground hover:text-brand-600 transition-colors shrink-0"
      >
        {item.is_completed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950/80" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground/60 hover:text-brand-500" />
        )}
      </button>

      {/* Action Item Text & Meta */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <p
          className={`text-xs font-medium leading-relaxed ${
            item.is_completed ? "line-through text-muted-foreground" : "text-foreground"
          }`}
        >
          {item.text}
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <div className="relative">
            <select
              value={item.assignee_id || ""}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                onUpdateAssignee(item.id, val);
              }}
              className="text-[11px] font-semibold pl-2 pr-6 py-0.5 rounded-lg border border-border bg-background dark:bg-[#181537] text-slate-800 dark:text-slate-100 hover:border-brand-500/50 focus:outline-none focus:ring-1 focus:ring-brand-500/30 cursor-pointer shadow-sm"
            >
              <option value="" className="bg-white dark:bg-[#181537] text-slate-900 dark:text-slate-100 font-medium">Unassigned</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id} className="bg-white dark:bg-[#181537] text-slate-900 dark:text-slate-100 font-medium">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          {item.due_date && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md">
              <Calendar className="w-3 h-3" />
              <span>{item.due_date}</span>
            </div>
          )}
        </div>
      </div>

      {/* Delete Button */}
      <button
        onClick={() => onDelete(item.id)}
        title="Delete action item"
        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-500 rounded-md transition-opacity"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
