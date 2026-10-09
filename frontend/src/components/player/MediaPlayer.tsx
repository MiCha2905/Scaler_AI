"use client";

import React, { useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Sparkles,
  Loader2,
  Radio,
} from "lucide-react";
import { SeekBar } from "./SeekBar";
import { formatTime } from "@/lib/utils";

interface MediaPlayerProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isRealAudio?: boolean;
  hasAudio?: boolean;
  disabled?: boolean;
  isGeneratingAudio?: boolean;
  onGenerateAudio?: () => void;
  onTogglePlay: () => void;
  onSeek: (sec: number) => void;
  onSkipForward: (sec?: number) => void;
  onSkipBackward: (sec?: number) => void;
}

export function MediaPlayer({
  currentTime,
  duration,
  isPlaying,
  isRealAudio = false,
  hasAudio = true,
  disabled = false,
  isGeneratingAudio = false,
  onGenerateAudio,
  onTogglePlay,
  onSeek,
  onSkipForward,
  onSkipBackward,
}: MediaPlayerProps) {
  // Global Keyboard shortcuts (disabled if audio is not generated or player is locked)
  useEffect(() => {
    if (!hasAudio || disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        onTogglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        onSkipBackward(5);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        onSkipForward(5);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasAudio, disabled, onTogglePlay, onSkipForward, onSkipBackward]);

  const isBlurred = !hasAudio && duration > 0;

  return (
    <div className="sticky top-16 z-20 bg-card/95 backdrop-blur-md border-b border-border/80 px-4 sm:px-6 py-3 shadow-sm relative overflow-hidden">
      {/* Blurred Overlay when Audio is not generated */}
      {isBlurred && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-card/75 dark:bg-card/85 backdrop-blur-[5px] px-4">
          <div className="flex flex-wrap items-center justify-center gap-3 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Sparkles className="w-4 h-4 text-brand-500 animate-pulse" />
              <span>Audio track not generated for this transcript</span>
            </div>

            {onGenerateAudio && (
              <button
                onClick={onGenerateAudio}
                disabled={isGeneratingAudio}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md shadow-brand-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100 cursor-pointer"
              >
                {isGeneratingAudio ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Multi-Speaker Audio...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Generate Audio Track</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Player Bar (blurred and non-interactive if isBlurred) */}
      <div
        className={`max-w-7xl mx-auto flex flex-col gap-1.5 transition-all duration-300 ${
          isBlurred ? "filter blur-[3px] opacity-40 pointer-events-none select-none" : ""
        }`}
      >
        {/* Seek Bar */}
        <SeekBar
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
          disabled={disabled || duration <= 0 || isBlurred}
        />

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          {/* Left: Play/Pause and Skip buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSkipBackward(5)}
              disabled={disabled || duration <= 0 || isBlurred}
              title="Skip back 5 seconds (Left Arrow)"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors disabled:opacity-30 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={onTogglePlay}
              disabled={disabled || duration <= 0 || isBlurred}
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              className="w-10 h-10 rounded-xl bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => onSkipForward(5)}
              disabled={disabled || duration <= 0 || isBlurred}
              title="Skip forward 5 seconds (Right Arrow)"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors disabled:opacity-30 cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Time Stamp & Progress Stats */}
            <div className="ml-3 flex items-center gap-2">
              <div className="font-mono text-xs font-semibold text-foreground flex items-center gap-1">
                <span>{formatTime(currentTime)}</span>
                <span className="text-muted-foreground font-normal">/ {formatTime(duration)}</span>
              </div>
              {duration > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                  <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
                  <span className="text-border">|</span>
                  <span className="text-brand-600 dark:text-brand-400 font-semibold">
                    {Math.min(100, Math.round((currentTime / duration) * 100))}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Engine mode indicator */}
          <div className="flex items-center gap-2">
            {disabled || duration <= 0 ? (
              <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                No Audio Track
              </span>
            ) : isRealAudio ? (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Real Audio</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2.5 py-1 rounded-lg">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Simulated Clock</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

