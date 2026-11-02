import { pointBound } from "./note-geometry.js";
import type { ChartNote, ChartPoint } from "./types.js";

export type FieldBounds = { minLane: number; maxLane: number };

/** Include visible segments at the window edges, not distant long-note endpoints. */
export function measureField(
  notes: readonly ChartNote[],
  startTick = -Infinity,
  endTick = Infinity,
): FieldBounds {
  let minLane = 0;
  let maxLane = 16;
  const include = (lane: number, width: number) => {
    minLane = Math.min(minLane, lane);
    maxLane = Math.max(maxLane, lane + width);
  };
  const segment = (previous: ChartPoint, next: ChartPoint) => {
    if (next.tick < startTick || previous.tick > endTick || next.noLine) return;
    const duration = next.tick - previous.tick;
    for (const tick of [Math.max(startTick, previous.tick), Math.min(endTick, next.tick)]) {
      const fraction = duration === 0 ? 0 : (tick - previous.tick) / duration;
      include(
        previous.lane + (next.lane - previous.lane) * fraction,
        previous.width + (next.width - previous.width) * fraction,
      );
    }
  };
  for (const note of notes) {
    if (note.endTick < startTick || note.tick > endTick) continue;
    if (note.tick >= startTick) include(note.lane, note.width);
    let index = pointBound(note.children, startTick);
    let previous: ChartPoint = index === 0 ? note : note.children[index - 1];
    for (; index < note.children.length; index++) {
      const point = note.children[index];
      segment(previous, point);
      if (point.tick > endTick) break;
      include(point.lane, point.width);
      previous = point;
    }
  }
  return { minLane: Math.floor(minLane), maxLane: Math.ceil(maxLane) };
}
