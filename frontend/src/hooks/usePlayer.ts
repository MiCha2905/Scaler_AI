"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PlaybackEngine, SimulatedEngine, AudioEngine } from "@/lib/playback/engine";
import { TranscriptSegment } from "@/types/api";

export function findActiveSegmentIndex(segments: TranscriptSegment[], currentTime: number): number {
  if (!segments || segments.length === 0) return -1;
  if (currentTime < segments[0].start_sec) return 0;

  // Binary search
  let low = 0;
  let high = segments.length - 1;
  let result = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const seg = segments[mid];

    if (currentTime >= seg.start_sec) {
      result = mid;
      low = mid + 1; // Try to find a later matching segment
    } else {
      high = mid - 1;
    }
  }

  return result;
}

export function usePlayer(
  durationSec: number,
  audioUrl?: string | null,
  segments: TranscriptSegment[] = []
) {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);

  const engineRef = useRef<PlaybackEngine | null>(null);
  const segmentsRef = useRef<TranscriptSegment[]>(segments);
  segmentsRef.current = segments;

  useEffect(() => {
    // Instantiate appropriate engine
    if (audioUrl) {
      engineRef.current = new AudioEngine(audioUrl, durationSec);
    } else {
      engineRef.current = new SimulatedEngine(durationSec);
    }

    const unsubscribe = engineRef.current.subscribe((time, playing) => {
      setCurrentTime(time);
      setIsPlaying(playing);

      const activeIdx = findActiveSegmentIndex(segmentsRef.current, time);
      setActiveSegmentIndex(activeIdx);
    });

    return () => {
      unsubscribe();
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [durationSec, audioUrl]);

  const play = useCallback(() => {
    engineRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      engineRef.current?.pause();
    } else {
      engineRef.current?.play();
    }
  }, [isPlaying]);

  const seek = useCallback((sec: number) => {
    engineRef.current?.seek(sec);
    setCurrentTime(sec);
    const activeIdx = findActiveSegmentIndex(segmentsRef.current, sec);
    setActiveSegmentIndex(activeIdx);
  }, []);

  const skipForward = useCallback(
    (sec: number = 5) => {
      if (!engineRef.current) return;
      const t = engineRef.current.getTime();
      engineRef.current.seek(t + sec);
    },
    []
  );

  const skipBackward = useCallback(
    (sec: number = 5) => {
      if (!engineRef.current) return;
      const t = engineRef.current.getTime();
      engineRef.current.seek(Math.max(0, t - sec));
    },
    []
  );

  return {
    currentTime,
    isPlaying,
    activeSegmentIndex,
    play,
    pause,
    togglePlay,
    seek,
    skipForward,
    skipBackward,
  };
}
