import { audioReady } from "./audio-ready.js";
import {
  prepareBufferedMusic,
  type BufferedMusic,
  type MusicFallbackReason,
} from "./buffered-music.js";
import { HitQueue, type ChartTiming } from "./timing.js";

/** Hit-sound grouping window in milliseconds. */
export const HIT_SOUND_DEBOUNCE_MS = 7;

export type TransportSnapshot = {
  position: number;
  duration: number;
  state: "paused" | "playing" | "buffering";
  musicUnavailable: boolean;
  needsContinuation: boolean;
  soundUnavailable: boolean;
};

export type TransportOptions = {
  timing: ChartTiming;
  hits: number[];
  musicUrl?: string;
  musicMode?: "streaming" | "auto";
  tapUrl: string;
  refreshMusic?: () => Promise<string | undefined>;
  onChange: (snapshot: TransportSnapshot) => void;
  onError: (error: unknown) => void;
};

export type TransportDiagnostics = Readonly<{
  backend: "buffered" | "streaming" | "silent" | "preparing";
  fallbackReason?: MusicFallbackReason;
  baseLatency?: number;
  outputLatency?: number;
  sampleRate?: number;
  decodedBytes: number;
}>;

/** Streaming stays compatible; automatic playback shares one clock for decoded music and hits. */
export class ChartTransport {
  private readonly media = new Audio();
  private readonly queue: HitQueue;
  private context?: AudioContext;
  private musicGain?: GainNode;
  private hitGain?: GainNode;
  private mediaSource?: MediaElementAudioSourceNode;
  private mediaConnected = false;
  private tap?: AudioBuffer;
  private tapLoading?: Promise<void>;
  private readonly requests = new AbortController();
  private readonly scheduled = new Set<AudioBufferSourceNode>();
  private hitWindowEnd = -Infinity;
  private timer?: ReturnType<typeof setInterval>;
  private anchorPosition = 0;
  private anchorTime = 0;
  private state: TransportSnapshot["state"] = "paused";
  private rate = 1;
  private musicVolume = 0.85;
  private hitVolume = 0.5;
  private musicUnavailable: boolean;
  private soundUnavailable = false;
  private needsContinuation = false;
  private disposed = false;
  private generation = 0;
  private refreshing = false;
  private refreshed = false;
  private startingMedia = false;
  private unlocked = false;
  private buffered?: BufferedMusic;
  private musicLoading?: Promise<BufferedMusic>;
  private preparing = false;
  private musicSource?: AudioBufferSourceNode;
  private lastPresentation = 0;

  private readonly options: TransportOptions;
  constructor(options: TransportOptions) {
    this.options = options;
    this.queue = new HitQueue(options.hits);
    this.musicUnavailable = !options.musicUrl;
    this.media.crossOrigin = "anonymous";
    this.media.preload = "metadata";
    this.media.preservesPitch = true;
    this.media.addEventListener("loadedmetadata", this.emit);
    this.media.addEventListener("waiting", this.onWaiting);
    this.media.addEventListener("seeking", this.onWaiting);
    this.media.addEventListener("seeked", this.onPlaying);
    this.media.addEventListener("playing", this.onPlaying);
    this.media.addEventListener("ended", this.onEnded);
    this.media.addEventListener("error", this.onMediaError);
    if (options.musicUrl) this.media.src = options.musicUrl;
  }

  get duration() {
    return this.options.timing.chartEnd;
  }

  get position(): number {
    if (this.state !== "playing" || !this.context) return this.anchorPosition;
    if (
      !this.usesBuffer &&
      !this.musicUnavailable &&
      !this.media.paused &&
      !this.media.ended &&
      !this.startingMedia
    ) {
      return Math.min(this.duration, this.options.timing.audioStart + this.media.currentTime);
    }
    return Math.min(
      this.duration,
      this.anchorPosition + Math.max(0, this.context.currentTime - this.anchorTime) * this.rate,
    );
  }

