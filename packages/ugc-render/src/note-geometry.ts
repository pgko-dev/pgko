import type { ChartNote, ChartPoint } from "./types.js";

/** First point at/after a tick, or strictly after it for an upper bound. */
export function pointBound(points: readonly ChartPoint[], tick: number, upper = false): number {
  let low = 0;
  let high = points.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (points[middle].tick < tick || (upper && points[middle].tick === tick)) low = middle + 1;
    else high = middle;
  }
  return low;
}

type RibbonRun = { first: number; last: number };
export type VisibleRibbon = {
  points: ChartPoint[];
  startTick: number;
  endTick: number;
};

/** Immutable source geometry. Action boundaries retain their original gradient endpoints. */
export class NoteGeometry {
  private readonly points: ChartPoint[];
  private readonly runs: RibbonRun[] = [];

  constructor(note: ChartNote) {
    this.points = [note, ...note.children];
    if (note.kind !== "slide") {
      if (note.children.length) this.runs.push({ first: 0, last: note.children.length });
      return;
    }

    let first = 0;
    for (let last = 1; last < this.points.length; last++) {
      const point = this.points[last];
      // A noLine control discards the unfinished run, matching the source renderer.
      if (point.noLine) first = last;
      if (point.action || last === this.points.length - 1) {
        if (last > first) this.runs.push({ first, last });
        first = last;
      }
    }
  }

  visible(startTick: number, endTick: number): VisibleRibbon[] {
    let low = 0;
    let high = this.runs.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (this.points[this.runs[middle].last].tick < startTick) low = middle + 1;
      else high = middle;
    }

    // Retain the adjacent source vertices, including every same-tick boundary point.
    const first = Math.max(0, pointBound(this.points, startTick) - 1);
    const last = Math.min(this.points.length - 1, pointBound(this.points, endTick, true));
    const visible: VisibleRibbon[] = [];
    for (let index = low; index < this.runs.length; index++) {
      const run = this.runs[index];
      const start = this.points[run.first].tick;
      if (start > endTick) break;
      const from = Math.max(first, run.first);
      const to = Math.min(last, run.last);
      const points = this.points.slice(from, to + 1);
      // Keep the original caps outside the viewport so rasterization retains its bounds.
      if (from > run.first) points.unshift(this.points[run.first]);
      if (to < run.last) points.push(this.points[run.last]);
      visible.push({
        points,
        startTick: start,
        endTick: this.points[run.last].tick,
      });
    }
    return visible;
  }
}
