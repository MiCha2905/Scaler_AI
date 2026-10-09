"use client";

import React, { useState, useRef, useCallback } from "react";
import { formatTime } from "@/lib/utils";

interface SeekBarProps {
  currentTime: number;
  duration: number;
  onSeek: (sec: number) => void;
  disabled?: boolean;
}

export function SeekBar({ currentTime, duration, onSeek, disabled = false }: SeekBarProps) {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [hoverTime, setHoverTime] = useState<number>(0);
  const [hoverPosPercent, setHoverPosPercent] = useState<number>(0);
  const barRef = useRef<HTMLDivElement>(null);

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!barRef.current || duration <= 0) return;
      const rect = barRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = Math.min(1, Math.max(0, clickX / rect.width));
      setHoverTime(pct * duration);
      setHoverPosPercent(pct * 100);
    },
    [duration]
  );

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !barRef.current || duration <= 0) return;
    const rect = barRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.min(1, Math.max(0, clickX / rect.width));
    onSeek(pct * duration);
  };

  return (
    <div
      ref={barRef}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      className={`relative py-3 group cursor-pointer ${disabled ? "opacity-40 pointer-events-none" : ""}`}
    >
      {/* Background Track */}
      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden transition-all group-hover:h-2">
        {/* Progress Fill */}
        <div
          className="h-full bg-brand-500 rounded-full transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Scrubber Thumb */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-brand-500 rounded-full shadow-md ring-2 ring-white dark:ring-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ left: `${progressPercent}%` }}
      />

      {/* Hover Tooltip */}
      {isHovered && duration > 0 && (
        <div
          className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-mono shadow-md pointer-events-none animate-in fade-in zoom-in-95"
          style={{ left: `${hoverPosPercent}%` }}
        >
          {formatTime(hoverTime)}
        </div>
      )}
    </div>
  );
}
