"use client";

import React, { useState } from "react";
import { UserMinus, Loader2 } from "lucide-react";

interface UnlinkConfirmDialogProps {
  isOpen: boolean;
  participantName: string;
  affectedCount?: number;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function UnlinkConfirmDialog({
  isOpen,
  participantName,
  affectedCount = 0,
  onConfirm,
  onClose,
}: UnlinkConfirmDialogProps) {
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <UserMinus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Remove Participant</h3>
            <p className="text-xs text-muted-foreground">Unlinking from this meeting</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Removing <strong className="text-foreground">{participantName}</strong> from this meeting will
          set their assigned action items and speaker references to{" "}
          <span className="font-semibold text-foreground">Unassigned</span>. The transcript text and
          speaker labels will remain intact. Continue?
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Confirm Removal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
