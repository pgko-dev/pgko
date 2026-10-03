import { measureBars } from "./bars.js";
import { FIELD_LEFT, FIELD_WIDTH, type ChartLayout, type PreviewColumn } from "./layout.js";
import type { UgcChart } from "./types.js";

const BOTTOM_MARGIN = 48;
// Keep the native scrollbar within browser element-size limits, even for extreme beatmaps.
const MAX_SCROLL_HEIGHT = 8_000_000;

export type PortraitLayout = {
  layout: ChartLayout;
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  pixelsPerTick: number;
  scrollRange: number;
};

/** Continuous upward time, with MargreteOnline's independent field width and beat spacing. */
export function createPortraitLayout(
  chart: UgcChart,
  zoom: number,
  width: number,
  height: number,
): PortraitLayout {
  if (!Number.isFinite(zoom) || zoom < 0.5 || zoom > 2)
    throw new RangeError("Invalid preview zoom.");
  if (![width, height].every((value) => Number.isFinite(value) && value > 0))
    throw new RangeError("Invalid preview size.");

  const bars = measureBars(chart);
  const endTick = bars.at(-1)!.endTick;
  const availableWidth = Math.max(1, width - 16);
  const fieldWidth = Math.min(availableWidth, Math.max(100, Math.min(availableWidth, 400) - 128));
  const scale = fieldWidth / FIELD_WIDTH;
  const offsetX = (availableWidth - fieldWidth) / 2 - FIELD_LEFT * scale;
  // MargreteOnline's default: 480 ticks per quarter, at 0.1 screen pixels per tick.
  const pixelsPerTick = (96 * zoom) / chart.ticksPerQuarter;
  const column: PreviewColumn = {
    index: 0,
    startTick: 0,
    packedEndTick: endTick,
    lookAheadEndTick: endTick,
    pixelsPerTick: pixelsPerTick / scale,
    bottomY: (height - BOTTOM_MARGIN) / scale,
  };
  return {
    layout: { bars, columns: [column], endTick, canvasHeight: height / scale },
    width,
    height,
    scale,
    offsetX,
    pixelsPerTick,
    scrollRange: Math.min(endTick * pixelsPerTick, MAX_SCROLL_HEIGHT),
  };
}

/** The start is at the bottom of the scrollbar; the final bar is at the top. */
export function portraitScrollTop(view: PortraitLayout, tick: number): number {
  return view.scrollRange * (1 - Math.max(0, Math.min(tick / view.layout.endTick, 1)));
}

/** A viewport-sized slice for the shared painter, without splitting bars or long notes. */
export function portraitColumn(view: PortraitLayout, scrollTop: number): PreviewColumn {
  const { layout, height, scale, pixelsPerTick, scrollRange } = view;
  const anchorTick = (1 - Math.max(0, Math.min(scrollTop / scrollRange, 1))) * layout.endTick;
  const bottomY = height - BOTTOM_MARGIN + anchorTick * pixelsPerTick;
  const startTick = Math.max(0, (bottomY - height) / pixelsPerTick);
  const endTick = Math.min(layout.endTick, bottomY / pixelsPerTick);
  return {
    index: 0,
    startTick,
    packedEndTick: endTick,
    lookAheadEndTick: endTick,
    pixelsPerTick: pixelsPerTick / scale,
    bottomY: (bottomY - startTick * pixelsPerTick) / scale,
  };
}
