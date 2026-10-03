import { afterEach, beforeEach, expect, test } from "bun:test";

import { prepareChart } from "./prepare.js";
import { createTiming } from "./timing.js";
import { ChartTransport } from "./transport.js";

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
  buffer?: unknown;
  onended?: () => void;
  constructor() {
    FakeSource.all.push(this);
  }
  connect() {}
  disconnect() {}
  start(time: number) {
    this.startAt = time;
  }
  stop() {
    this.stopped = true;
  }
}
class FakeContext {
  static latest: FakeContext;
  static decoded: Promise<unknown> = Promise.resolve({});
  currentTime = 0;
  destination = {};
  closed = false;
  constructor() {
    FakeContext.latest = this;
  }
  createGain() {
    return { gain: { value: 1 }, connect() {} };
  }
  createMediaElementSource() {
    return { connect() {} };
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
function engine(music = true, start = 0, end = 4, hits = [0, 0.1, 0.2, 1, 2, 3, 4]) {
  const transport = new ChartTransport({
    timing: {
      leadIn: start,
      audioStart: start,
      chartEnd: end,
      tickToSeconds: (tick) => tick,
      secondsToTick: (seconds) => seconds,
    },
    hits,
    musicUrl: music ? "https://example.test/music.opus" : undefined,
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
  expect(FakeSource.all[0].startAt).toBeCloseTo(5.007, 9);
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
  expect(FakeSource.all[0].startAt).toBeCloseTo(5.007, 9);
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
  await Promise.resolve();
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
  await Promise.resolve();
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

test.each([1.95, 1.85])(
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
    expect(releases[0].startAt).toBeCloseTo(previousTime === 1.95 ? 2.007 : 2.017, 9);
    expect(transport.snapshot()).toMatchObject({ state: "paused", position: 2, duration: 2 });
    expect(releases[0].stopped).toBe(false);
    await waitForPump();
    expect(FakeSource.all.filter((source) => source.startAt >= 2)).toHaveLength(1);
    transport.pause();
    expect(releases[0].stopped).toBe(true);
  },
);

test.each([0.5, 1, 2])("dense hits combine after 7 ms at playback rate %s", async (rate) => {
  const hits = Array.from({ length: 481 }, (_, index) => index * 0.00025 * rate);
  const transport = engine(false, 0, 4, hits);
  transport.setRate(rate);
  await transport.play();

  expect(FakeSource.all).toHaveLength(15);
  expect(FakeSource.all[0].startAt).toBe(0.007);
  FakeContext.latest.currentTime = 0.05;
  await waitForPump();

  expect(FakeSource.all).toHaveLength(18);
  for (const [index, source] of FakeSource.all.entries()) {
    expect(source.startAt).toBeCloseTo((index + 1) * 0.007, 9);
  }
  await waitForPump();
  expect(FakeSource.all).toHaveLength(18);
});

test("a hit window spans scheduler batches and combines simultaneous hits", async () => {
  const transport = engine(false, 0, 4, [0.09975, 0.10025, 0.1065, 0.10675, 0.10675]);
  await transport.play();
  expect(FakeSource.all).toHaveLength(1);
  expect(FakeSource.all[0].startAt).toBeCloseTo(0.10675, 9);

  FakeContext.latest.currentTime = 0.025;
  await waitForPump();
  expect(FakeSource.all).toHaveLength(2);
  expect(FakeSource.all[1].startAt).toBeCloseTo(0.11375, 9);
});

test("overdue hits combine into one delayed sound without a catch-up burst", async () => {
  const transport = engine(false, 0, 4, [0, 0.15, 0.181, 0.182, 0.19, 0.2, 0.2005, 0.207]);
  await transport.play();
  FakeContext.latest.currentTime = 0.2;
  await waitForPump();

  expect(FakeSource.all).toHaveLength(3);
  expect(FakeSource.all[1].startAt).toBeCloseTo(0.207, 9);
  expect(FakeSource.all[2].startAt).toBeCloseTo(0.214, 9);
});

test.each(["pause", "seek", "rate", "buffering"])(
  "%s cancels delayed groups and starts fresh hit windows",
  async (action) => {
    const transport = engine(true, 0, 4, [0, 0.0035, 0.007, 0.014]);
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
    expect(resumed[0].startAt).toBe(0.007);
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
  expect(replay[0].startAt).toBeCloseTo(0.057, 9);
});
