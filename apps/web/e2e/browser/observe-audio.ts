import { ChartTransport } from "@pgko.dev/ugc-render/playback";

import type {} from "../fixtures/preview-state";

import probeUrl from "./onsets.worklet.ts?worker&url";

window.previewFrameGaps = [];
window.previewSignals = [];
let previousFrame = 0;
function frame(now: number) {
  if (previousFrame) window.previewFrameGaps.push(now - previousFrame);
  if (window.previewFrameGaps.length > 6000) window.previewFrameGaps.shift();
  previousFrame = now;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// oxlint-disable-next-line typescript/unbound-method -- The wrapper restores the transport receiver.
const transportPlay = ChartTransport.prototype.play;
ChartTransport.prototype.play = function () {
  window.previewTransport = this;
  return transportPlay.call(this);
};

// Test-only probes; production audio has no measurement worklet or prototype wrappers.
if (typeof AudioContext !== "undefined") {
  const state = window as unknown as {
    previewContext: AudioContext;
    previewMedia: HTMLMediaElement;
    previewAnalyser: AnalyserNode;
    previewHits: { time: number; endedAt?: number }[];
    previewMusic: { time: number; offset: number; duration: number }[];
  };
  state.previewHits = [];
  state.previewMusic = [];
  const gains = new WeakMap<AudioContext, GainNode[]>();
  const destinations = new WeakMap<AudioBufferSourceNode, AudioNode>();
  const probes = new WeakMap<AudioContext, Promise<void>>();
  const signalProbe = new URLSearchParams(location.search).get("audioProbe") === "1";

  // oxlint-disable-next-line typescript/unbound-method
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (this: AudioNode, ...args: unknown[]) {
    if (this instanceof AudioBufferSourceNode) destinations.set(this, args[0] as AudioNode);
    return Reflect.apply(connect, this, args);
  } as typeof connect;

  // oxlint-disable-next-line typescript/unbound-method
  const createGain = AudioContext.prototype.createGain;
  AudioContext.prototype.createGain = function () {
    const gain = createGain.call(this);
    const nodes = gains.get(this) ?? [];
    nodes.push(gain);
    gains.set(this, nodes);
    if (nodes.length === 1) {
      state.previewAnalyser = this.createAnalyser();
      gain.connect(state.previewAnalyser);
    }
    return gain;
  };

  // Capture native methods; each wrapper restores its receiver with .call(this).
  // oxlint-disable-next-line typescript/unbound-method
  const resume = AudioContext.prototype.resume;
  AudioContext.prototype.resume = function () {
    state.previewContext = this;
    const resumed = resume.call(this);
    if (!signalProbe) return resumed;
    let pending = probes.get(this);
    if (!pending) {
      pending = this.audioWorklet.addModule(probeUrl).then(() => {
        const probe = new AudioWorkletNode(this, "preview-onsets", {
          numberOfInputs: 2,
          numberOfOutputs: 1,
          outputChannelCount: [1],
        });
        gains.get(this)!.forEach((gain, index) => gain.connect(probe, 0, index));
        probe.connect(this.destination);
        probe.port.onmessage = (event: MessageEvent<(typeof window.previewSignals)[number]>) => {
          window.previewSignals.push(event.data);
        };
      });
      probes.set(this, pending);
    }
    return Promise.all([resumed, pending]).then(() => {});
  };
  // oxlint-disable-next-line typescript/unbound-method
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    state.previewMedia = this;
    return play.call(this);
  };

  // oxlint-disable-next-line typescript/unbound-method
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...args) {
    if (destinations.get(this) === gains.get(this.context as AudioContext)?.[0]) {
      state.previewMusic.push({
        time: args[0] ?? this.context.currentTime,
        offset: args[1] ?? 0,
        duration: this.buffer!.duration,
      });
    } else {
      const hit: (typeof state.previewHits)[number] = { time: args[0] ?? this.context.currentTime };
      state.previewHits.push(hit);
      this.addEventListener("ended", () => {
        hit.endedAt = this.context.currentTime;
      });
    }
    return start.call(this, ...args);
  };
}