  private get usesBuffer() {
    return !this.musicUnavailable && this.rate === 1 && !!this.buffered?.buffer;
  }

  get diagnostics(): TransportDiagnostics {
    const buffer = this.buffered?.buffer;
    let backend: TransportDiagnostics["backend"] = "streaming";
    if (this.preparing) {
      backend = "preparing";
    } else if (this.musicUnavailable) {
      backend = "silent";
    } else if (this.usesBuffer) {
      backend = "buffered";
    }

    return {
      backend,
      fallbackReason:
        this.options.musicMode === "auto" && this.rate !== 1
          ? "rate"
          : this.buffered?.fallbackReason,
      baseLatency: this.context?.baseLatency,
      outputLatency: this.context?.outputLatency,
      sampleRate: this.context?.sampleRate,
      decodedBytes: buffer ? buffer.length * buffer.numberOfChannels * 4 : 0,
    };
  }

  get presentationPosition(): number {
    if (this.state !== "playing" || !this.context) return this.anchorPosition;
    const context = this.context;
    let outputTime = context.currentTime;
    const timestamp = context.getOutputTimestamp?.();
    const now = performance.now();
    if (
      timestamp &&
      Number.isFinite(timestamp.contextTime) &&
      timestamp.contextTime! > 0 &&
      Number.isFinite(timestamp.performanceTime) &&
      timestamp.performanceTime! > 0 &&
      now - timestamp.performanceTime! >= 0 &&
      now - timestamp.performanceTime! < 1000
    ) {
      outputTime = timestamp.contextTime! + (now - timestamp.performanceTime!) / 1000;
    } else {
      const latency = [context.baseLatency, context.outputLatency].reduce(
        (sum, value) => sum + (Number.isFinite(value) && value >= 0 ? value : 0),
        0,
      );
      outputTime -= latency;
    }
    outputTime = Math.min(context.currentTime, outputTime);
    const position =
      this.usesBuffer || this.musicUnavailable || this.media.ended
        ? this.anchorPosition + Math.max(0, outputTime - this.anchorTime) * this.rate
        : this.position - Math.max(0, context.currentTime - outputTime) * this.rate;
    this.lastPresentation = Math.max(this.lastPresentation, Math.min(this.duration, position));
    return this.lastPresentation;
  }

  snapshot(): TransportSnapshot {
    return {
      position: this.position,
      duration: this.duration,
      state: this.state,
      musicUnavailable: this.musicUnavailable,
      needsContinuation: this.needsContinuation,
      soundUnavailable: this.soundUnavailable,
    };
  }

  private readonly emit = () => {
    if (!this.disposed) this.options.onChange(this.snapshot());
  };

  private anchor(position: number) {
    this.anchorPosition = position;
    this.anchorTime = this.context?.currentTime ?? 0;
    this.lastPresentation = position;
  }

  private cancelSounds() {
    for (const source of this.scheduled) {
      source.stop();
      source.disconnect();
    }
    this.scheduled.clear();
    this.hitWindowEnd = -Infinity;
  }

  private initialize() {
    if (this.context) return;
    this.context = new AudioContext();
    this.context.addEventListener?.("statechange", this.onContextState);
    this.musicGain = this.context.createGain();
    this.hitGain = this.context.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.hitGain.gain.value = this.hitVolume;
    this.mediaSource = this.context.createMediaElementSource(this.media);
    this.connectMedia(true);
    this.musicGain.connect(this.context.destination);
    this.hitGain.connect(this.context.destination);
    this.tapLoading = fetch(this.options.tapUrl, {
      signal: AbortSignal.any([this.requests.signal, AbortSignal.timeout(30_000)]),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Hit sound unavailable.");
        return response.arrayBuffer();
      })
      .then((bytes) => this.context!.decodeAudioData(bytes))
      .then((buffer) => {
        if (!this.disposed) this.tap = buffer;
      })
      .catch(() => {
        if (!this.disposed) {
          this.soundUnavailable = true;
          this.emit();
        }
      });
  }

