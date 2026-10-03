import { measureBars, type ChartBar } from "./bars.js";
import type { UgcChart } from "./types.js";

export type { ChartBar } from "./bars.js";

export const CONTENT_HEIGHT = 1024;
export const LOOK_AHEAD = 24;
export const FIELD_HEIGHT = CONTENT_HEIGHT + LOOK_AHEAD;
export const NOTE_PADDING = 44;
export const FIELD_LEFT = 128;
export const FIELD_WIDTH = 320;
export const COLUMN_WIDTH = FIELD_LEFT + FIELD_WIDTH + 100;
export const CANVAS_HEIGHT = FIELD_HEIGHT + NOTE_PADDING * 2;
export const PREVIEW_ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export type PreviewColumn = {
  index: number;
  startTick: number;
  packedEndTick: number;
  lookAheadEndTick: number;
  pixelsPerTick: number;
  bottomY: number;
};
export type ChartLayout = {
  bars: ChartBar[];
  columns: PreviewColumn[];
  endTick: number;
  canvasHeight: number;
};

/** Packs complete bars at the requested scale, fitting oversized bars into the available height. */
export function createLayout(
  chart: UgcChart,
  zoom = 0.5,
  canvasHeight = CANVAS_HEIGHT,
): ChartLayout {
  if (!Number.isFinite(zoom) || zoom < 0.5 || zoom > 2)
    throw new RangeError("Invalid preview zoom.");
  const contentHeight = canvasHeight - LOOK_AHEAD - NOTE_PADDING * 2;
  if (!Number.isFinite(contentHeight) || contentHeight <= 0)
    throw new RangeError("Invalid preview height.");
  const pixelsPerTick = (128 * zoom) / chart.ticksPerQuarter;
  const budgetTicks = contentHeight / pixelsPerTick;
  const bars = measureBars(chart);
  const columns: PreviewColumn[] = [];
  const endTick = bars.at(-1)!.endTick;

  for (const bar of bars) {
    const packed = columns.at(-1);
    if (packed && bar.endTick - packed.startTick <= budgetTicks) {
      packed.packedEndTick = bar.endTick;
    } else {
      const fittedScale = contentHeight / (bar.endTick - bar.startTick);
      columns.push({
        index: columns.length,
        startTick: bar.startTick,
        packedEndTick: bar.endTick,
        lookAheadEndTick: bar.endTick,
        pixelsPerTick: Math.min(pixelsPerTick, fittedScale),
        bottomY: canvasHeight - NOTE_PADDING,
      });
    }
  }
  for (const column of columns) {
    column.lookAheadEndTick = Math.min(
      endTick,
      column.packedEndTick + LOOK_AHEAD / column.pixelsPerTick,
    );
  }
  return { bars, columns, endTick, canvasHeight };
}

/** Boundaries belong to the following column; look-ahead does not change ownership. */
export function columnAtTick(layout: ChartLayout, tick: number): PreviewColumn {
  let start = 0;
  let end = layout.columns.length;
  while (start < end) {
    const index = Math.floor((start + end) / 2);
    if (layout.columns[index].startTick <= tick) start = index + 1;
    else end = index;
  }
  return layout.columns[Math.max(0, start - 1)];
}

export function tickY(column: PreviewColumn, tick: number): number {
  return column.bottomY - (tick - column.startTick) * column.pixelsPerTick;
}

/** Logical canvas coordinates. Gutters and unused space are not seek targets. */
export function hitTestTick(column: PreviewColumn, x: number, y: number): number | null {
  if (x < FIELD_LEFT || x > FIELD_LEFT + FIELD_WIDTH) return null;
  const tick = column.startTick + (column.bottomY - y) / column.pixelsPerTick;
  return tick >= column.startTick && tick <= column.lookAheadEndTick ? tick : null;
}
