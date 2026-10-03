import type { UgcChart } from "./types.js";

export type ChartBar = {
  index: number;
  startTick: number;
  endTick: number;
  numerator: number;
  denominator: number;
};

/** Hold releases and passive tails complete the preceding bar; other actions start the next. */
export function measureBars(chart: UgcChart): ChartBar[] {
  const bars: ChartBar[] = [];
  const endsWithAction = chart.notes.some(
    (note) =>
      note.tick === chart.lastTick ||
      (note.kind !== "hold" &&
        note.children.some((point) => point.action && point.tick === chart.lastTick)),
  );
  let tick = 0;
  let bar = 0;
  let eventIndex = 0;

  while (
    tick < chart.lastTick ||
    (tick === chart.lastTick && endsWithAction) ||
    bars.length === 0
  ) {
    if (bars.length >= 100_000) throw new RangeError("Too many visual bars.");
    while (chart.meters[eventIndex + 1]?.bar <= bar) eventIndex++;
    const meter = chart.meters[eventIndex];
    const quarters = (meter.numerator * 4) / meter.denominator;
    const duration = quarters * chart.ticksPerQuarter;
    if (!Number.isFinite(duration) || duration < 0 || quarters > 400_000)
      throw new RangeError("Invalid meter duration.");

    if (duration === 0) {
      const next = chart.meters[eventIndex + 1];
      if (next) {
        bar = next.bar;
        eventIndex++;
        continue;
      }
      // A terminal zero meter leaves one unnumbered region through the last occupied beat.
      const endTick =
        (Math.floor(chart.lastTick / chart.ticksPerQuarter) + 1) * chart.ticksPerQuarter;
      bars.push({
        index: bar,
        startTick: tick,
        endTick,
        numerator: 0,
        denominator: meter.denominator,
      });
      break;
    }

    const endTick = tick + duration;
    if (endTick <= tick) throw new RangeError("Meter duration cannot advance time.");
    bars.push({
      index: bar,
      startTick: tick,
      endTick,
      numerator: meter.numerator,
      denominator: meter.denominator,
    });
    tick = endTick;
    bar++;
  }
  return bars;
}