  async play() {
    if (this.disposed || this.state !== "paused" || this.needsContinuation) return;
    const generation = ++this.generation;
    try {
      this.initialize();
      if (this.anchorPosition >= this.duration) {
        this.cancelSounds();
        this.anchor(0);
      }
      const resume = this.context!.resume();
      if (
        this.options.musicMode === "auto" &&
        this.rate === 1 &&
        !this.musicUnavailable &&
        !this.buffered
      ) {
        await this.prepareMusic(resume, generation);
      } else if (this.unlocked) {
        this.state = "buffering";
        this.emit();
        await audioReady(resume, this.requests.signal);
      } else await this.unlock(resume, generation);
      if (this.disposed || generation !== this.generation) return;
      this.startPlayback(generation);
    } catch (error) {
      if (this.disposed || generation !== this.generation) return;
      this.pause();
      if (error instanceof DOMException && error.name === "NotSupportedError")
        this.failMusic(false);
      else this.options.onError(error);
    }
  }

  private async prepareMusic(resume: Promise<void>, generation: number) {
    this.state = "buffering";
    this.preparing = true;
    this.startingMedia = true;
    this.musicGain!.gain.value = 0;
    // Prime the fallback from the gesture too; decoded playback does not depend on its success.
    void this.media.play().catch(() => {});
    this.emit();
    this.musicLoading ??= prepareBufferedMusic(
      this.media,
      this.context!,
      this.requests.signal,
      this.renewMusic,
    );
    const [buffered] = await audioReady(
      Promise.all([this.musicLoading, resume, this.tapLoading]),
      this.requests.signal,
    );
    if (this.disposed || generation !== this.generation) return;
    this.buffered = buffered;
    this.preparing = false;
    this.media.pause();
    this.startingMedia = false;
    this.musicGain!.gain.value = this.musicVolume;
    this.unlocked = true;
  }

  private startPlayback(generation: number) {
    this.anchor(this.anchorPosition);
    this.queue.reset(this.anchorPosition);
    this.state = "playing";
    if (this.usesBuffer) {
      this.anchorTime += 0.05;
      this.startBuffer();
    } else if (
      !this.musicUnavailable &&
      this.anchorPosition >= this.options.timing.audioStart &&
      this.anchorPosition < this.musicEnd()
    ) {
      this.startMusic(this.anchorPosition, generation);
    }
    this.timer ??= setInterval(this.pump, 25);
    this.pump();
    this.emit();
  }

