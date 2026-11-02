import { measureBars, type ChartBar } from "./bars.js";
import { measureField, type FieldBounds } from "./field.js";
import { NoteIndex } from "./note-index.js";
import type { UgcChart } from "./types.js";

export type { ChartBar } from "./bars.js";
export type { FieldBounds } from "./field.js";

export const CONTENT_HEIGHT = 1024;
export const LOOK_AHEAD = 24;
export const FIELD_HEIGHT = CONTENT_HEIGHT + LOOK_AHEAD;
export const NOTE_PADDING = 44;
export const NOTE_BOTTOM_PADDING = 12;
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
  field?: FieldBounds;
  offsetX?: number;
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
  const index = new NoteIndex(chart.notes);
  let offsetX = 0;
  for (const column of columns) {
    column.lookAheadEndTick = Math.min(
      endTick,
      column.packedEndTick + LOOK_AHEAD / column.pixelsPerTick,
    );
    const window = columnNoteWindow(column);
    column.field = measureField(index.query(window.start, window.end), window.start, window.end);
    column.offsetX = offsetX;
    offsetX += columnWidth(column);
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

export function columnNoteWindow(column: PreviewColumn) {
  return {
    start: column.startTick - (NOTE_BOTTOM_PADDING + 44) / column.pixelsPerTick,
    end: column.lookAheadEndTick + (NOTE_PADDING + 44) / column.pixelsPerTick,
  };
}

export function columnField(column: PreviewColumn) {
  const { minLane = 0, maxLane = 16 } = column.field ?? {};
  return {
    minLane,
    maxLane,
    width: ((maxLane - minLane) * FIELD_WIDTH) / 16,
    shiftX: (-minLane * FIELD_WIDTH) / 16,
  };
}

export function columnWidth(column: PreviewColumn): number {
  return COLUMN_WIDTH - FIELD_WIDTH + columnField(column).width;
}

export function columnOffset(column: PreviewColumn): number {
  return column.offsetX ?? column.index * COLUMN_WIDTH;
}

export function layoutWidth(layout: ChartLayout): number {
  const last = layout.columns.at(-1);
  return last ? columnOffset(last) + columnWidth(last) : 0;
}

/** Locate variable-width columns; their gutters are rejected by hitTestTick. */
export function columnAtX(layout: ChartLayout, x: number): PreviewColumn {
  let start = 0;
  let end = layout.columns.length;
  while (start < end) {
    const index = (start + end) >>> 1;
    if (columnOffset(layout.columns[index]) <= x) start = index + 1;
    else end = index;
  }
  return layout.columns[Math.max(0, start - 1)];
}

/** Logical canvas coordinates. Gutters and unused space are not seek targets. */
export function hitTestTick(column: PreviewColumn, x: number, y: number): number | null {
  if (x < FIELD_LEFT || x > FIELD_LEFT + columnField(column).width) return null;
  const tick = column.startTick + (column.bottomY - y) / column.pixelsPerTick;
  return tick >= column.startTick && tick <= column.lookAheadEndTick ? tick : null;
}
