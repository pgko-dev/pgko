// Read-only probes for browser acceptance tests. Loaded before either harness mounts.
if (typeof AudioContext !== "undefined") {
  const state = window as unknown as {
    previewContext: AudioContext;
    previewMedia: HTMLMediaElement;
    previewAnalyser: AnalyserNode;
    previewHits: { time: number; endedAt?: number }[];
  };
  state.previewHits = [];

  // Capture native methods; each wrapper restores its receiver with .call(this).
  // oxlint-disable-next-line typescript/unbound-method
  const resume = AudioContext.prototype.resume;
  AudioContext.prototype.resume = function () {
    state.previewContext = this;
    return resume.call(this);
  };
  // oxlint-disable-next-line typescript/unbound-method
  const createSource = AudioContext.prototype.createMediaElementSource;
  AudioContext.prototype.createMediaElementSource = function (media) {
    const source = createSource.call(this, media);
    state.previewAnalyser = this.createAnalyser();
    source.connect(state.previewAnalyser);
    return source;
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
    const hit: (typeof state.previewHits)[number] = { time: args[0] ?? this.context.currentTime };
    state.previewHits.push(hit);
    this.addEventListener("ended", () => {
      hit.endedAt = this.context.currentTime;
    });
    return start.call(this, ...args);
  };
}