  private startBuffer() {
    this.connectMedia(false);
    const context = this.context!;
    const start = this.options.timing.audioStart;
    const offset = Math.max(0, this.anchorPosition - start);
    const buffer = this.buffered!.buffer!;
    if (offset >= buffer.duration || start >= this.duration) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.musicGain!);
    this.musicSource = source;
    source.onended = () => {
      source.disconnect();
      if (this.musicSource === source) this.musicSource = undefined;
    };
    source.start(this.anchorTime + Math.max(0, start - this.anchorPosition), offset);
    source.stop(this.anchorTime + this.duration - this.anchorPosition);
  }

  private connectMedia(connected: boolean) {
    if (!this.mediaSource || this.mediaConnected === connected) return;
    if (connected) this.mediaSource.connect(this.musicGain!);
    else this.mediaSource.disconnect();
    this.mediaConnected = connected;
  }

  private readonly onContextState = () => {
    if (this.context?.state !== "running" && this.state !== "paused") this.pause();
  };

  private readonly renewMusic = async () => {
    if (this.refreshed || !this.options.refreshMusic || this.disposed) return false;
    this.refreshed = true;
    const url = await this.options.refreshMusic();
    if (!url || this.disposed) return false;
    this.media.src = url;
    return true;
  };

  private async unlock(resume: Promise<void>, generation: number) {
    // Unlock from the gesture, but keep the beatmap stopped until the hit sound is decoded.
    this.state = "buffering";
    this.startingMedia = true;
    this.musicGain!.gain.value = 0;
    const priming = this.musicUnavailable ? Promise.resolve() : this.media.play();
    this.emit();
    await audioReady(Promise.all([resume, this.tapLoading, priming]), this.requests.signal);
    if (this.disposed || generation !== this.generation) return;
    this.media.pause();
    this.media.currentTime = Math.max(0, this.anchorPosition - this.options.timing.audioStart);
    this.musicGain!.gain.value = this.musicVolume;
    this.startingMedia = false;
    this.unlocked = true;
  }

  private musicEnd() {
    return Number.isFinite(this.media.duration)
      ? this.options.timing.audioStart + this.media.duration
      : Infinity;
  }

  private startMusic(position: number, generation: number) {
    this.connectMedia(true);
    this.cancelSounds();
    this.queue.reset(position);
    this.startingMedia = true;
    this.anchor(position);
    this.state = "buffering";
    this.media.currentTime = Math.max(0, position - this.options.timing.audioStart);
    this.media.playbackRate = this.rate;
    this.musicGain!.gain.value = this.musicVolume;
    void this.media
      .play()
      .then(() => {
        if (this.disposed || generation !== this.generation) return;
        this.startingMedia = false;
        this.onPlaying();
      })
      .catch((error: unknown) => this.handlePlayFailure(error, generation));
    this.emit();
  }

  private handlePlayFailure(error: unknown, generation: number) {
    if (this.disposed || generation !== this.generation) return;
    this.startingMedia = false;
    this.pause();
    if (error instanceof DOMException && error.name === "NotSupportedError") this.failMusic(true);
    else this.options.onError(error);
  }

  pause() {
    this.stop(true);
  }

  private stop(cancelHits: boolean) {
    const position = this.position;
    this.generation++;
    this.anchor(position);
    this.state = "paused";
    this.startingMedia = false;
    this.preparing = false;
    this.media.pause();
    this.musicSource?.stop();
    this.musicSource?.disconnect();
    this.musicSource = undefined;
    if (cancelHits) this.cancelSounds();
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.emit();
  }

  seek(seconds: number) {
    if (!Number.isFinite(seconds) || this.disposed) return;
    const resume = this.state !== "paused";
    this.pause();
    this.anchor(Math.max(0, Math.min(this.duration, seconds)));
    this.queue.reset(this.anchorPosition);
    this.emit();
    if (resume && this.anchorPosition < this.duration) void this.play();
  }

  setRate(rate: number) {
    if (this.disposed || ![0.5, 0.75, 1, 1.25, 1.5, 2].includes(rate)) return;
    const resume = this.state !== "paused";
    this.pause();
    this.rate = rate;
    this.media.playbackRate = rate;
    if (resume) void this.play();
  }

  setVolumes(music: number, hits: number) {
    if (this.disposed || !Number.isFinite(music) || !Number.isFinite(hits)) return;
    this.musicVolume = Math.max(0, Math.min(1, music));
    this.hitVolume = Math.max(0, Math.min(1, hits));
    if (this.musicGain && !this.startingMedia) this.musicGain.gain.value = this.musicVolume;
    if (this.hitGain) this.hitGain.gain.value = this.hitVolume;
  }

  continueWithoutMusic() {
    this.needsContinuation = false;
    this.musicUnavailable = true;
    void this.play();
  }

  private readonly onWaiting = () => {
    if (
      this.usesBuffer ||
      this.state === "paused" ||
      this.startingMedia ||
      this.musicUnavailable ||
      this.media.paused
    )
      return;
    this.anchor(this.options.timing.audioStart + this.media.currentTime);
    this.state = "buffering";
    this.cancelSounds();
    this.queue.reset(this.anchorPosition);
    this.emit();
  };

  private readonly onPlaying = () => {
    if (
      this.usesBuffer ||
      this.state === "paused" ||
      this.startingMedia ||
      this.musicUnavailable ||
      this.media.paused ||
      this.media.seeking ||
      this.media.readyState < this.media.HAVE_FUTURE_DATA
    )
      return;
    this.anchor(this.options.timing.audioStart + this.media.currentTime);
    this.state = "playing";
    this.pump();
    this.emit();
  };

  private readonly onEnded = () => {
    if (this.state === "paused" || this.usesBuffer || this.preparing) return;
    this.anchor(this.options.timing.audioStart + this.media.duration);
    this.state = "playing";
    this.emit();
  };

  private readonly onMediaError = () => {
    if (this.disposed || this.refreshing || this.preparing || this.usesBuffer) return;
    if (this.options.musicMode === "auto" && !this.unlocked && !this.buffered) return;
    const wasPlaying = this.unlocked && this.state !== "paused";
    this.pause();
    const generation = this.generation;
    if (!this.refreshed && this.options.refreshMusic) {
      this.refreshed = true;
      this.refreshing = true;
      void this.options
        .refreshMusic()
        .then((url) => {
          if (this.disposed) return;
          if (!url) this.failMusic(wasPlaying);
          else {
            this.media.src = url;
            if (wasPlaying && generation === this.generation) void this.play();
          }
        })
        .catch(() => this.failMusic(wasPlaying))
        .finally(() => {
          this.refreshing = false;
        });
    } else this.failMusic(wasPlaying);
  };

  private failMusic(wasPlaying: boolean) {
    if (this.disposed) return;
    if (this.state !== "paused") this.pause();
    this.musicUnavailable = true;
    this.needsContinuation = wasPlaying;
    this.emit();
  }

  private readonly pump = () => {
    if (this.disposed || this.state !== "playing" || !this.context) return;
    const now = this.position;
    const ended = now >= this.duration;
    if (
      !ended &&
      !this.usesBuffer &&
      !this.musicUnavailable &&
      !this.startingMedia &&
      this.media.paused &&
      now >= this.options.timing.audioStart &&
      now < this.musicEnd()
    ) {
      this.startMusic(now, this.generation);
      return;
    }
    const audioTime = this.context.currentTime;
    for (const time of this.queue.take(now, Math.min(this.duration, now + 0.25 * this.rate))) {
      if (!this.tap || !this.hitGain) continue;
      const hitTime = this.usesBuffer
        ? Math.max(audioTime, this.anchorTime + (time - this.anchorPosition) / this.rate)
        : audioTime + Math.max(0, (time - now) / this.rate);
      // Collect each debounce window into one delayed sample, including across pump calls.
      // Tolerate floating-point rounding at the boundary of consecutive windows.
      if (hitTime < this.hitWindowEnd - 1e-9) continue;
      this.hitWindowEnd = hitTime + HIT_SOUND_DEBOUNCE_MS / 1000;

      const source = this.context.createBufferSource();
      source.buffer = this.tap;
      source.connect(this.hitGain);
      this.scheduled.add(source);
      source.onended = () => {
        source.disconnect();
        this.scheduled.delete(source);
      };
      source.start(this.hitWindowEnd);
    }
    // Schedule the final step before stopping, and let its sample finish naturally.
    if (ended && (!this.usesBuffer || this.presentationPosition >= this.duration)) this.stop(false);
  };

  dispose() {
    if (this.disposed) return;
    this.pause();
    this.disposed = true;
    this.requests.abort();
    this.buffered = undefined;
    this.musicLoading = undefined;
    this.tap = undefined;
    this.context?.removeEventListener?.("statechange", this.onContextState);
    this.media.removeEventListener("loadedmetadata", this.emit);
    this.media.removeEventListener("waiting", this.onWaiting);
    this.media.removeEventListener("seeking", this.onWaiting);
    this.media.removeEventListener("seeked", this.onPlaying);
    this.media.removeEventListener("playing", this.onPlaying);
    this.media.removeEventListener("ended", this.onEnded);
    this.media.removeEventListener("error", this.onMediaError);
    this.media.removeAttribute("src");
    this.media.load();
    void this.context?.close();
  }
}
