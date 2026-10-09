"use client";

import React, { useState } from "react";
import { Plus, CheckSquare, Loader2 } from "lucide-react";
import { ActionItem, Participant } from "@/types/api";
import { ActionItemRow } from "./ActionItemRow";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface ActionItemListProps {
  meetingId: number;
  initialItems: ActionItem[];
  participants: Participant[];
}

export function ActionItemList({ meetingId, initialItems, participants }: ActionItemListProps) {
  const { showToast } = useToast();
  const [items, setItems] = useState<ActionItem[]>(initialItems);
  const [newText, setNewText] = useState<string>("");
  const [newAssigneeId, setNewAssigneeId] = useState<string>("");
  const [newDueDate, setNewDueDate] = useState<string>("");
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Completed stats
  const completedCount = items.filter((i) => i.is_completed).length;
  const progressPct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const handleToggleComplete = async (id: number, currentCompleted: boolean) => {
    // 1. Optimistic Update
    const previousItems = [...items];
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, is_completed: !currentCompleted } : it))
    );

    try {
      // 2. Persist to API
      const updated = await api.updateActionItem(id, { is_completed: !currentCompleted });
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    } catch (err: any) {
      // 3. Rollback on failure
      setItems(previousItems);
      showToast(err.message || "Failed to update action item status", "error");
    }
  };

  const handleUpdateAssignee = async (id: number, assigneeId: number | null) => {
    try {
      const updated = await api.updateActionItem(id, { assignee_id: assigneeId });
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      showToast("Assignee updated", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to update assignee", "error");
    }
  };

  const handleDelete = async (id: number) => {
    const previousItems = [...items];
    setItems((prev) => prev.filter((it) => it.id !== id));

    try {
      await api.deleteActionItem(id);
      showToast("Action item deleted", "success");
    } catch (err: any) {
      setItems(previousItems);
      showToast(err.message || "Failed to delete action item", "error");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    setSubmitting(true);
    try {
      const created = await api.createActionItem(meetingId, {
        text: newText.trim(),
        assignee_id: newAssigneeId ? Number(newAssigneeId) : null,
        due_date: newDueDate || null,
      });

      setItems([...items, created]);
      showToast("Action item added", "success");
      setNewText("");
      setNewAssigneeId("");
      setNewDueDate("");
      setIsAdding(false);
    } catch (err: any) {
      showToast(err.message || "Failed to add action item", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      {items.length > 0 && (
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-foreground flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-brand-500" />
              <span>
                Progress ({completedCount} of {items.length} completed)
              </span>
            </span>
            <span className="text-muted-foreground">{progressPct}%</span>
          </div>

          <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Items List */}
      <div className="space-y-2">
        {items.length === 0 && !isAdding ? (
          <div className="py-8 text-center text-muted-foreground space-y-1">
            <CheckSquare className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs font-medium">No action items identified</p>
          </div>
        ) : (
          items.map((item) => (
            <ActionItemRow
              key={item.id}
              item={item}
              participants={participants}
              onToggleComplete={handleToggleComplete}
              onUpdateAssignee={handleUpdateAssignee}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Add New Action Item CTA / Form */}
      {isAdding ? (
        <form onSubmit={handleCreateSubmit} className="p-3.5 rounded-xl border border-brand-500/50 bg-card space-y-3 shadow-sm animate-in fade-in">
          <input
            type="text"
            required
            autoFocus
            placeholder="Action item task description..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={newAssigneeId}
              onChange={(e) => setNewAssigneeId(e.target.value)}
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-background dark:bg-[#181537] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500/30 cursor-pointer shadow-sm"
            >
              <option value="" className="bg-white dark:bg-[#181537] text-slate-900 dark:text-slate-100 font-medium">Select Assignee</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id} className="bg-white dark:bg-[#181537] text-slate-900 dark:text-slate-100 font-medium">
                  {p.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="px-2 py-1 text-xs font-medium rounded-lg border border-border bg-background dark:bg-[#181537] text-slate-800 dark:text-slate-100 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white shadow-xs disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Add Item</span>
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-dashed border-border hover:border-brand-500/60 text-xs font-semibold text-muted-foreground hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-950/30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Action Item</span>
        </button>
      )}
    </div>
  );
}
