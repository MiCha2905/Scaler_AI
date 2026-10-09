export interface PlaybackEngine {
  play(): void;
  pause(): void;
  seek(sec: number): void;
  getTime(): number;
  isPlaying(): boolean;
  subscribe(callback: (timeSec: number, isPlaying: boolean) => void): () => void;
  destroy(): void;
}

export class SimulatedEngine implements PlaybackEngine {
  private durationSec: number;
  private currentTimeSec: number = 0;
  private playing: boolean = false;
  private startedAtPerf: number = 0;
  private startOffsetSec: number = 0;
  private rafId: number | null = null;
  private listeners: Set<(timeSec: number, isPlaying: boolean) => void> = new Set();

  constructor(durationSec: number) {
    this.durationSec = Math.max(0, durationSec);
  }

  play(): void {
    if (this.playing || this.durationSec <= 0) return;
    if (this.currentTimeSec >= this.durationSec) {
      this.currentTimeSec = 0;
    }
    this.playing = true;
    this.startOffsetSec = this.currentTimeSec;
    this.startedAtPerf = performance.now();
    this.notify();
    this.loop();
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    // Finalize current time from elapsed performance.now()
    const elapsed = (performance.now() - this.startedAtPerf) / 1000;
    this.currentTimeSec = Math.min(this.durationSec, this.startOffsetSec + elapsed);
    this.notify();
  }

  seek(sec: number): void {
    const clamped = Math.max(0, Math.min(this.durationSec, sec));
    this.currentTimeSec = clamped;
    if (this.playing) {
      this.startOffsetSec = clamped;
      this.startedAtPerf = performance.now();
    }
    this.notify();
  }

  getTime(): number {
    if (this.playing) {
      const elapsed = (performance.now() - this.startedAtPerf) / 1000;
      return Math.min(this.durationSec, this.startOffsetSec + elapsed);
    }
    return this.currentTimeSec;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  subscribe(callback: (timeSec: number, isPlaying: boolean) => void): () => void {
    this.listeners.add(callback);
    callback(this.getTime(), this.playing);
    return () => {
      this.listeners.delete(callback);
    };
  }

  destroy(): void {
    this.pause();
    this.listeners.clear();
  }

  private loop = (): void => {
    if (!this.playing) return;
    const now = performance.now();
    const elapsed = (now - this.startedAtPerf) / 1000;
    const t = this.startOffsetSec + elapsed;

    if (t >= this.durationSec) {
      this.currentTimeSec = this.durationSec;
      this.playing = false;
      this.notify();
      return;
    }

    this.currentTimeSec = t;
    this.notify();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private notify(): void {
    const t = this.currentTimeSec;
    const p = this.playing;
    this.listeners.forEach((cb) => cb(t, p));
  }
}

function resolveAudioUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) {
    return url;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
  const backendRoot = apiBase.replace(/\/api\/?$/, "");
  return `${backendRoot}${url.startsWith("/") ? "" : "/"}${url}`;
}

export class AudioEngine implements PlaybackEngine {
  private audio: HTMLAudioElement;
  private durationSec: number;
  private playing: boolean = false;
  private rafId: number | null = null;
  private listeners: Set<(timeSec: number, isPlaying: boolean) => void> = new Set();

  constructor(audioUrl: string, durationSec: number) {
    const fullUrl = resolveAudioUrl(audioUrl);
    this.audio = new Audio(fullUrl);
    this.durationSec = durationSec;

    this.audio.addEventListener("play", () => {
      this.playing = true;
      this.notify();
      this.startPolling();
    });

    this.audio.addEventListener("pause", () => {
      this.playing = false;
      this.stopPolling();
      this.notify();
    });

    this.audio.addEventListener("ended", () => {
      this.playing = false;
      this.stopPolling();
      this.notify();
    });
  }

  play(): void {
    this.audio.play().catch(() => {});
  }

  pause(): void {
    this.audio.pause();
  }

  seek(sec: number): void {
    this.audio.currentTime = Math.max(0, Math.min(this.durationSec, sec));
    this.notify();
  }

  getTime(): number {
    return this.audio.currentTime || 0;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  subscribe(callback: (timeSec: number, isPlaying: boolean) => void): () => void {
    this.listeners.add(callback);
    callback(this.getTime(), this.playing);
    return () => {
      this.listeners.delete(callback);
    };
  }

  destroy(): void {
    this.pause();
    this.stopPolling();
    this.listeners.clear();
    this.audio.src = "";
  }

  private startPolling(): void {
    const poll = () => {
      if (!this.playing) return;
      this.notify();
      this.rafId = requestAnimationFrame(poll);
    };
    this.rafId = requestAnimationFrame(poll);
  }

  private stopPolling(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private notify(): void {
    const t = this.audio.currentTime || 0;
    const p = this.playing;
    this.listeners.forEach((cb) => cb(t, p));
  }
}
