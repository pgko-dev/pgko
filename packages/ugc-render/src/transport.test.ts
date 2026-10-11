import { afterEach, beforeEach, expect, test } from "bun:test";

import { prepareChart } from "./prepare.js";
import { createTiming } from "./timing.js";
import { ChartTransport, HIT_SOUND_DEBOUNCE_MS } from "./transport.js";

const hitWindow = HIT_SOUND_DEBOUNCE_MS / 1000;

class FakeAudio extends EventTarget {
  static latest: FakeAudio;
  currentTime = 0;
  duration = 2;
  paused = true;
  ended = false;
  playbackRate = 1;
  src = "";
  crossOrigin = "";
  preload = "";
  preservesPitch = true;
  seeking = false;
  readyState = 4;
  readonly HAVE_FUTURE_DATA = 3;
  constructor() {
    super();
    FakeAudio.latest = this;
  }
  play() {
    this.paused = false;
    this.dispatchEvent(new Event("playing"));
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  load() {}
  removeAttribute() {
    this.src = "";
  }
}
class FakeSource {
  static all: FakeSource[] = [];
  stopped = false;
  startAt = 0;
  offset = 0;
  stopAt?: number;
  buffer?: unknown;
  onended?: () => void;
  constructor() {
    FakeSource.all.push(this);
  }
  connect() {}
  disconnect() {}
  start(time: number, offset = 0) {
    this.startAt = time;
    this.offset = offset;
  }
  stop(time?: number) {
    this.stopAt = time;
    if (time === undefined) this.stopped = true;
  }
}
class FakeContext extends EventTarget {
  static latest: FakeContext;
  static decoded: Promise<unknown> = Promise.resolve({});
  currentTime = 0;
  sampleRate = 48000;
  baseLatency = 0;
  outputLatency = 0;
  state = "running";
  timestamp = { contextTime: 0, performanceTime: 0 };
  destination = {};
  closed = false;
  constructor() {
    super();
    FakeContext.latest = this;
  }
  createGain() {
    return { gain: { value: 1 }, connect() {} };
  }
  getOutputTimestamp() {
    return this.timestamp;
  }
  createMediaElementSource() {
    return { connect() {}, disconnect() {} };
  }
  createBufferSource() {
    return new FakeSource();
  }
  decodeAudioData() {
    return FakeContext.decoded;
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    this.closed = true;
    return Promise.resolve();
  }
}

const originalAudio = globalThis.Audio;
const originalContext = globalThis.AudioContext;
let engines: ChartTransport[] = [];
beforeEach(() => {
  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  globalThis.AudioContext = FakeContext as unknown as typeof AudioContext;
  FakeSource.all = [];
  FakeContext.decoded = Promise.resolve({});
});
afterEach(() => {
  for (const engine of engines) engine.dispose();
  engines = [];
  globalThis.Audio = originalAudio;
  globalThis.AudioContext = originalContext;
});
const waitForPump = () => new Promise((resolve) => setTimeout(resolve, 35));
function engine(
  music = true,
  start = 0,
  end = 4,
  hits = [0, 0.1, 0.2, 1, 2, 3, 4],
  automatic = false,
) {
  const transport = new ChartTransport({
    timing: {
      leadIn: start,
      audioStart: start,
      chartEnd: end,
      tickToSeconds: (tick) => tick,
      secondsToTick: (seconds) => seconds,
    },
    hits,
    musicUrl: music
      ? automatic
        ? "data:audio/wav;base64,AA=="
        : "https://example.test/music.opus"
      : undefined,
    musicMode: automatic ? "auto" : "streaming",
    tapUrl: "data:audio/wav;base64,AA==",
    onChange() {},
    onError(error) {
      throw error;
    },
  });
  engines.push(transport);
  return transport;
}

test("media clock wins; buffering freezes and cancels scheduled hits", async () => {
  const transport = engine();
  await transport.play();
  await waitForPump();
  expect(FakeSource.all.length).toBeGreaterThan(0);
  FakeContext.latest.currentTime = 10;
  FakeAudio.latest.currentTime = 0.5;
  expect(transport.position).toBe(0.5);
  FakeAudio.latest.dispatchEvent(new Event("waiting"));
  expect(transport.snapshot().state).toBe("buffering");
  expect(FakeSource.all.every((source) => source.stopped)).toBe(true);
  FakeContext.latest.currentTime = 20;
  expect(transport.position).toBe(0.5);
  FakeAudio.latest.dispatchEvent(new Event("playing"));
  expect(transport.snapshot().state).toBe("playing");
});

test("first playback waits for sample decoding without losing the initial attack", async () => {
  let decoded!: (value: unknown) => void;
  FakeContext.decoded = new Promise((resolve) => {
    decoded = resolve;
  });
  const transport = engine(false);
  const playing = transport.play();
  await waitForPump();
  FakeContext.latest.currentTime = 5;
  expect(transport.position).toBe(0);
  expect(FakeSource.all).toHaveLength(0);
  decoded({});
  await playing;
  expect(transport.position).toBe(0);
  expect(FakeSource.all[0].startAt).toBeCloseTo(5 + hitWindow, 9);
});

test("seek and rate changes cancel old nodes and do not burst missed hits", async () => {
  const transport = engine();
  await transport.play();
  await waitForPump();
  const old = [...FakeSource.all];
  transport.seek(1);
  await waitForPump();
  expect(old.every((source) => source.stopped)).toBe(true);
  const count = FakeSource.all.length;
  await waitForPump();
  expect(FakeSource.all).toHaveLength(count);
  transport.setRate(2);
  await waitForPump();
  expect(FakeAudio.latest.playbackRate).toBe(2);
  transport.pause();
  expect(FakeSource.all.every((source) => source.stopped)).toBe(true);
});

test("a resolved play request cannot start the clock or hits before seeking finishes", async () => {
  const transport = engine(true, 0.25);
  FakeAudio.latest.duration = 20;
  transport.seek(2);
  FakeAudio.latest.seeking = true;
  await transport.play();
  await waitForPump();
  expect(transport.snapshot()).toMatchObject({ state: "buffering", position: 2 });
  expect(FakeAudio.latest.currentTime).toBe(1.75);
  expect(FakeSource.all).toHaveLength(0);
  FakeContext.latest.currentTime = 5;
  expect(transport.position).toBe(2);

  FakeAudio.latest.seeking = false;
  FakeAudio.latest.dispatchEvent(new Event("seeked"));
  expect(transport.snapshot()).toMatchObject({ state: "playing", position: 2 });
  expect(FakeSource.all).toHaveLength(1);
  expect(FakeSource.all[0].startAt).toBeCloseTo(5 + hitWindow, 9);
  transport.pause();
  FakeAudio.latest.dispatchEvent(new Event("seeked"));
  expect(transport.snapshot().state).toBe("paused");
});

test.each([-0.75, 0, 2.25])(
  "music offset %s is preserved across seeks, rates and silent phases",
  async (offset) => {
    const transport = engine(true, offset, 12);
    const media = FakeAudio.latest;
    media.duration = 20;
    // Start away from zero, seek in both directions while playing, then resume while paused.
    transport.seek(3);
    await transport.play();
    for (const position of [8, 4, 0, 6]) {
      transport.seek(position);
      await waitForPump();
      if (position < offset) {
        expect(media.paused).toBe(true);
        FakeContext.latest.currentTime += offset - position;
        await waitForPump();
      }
      expect(media.currentTime).toBe(Math.max(0, position - offset));
      expect(transport.position).toBe(Math.max(position, offset));
    }
    transport.setRate(1.5);
    await waitForPump();
    expect(media.currentTime).toBe(6 - offset);
    expect(media.playbackRate).toBe(1.5);
    transport.pause();
    transport.seek(3);
    await transport.play();
    expect(media.currentTime).toBe(3 - offset);
    expect(transport.position).toBe(3);
    media.duration = 1;
    transport.seek(transport.duration - 0.1);
    await waitForPump();
    expect(media.paused).toBe(true);
  },
);

test("silent mode, lead-in and audio tail use the context clock", async () => {
  const silent = engine(false);
  await silent.play();
  FakeContext.latest.currentTime = 1;
  expect(silent.position).toBe(1);
  silent.setRate(2);
  await waitForPump();
  FakeContext.latest.currentTime = 1.5;
  expect(silent.position).toBe(2);
  silent.pause();

  const music = engine(true, 1);
  await music.play();
  FakeContext.latest.currentTime = 0.5;
  expect(music.position).toBe(0.5);
  expect(FakeAudio.latest.paused).toBe(true);
  FakeAudio.latest.dispatchEvent(new Event("seeking"));
  expect(music.snapshot().state).toBe("playing");
  FakeContext.latest.currentTime = 1;
  await waitForPump();
  expect(FakeAudio.latest.paused).toBe(false);
  FakeAudio.latest.currentTime = 2;
  FakeAudio.latest.ended = true;
  FakeAudio.latest.paused = true;
  FakeAudio.latest.dispatchEvent(new Event("ended"));
  FakeContext.latest.currentTime += 0.5;
  expect(music.position).toBe(3.5);
});

test("a mid-playback music error pauses and requires explicit silent continuation", async () => {
  const transport = engine();
  await transport.play();
  FakeAudio.latest.currentTime = 1;
  FakeAudio.latest.dispatchEvent(new Event("error"));
  expect(transport.snapshot()).toMatchObject({
    state: "paused",
    position: 1,
    musicUnavailable: true,
    needsContinuation: true,
  });
  await transport.play();
  expect(transport.snapshot().state).toBe("paused");
  transport.continueWithoutMusic();
  await waitForPump();
  expect(transport.snapshot().state).toBe("playing");
  transport.dispose();
  expect(FakeContext.latest.closed).toBe(true);
  expect(FakeAudio.latest.src).toBe("");
});

test("seeking to the end pauses, while negative music offsets start partway into BGM", async () => {
  const transport = engine(true, -1);
  await transport.play();
  expect(FakeAudio.latest.currentTime).toBe(1);
  expect(transport.position).toBe(0);
  FakeAudio.latest.duration = 10;
  expect(transport.duration).toBe(4);
  transport.seek(transport.duration);
  expect(transport.snapshot()).toMatchObject({ state: "paused", position: 4 });
});

test.each([true, false])("stops at the final bar even when music continues: %s", async (music) => {
  const transport = engine(music);
  FakeAudio.latest.duration = 20;
  await transport.play();
  FakeAudio.latest.currentTime = 4.02;
  FakeContext.latest.currentTime = 4.02;
  await waitForPump();
  expect(transport.snapshot()).toMatchObject({ state: "paused", position: 4, duration: 4 });
  expect(FakeAudio.latest.paused).toBe(true);
  const count = FakeSource.all.length;
  await waitForPump();
  expect(FakeSource.all).toHaveLength(count);
});

test.each([1.95, 1.65])(
  "a final hold step sounds even when the preceding scheduler tick is at %s",
  async (previousTime) => {
    const prepared = prepareChart(new TextEncoder().encode("@BPM\t0'0\t120\n#0'0:h04\n#1920>s"));
    if (!prepared.chart) throw new Error("Invalid fixture");
    const transport = new ChartTransport({
      timing: createTiming(prepared.chart, prepared.layout.endTick),
      hits: prepared.hits,
      tapUrl: "data:audio/wav;base64,AA==",
      onChange() {},
      onError(error) {
        throw error;
      },
    });
    engines.push(transport);
    await transport.play();
    FakeContext.latest.currentTime = previousTime;
    await waitForPump();
    FakeContext.latest.currentTime = 2.01;
    await waitForPump();
    const releases = FakeSource.all.filter((source) => source.startAt >= 2);
    expect(releases).toHaveLength(1);
    const releaseTime = previousTime === 1.95 ? 2 : 2.01;
    expect(releases[0].startAt).toBeCloseTo(releaseTime + hitWindow, 9);
    expect(transport.snapshot()).toMatchObject({ state: "paused", position: 2, duration: 2 });
    expect(releases[0].stopped).toBe(false);
    await waitForPump();
    expect(FakeSource.all.filter((source) => source.startAt >= 2)).toHaveLength(1);
    transport.pause();
    expect(releases[0].stopped).toBe(true);
  },
);

test.each([0.5, 1, 2])(
  "dense hits combine within the hit window at playback rate %s",
  async (rate) => {
    const hits = Array.from({ length: 69 }, (_, index) => (index * hitWindow * rate) / 4);
    const transport = engine(false, 0, 4, hits);
    transport.setRate(rate);
    await transport.play();

    const initialWindows = Math.min(18, Math.floor((0.25 + 1e-9) / hitWindow) + 1);
    expect(FakeSource.all).toHaveLength(initialWindows);
    expect(FakeSource.all[0].startAt).toBe(hitWindow);
    for (let time = 0.05; time < 17 * hitWindow + 0.05; time += 0.05) {
      FakeContext.latest.currentTime = time;
      await waitForPump();
    }

    expect(FakeSource.all).toHaveLength(18);
    for (const [index, source] of FakeSource.all.entries()) {
      expect(source.startAt).toBeCloseTo((index + 1) * hitWindow, 9);
    }
    await waitForPump();
    expect(FakeSource.all).toHaveLength(18);
  },
);

test("a hit window spans scheduler batches and combines simultaneous hits", async () => {
  const firstHit = 0.25 - hitWindow / 2;
  const boundary = firstHit + hitWindow;
  const transport = engine(false, 0, 4, [
    firstHit,
    0.25 + hitWindow / 4,
    boundary - hitWindow / 4,
    boundary,
    boundary,
  ]);
  await transport.play();
  expect(FakeSource.all).toHaveLength(1);
  expect(FakeSource.all[0].startAt).toBeCloseTo(boundary, 9);

  FakeContext.latest.currentTime = hitWindow / 2;
  await waitForPump();
  expect(FakeSource.all).toHaveLength(2);
  expect(FakeSource.all[1].startAt).toBeCloseTo(boundary + hitWindow, 9);
});

test("overdue hits combine into one delayed sound without a catch-up burst", async () => {
  const transport = engine(false, 0, 4, [
    0,
    0.3,
    0.331,
    0.332,
    0.34,
    0.35,
    0.35 + hitWindow / 2,
    0.35 + hitWindow,
  ]);
  await transport.play();
  FakeContext.latest.currentTime = 0.35;
  await waitForPump();

  expect(FakeSource.all).toHaveLength(3);
  expect(FakeSource.all[1].startAt).toBeCloseTo(0.35 + hitWindow, 9);
  expect(FakeSource.all[2].startAt).toBeCloseTo(0.35 + 2 * hitWindow, 9);
});

test.each(["pause", "seek", "rate", "buffering"])(
  "%s cancels delayed groups and starts fresh hit windows",
  async (action) => {
    const transport = engine(true, 0, 4, [0, hitWindow / 2, hitWindow, 2 * hitWindow]);
    await transport.play();
    const previous = [...FakeSource.all];
    expect(previous).toHaveLength(3);

    if (action === "pause") {
      transport.pause();
      await transport.play();
    } else if (action === "seek") {
      transport.seek(0);
    } else if (action === "rate") {
      transport.setRate(2);
    } else {
      FakeAudio.latest.dispatchEvent(new Event("waiting"));
      FakeAudio.latest.dispatchEvent(new Event("playing"));
    }
    await waitForPump();

    expect(previous.every((source) => source.stopped)).toBe(true);
    const resumed = FakeSource.all.filter((source) => !source.stopped);
    expect(resumed).toHaveLength(action === "rate" ? 2 : 3);
    expect(resumed[0].startAt).toBe(hitWindow);
    const count = FakeSource.all.length;
    await waitForPump();
    expect(FakeSource.all).toHaveLength(count);
  },
);

test("replay clears a delayed final hit before starting a new window", async () => {
  const transport = engine(false, 0, 0.05, [0, 0.05]);
  await transport.play();
  FakeContext.latest.currentTime = 0.05;
  await waitForPump();
  expect(transport.snapshot().state).toBe("paused");
  const previous = [...FakeSource.all];
  expect(previous.at(-1)!.stopped).toBe(false);

  await transport.play();
  expect(previous.every((source) => source.stopped)).toBe(true);
  const replay = FakeSource.all.filter((source) => !source.stopped);
  expect(replay).toHaveLength(2);
  expect(replay[0].startAt).toBeCloseTo(0.05 + hitWindow, 9);
});

const decodedMusic = { duration: 2, length: 96000, numberOfChannels: 2 };

test.each([-0.5, 0, 0.5])(
  "buffered music and hits share an anchor with offset %s",
  async (offset) => {
    FakeContext.decoded = Promise.resolve(decodedMusic);
    const transport = engine(true, offset, 4, [0, 0.2, 1], true);
    await transport.play();
    expect(transport.diagnostics.backend).toBe("buffered");
    const [music, firstHit] = FakeSource.all;
    expect(music.startAt).toBeCloseTo(0.05 + Math.max(0, offset), 9);
    expect(music.offset).toBe(Math.max(0, -offset));
    expect(firstHit.startAt).toBeCloseTo(0.05 + hitWindow, 9);
    expect(music.stopAt).toBeCloseTo(4.05, 9);
    FakeAudio.latest.currentTime = 50;
    expect(transport.position).toBe(0);
    FakeContext.latest.currentTime = 0.55;
    expect(transport.position).toBeCloseTo(0.5, 9);
    transport.seek(1.5);
    await waitForPump();
    expect(music.stopped).toBe(true);
    const resumedMusic = FakeSource.all.findLast((source) => source.stopAt !== undefined)!;
    if (1.5 - offset < 2) expect(resumedMusic.offset).toBe(1.5 - offset);
    expect(transport.diagnostics.decodedBytes).toBe(768000);
  },
);

test("buffered presentation compensates latency monotonically and resets on seek", async () => {
  FakeContext.decoded = Promise.resolve(decodedMusic);
  const transport = engine(true, 0, 4, [], true);
  await transport.play();
  FakeContext.latest.baseLatency = 0.01;
  FakeContext.latest.outputLatency = 0.09;
  FakeContext.latest.currentTime = 1.05;
  expect(transport.position).toBeCloseTo(1, 9);
  expect(transport.presentationPosition).toBeCloseTo(0.9, 9);
  FakeContext.latest.outputLatency = 0.2;
  expect(transport.presentationPosition).toBeCloseTo(0.9, 9);
  transport.seek(0.2);
  await waitForPump();
  expect(transport.presentationPosition).toBeCloseTo(0.2, 9);
  FakeContext.latest.state = "interrupted";
  FakeContext.latest.dispatchEvent(new Event("statechange"));
  expect(transport.snapshot().state).toBe("paused");
  expect(FakeSource.all.every((source) => source.stopped)).toBe(true);
});

test("automatic mode preserves streaming rates and reuses the decoded track", async () => {
  FakeContext.decoded = Promise.resolve(decodedMusic);
  const transport = engine(true, 0, 4, [], true);
  await transport.play();
  transport.setRate(0.5);
  await waitForPump();
  expect(transport.diagnostics).toMatchObject({ backend: "streaming", fallbackReason: "rate" });
  expect(FakeAudio.latest.preservesPitch).toBe(true);
  expect(FakeAudio.latest.playbackRate).toBe(0.5);
  transport.setRate(1);
  await waitForPump();
  expect(transport.diagnostics.backend).toBe("buffered");
  transport.dispose();
  expect(transport.diagnostics.decodedBytes).toBe(0);
});

test("buffered pause, repeated seeks, interruption and tail keep one decoded track", async () => {
  FakeContext.decoded = Promise.resolve(decodedMusic);
  const transport = engine(true, 0, 4, [0, 1, 2, 3], true);
  await transport.play();
  const firstMusic = FakeSource.all[0];
  FakeContext.latest.currentTime = 0.55;
  transport.pause();
  expect(firstMusic.stopped).toBe(true);
  expect(transport.position).toBeCloseTo(0.5, 9);
  await transport.play();
  expect(FakeSource.all.findLast((source) => source.stopAt !== undefined)?.offset).toBeCloseTo(
    0.5,
    9,
  );

  transport.seek(0.8);
  transport.seek(1.2);
  transport.seek(0.4);
  await waitForPump();
  const activeMusic = FakeSource.all.filter(
    (source) => !source.stopped && source.stopAt !== undefined,
  );
  expect(activeMusic).toHaveLength(1);
  expect(activeMusic[0].buffer).toBe(firstMusic.buffer);
  expect(activeMusic[0].offset).toBe(0.4);

  FakeContext.latest.state = "interrupted";
  FakeContext.latest.dispatchEvent(new Event("statechange"));
  expect(transport.snapshot().state).toBe("paused");
  expect(FakeSource.all.every((source) => source.stopped)).toBe(true);
  FakeContext.latest.state = "running";
  await transport.play();
  expect(transport.snapshot().state).toBe("playing");
  transport.seek(3);
  await waitForPump();
  expect(
    FakeSource.all.filter((source) => !source.stopped && source.stopAt !== undefined),
  ).toHaveLength(0);
  FakeContext.latest.currentTime += 0.55;
  expect(transport.position).toBeCloseTo(3.5, 9);
  expect(transport.diagnostics.backend).toBe("buffered");
});

test("valid output timestamps take precedence over latency estimates", async () => {
  FakeContext.decoded = Promise.resolve(decodedMusic);
  const transport = engine(true, 0, 4, [], true);
  await transport.play();
  FakeContext.latest.currentTime = 1.05;
  FakeContext.latest.outputLatency = 0.7;
  FakeContext.latest.timestamp = { contextTime: 0.9, performanceTime: performance.now() };
  expect(transport.presentationPosition).toBeGreaterThanOrEqual(0.85);
  expect(transport.presentationPosition).toBeLessThan(0.86);
  FakeContext.latest.timestamp = { contextTime: 10, performanceTime: performance.now() };
  expect(transport.presentationPosition).toBeLessThanOrEqual(transport.position);
});

test("buffered end waits for output presentation and preserves the final tap", async () => {
  FakeContext.decoded = Promise.resolve(decodedMusic);
  const transport = engine(true, 0, 1, [1], true);
  await transport.play();
  FakeContext.latest.currentTime = 0.9;
  await waitForPump();
  const finalHit = FakeSource.all.at(-1)!;
  expect(finalHit.startAt).toBeCloseTo(1.05 + hitWindow, 9);
  FakeContext.latest.outputLatency = 0.1;
  FakeContext.latest.currentTime = 1.1;
  await waitForPump();
  expect(transport.snapshot().state).toBe("playing");
  FakeContext.latest.currentTime = 1.16;
  await waitForPump();
  expect(transport.snapshot()).toMatchObject({ state: "paused", position: 1 });
  expect(finalHit.stopped).toBe(false);
});

test("canceling buffered preparation cannot restart a paused or disposed player", async () => {
  let resolveDecode!: (buffer: unknown) => void;
  FakeContext.decoded = new Promise((resolve) => {
    resolveDecode = resolve;
  });
  const transport = engine(true, 0, 4, [], true);
  const play = transport.play();
  transport.pause();
  resolveDecode(decodedMusic);
  await play;
  expect(transport.snapshot().state).toBe("paused");
  expect(FakeSource.all).toHaveLength(0);
  await transport.play();
  expect(transport.diagnostics.backend).toBe("buffered");
  transport.dispose();
  expect(FakeContext.latest.closed).toBe(true);
});

test("oversized music falls back to streaming without decoding music", async () => {
  const transport = engine(true, 0, 4, [], true);
  FakeAudio.latest.duration = 301;
  await transport.play();
  expect(transport.diagnostics).toMatchObject({ backend: "streaming", fallbackReason: "duration" });
  expect(FakeAudio.latest.paused).toBe(false);
});
