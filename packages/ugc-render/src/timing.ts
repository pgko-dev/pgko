import { measureBars } from "./bars.js";
import type { ChartNote, UgcChart } from "./types.js";

export function lowerBound(values: readonly number[], value: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (values[middle] < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

export function createTiming(chart: UgcChart, endTick = measureBars(chart).at(-1)!.endTick) {
  const segments = chart.tempos.map((event) => ({ ...event, seconds: 0 }));
  for (let index = 1; index < segments.length; index++) {
    const previous = segments[index - 1];
    segments[index].seconds =
      previous.seconds +
      ((segments[index].tick - previous.tick) * 60) / (previous.bpm * chart.ticksPerQuarter);
  }
  const tickStarts = segments.map((segment) => segment.tick);
  const timeStarts = segments.map((segment) => segment.seconds);
  const initialMeter = chart.meters.findLast((meter) => meter.bar === 0)!;
  const initialTempo = segments.findLast((tempo) => tempo.tick === 0)!;
  const leadIn = chart.metadata.startOffset
    ? ((60 / initialTempo.bpm) * initialMeter.numerator * 4) / initialMeter.denominator
    : 0;

  function segmentAt(values: number[], value: number) {
    // The last event at an exact boundary owns that boundary.
    let index = lowerBound(values, value);
    while (index < values.length && values[index] === value) index++;
    return segments[Math.max(0, index - 1)];
  }

  const tickToSeconds = (tick: number) => {
    const segment = segmentAt(tickStarts, tick);
    return (
      leadIn +
      segment.seconds +
      ((tick - segment.tick) * 60) / (segment.bpm * chart.ticksPerQuarter)
    );
  };
  const secondsToTick = (seconds: number) => {
    const sourceSeconds = seconds - leadIn;
    const segment = segmentAt(timeStarts, sourceSeconds);
    return (
      segment.tick + ((sourceSeconds - segment.seconds) * segment.bpm * chart.ticksPerQuarter) / 60
    );
  };

  const audioStart = leadIn + chart.metadata.bgmOffset;
  const chartEnd = tickToSeconds(endTick);
  if (![leadIn, audioStart, chartEnd, ...timeStarts].every(Number.isFinite)) {
    throw new Error("Non-finite playback timing.");
  }

  return {
    leadIn,
    tickToSeconds,
    secondsToTick,
    audioStart,
    chartEnd,
  };
}

export type ChartTiming = ReturnType<typeof createTiming>;

/** Lazy, bounded attacks, including hold releases; control-only points stay silent. */
export function* attackTicks(note: ChartNote): Generator<number> {
  if (note.kind === "damage" || (note.kind === "airCrush" && note.interval === 0)) return;
  yield note.tick;
  if (note.kind === "airCrush") {
    if (note.interval !== null && note.interval > 0) {
      for (let tick = note.tick + note.interval; tick < note.endTick; tick += note.interval)
        yield tick;
    }
  } else {
    for (const child of note.children) if (child.action) yield child.tick;
  }
}

export function buildHitTimes(chart: UgcChart, timing: ChartTiming): number[] {
  const ticks = new Set<number>();
  let attacks = 0;
  for (const note of chart.notes) {
    for (const tick of attackTicks(note)) {
      if (++attacks > 500_000) throw new Error("Too many hit-sound events.");
      ticks.add(tick);
    }
  }
  return [...ticks].sort((a, b) => a - b).map(timing.tickToSeconds);
}

/** Each event is taken once per transport generation. Late events are discarded. */
export class HitQueue {
  private next = 0;
  private readonly times: readonly number[];
  constructor(times: readonly number[]) {
    this.times = times;
  }

  reset(seconds: number) {
    this.next = lowerBound(this.times, seconds);
  }

  take(now: number, horizon: number): number[] {
    const result: number[] = [];
    while (this.next < this.times.length && this.times[this.next] <= horizon) {
      const time = this.times[this.next++];
      if (time >= now - 0.02) result.push(time);
    }
    return result;
  }
}
