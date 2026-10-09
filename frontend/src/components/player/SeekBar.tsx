"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { formatTime } from "@/lib/utils";

interface SeekBarProps {
  currentTime: number;
  duration: number;
  onSeek: (sec: number) => void;
  disabled?: boolean;
}

export function SeekBar({ currentTime, duration, onSeek, disabled = false }: SeekBarProps) {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hoverTime, setHoverTime] = useState<number>(0);
  const [hoverPosPercent, setHoverPosPercent] = useState<number>(0);
  const barRef = useRef<HTMLDivElement>(null);

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const calculateTimeFromEvent = useCallback(
    (clientX: number): { time: number; percent: number } => {
      if (!barRef.current || duration <= 0) return { time: 0, percent: 0 };
      const rect = barRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const pct = Math.min(1, Math.max(0, clickX / rect.width));
      return { time: pct * duration, percent: pct * 100 };
    },
    [duration]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    const { time, percent } = calculateTimeFromEvent(e.clientX);
    setHoverTime(time);
    setHoverPosPercent(percent);
    onSeek(time);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return;
    const { time, percent } = calculateTimeFromEvent(e.clientX);
    setHoverTime(time);
    setHoverPosPercent(percent);
    if (isDragging) {
      onSeek(time);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      setIsDragging(false);
    }
  };

  return (
    <div
      ref={barRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!isDragging) setIsHovered(false);
      }}
      className={`relative py-2.5 group cursor-pointer select-none touch-none ${
        disabled ? "opacity-40 pointer-events-none" : ""
      }`}
    >
      {/* Background Track */}
      <div className="h-2 w-full bg-slate-200/90 dark:bg-slate-800/90 rounded-full overflow-hidden shadow-inner group-hover:h-2.5 transition-all duration-150">
        {/* Progress Fill (NO CSS transitions on width for real-time 60fps tracking) */}
        <div
          className="h-full bg-gradient-to-r from-brand-600 to-brand-500 dark:from-brand-500 dark:to-brand-400 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Scrubber Thumb (Always visibly rendered so user sees exact position) */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-brand-600 dark:bg-brand-400 rounded-full shadow-md ring-2 ring-white dark:ring-slate-900 pointer-events-none group-hover:scale-125 transition-transform duration-100"
        style={{ left: `${progressPercent}%` }}
      />

      {/* Hover / Drag Tooltip */}
      {(isHovered || isDragging) && duration > 0 && (
        <div
          className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 text-[11px] font-mono font-semibold shadow-lg pointer-events-none animate-in fade-in zoom-in-95 z-30"
          style={{ left: `${isDragging ? hoverPosPercent : hoverPosPercent}%` }}
        >
          {formatTime(hoverTime)}
        </div>
      )}
    </div>
  );
}
