import { expect, test } from "bun:test";

import { FIELD_LEFT, FIELD_WIDTH, hitTestTick, tickY } from "./layout.js";
import { parseUgcChart } from "./parser.js";
import { createPortraitLayout, portraitColumn, portraitScrollTop } from "./portrait.js";

const chart = (source = "#31'0:t04") =>
  parseUgcChart(new TextEncoder().encode(`@BPM\t0'0\t120\n${source}`)).chart!;

test("portrait keeps one continuous field and independent horizontal and musical scales", () => {
  const model = chart("@BEAT\t0\t3\t4\n@BEAT\t1\t6\t4\n#31'0:t04");
  const narrow = createPortraitLayout(model, 0.5, 320, 568);
  const wide = createPortraitLayout(model, 0.5, 900, 900);
  const zoomed = createPortraitLayout(model, 2, 320, 568);
  expect(narrow.layout.columns).toHaveLength(1);
  expect(wide.scale * FIELD_WIDTH).toBe(272);
  expect(narrow.scale * FIELD_WIDTH).toBe(176);
  expect(narrow.pixelsPerTick).toBe(wide.pixelsPerTick);
  expect(narrow.pixelsPerTick * model.ticksPerQuarter).toBe(48);
  expect(zoomed.pixelsPerTick).toBe(narrow.pixelsPerTick * 4);
  expect(zoomed.scale).toBe(narrow.scale);
  expect(narrow.layout.bars[1].startTick).toBe(model.ticksPerQuarter * 3);
  expect(narrow.layout.bars[2].startTick).toBe(model.ticksPerQuarter * 9);
});

test("scrolling, following and seeking agree at the start, middle and last bar", () => {
  const model = chart();
  for (const zoom of [0.5, 1, 2]) {
    const view = createPortraitLayout(model, zoom, 390, 568);
    for (const tick of [0, 480, 3840, view.layout.endTick]) {
      const top = portraitScrollTop(view, tick);
      const column = portraitColumn(view, top);
      const y = tickY(column, tick);
      expect(y * view.scale).toBeCloseTo(520);
      expect(hitTestTick(column, FIELD_LEFT + 10, y)).toBeCloseTo(tick);
      expect(hitTestTick(column, 0, y)).toBeNull();
    }
    expect(portraitScrollTop(view, -1)).toBe(view.scrollRange);
    expect(portraitScrollTop(view, view.layout.endTick + 1)).toBe(0);
  }
});

test("empty, oversized and extreme bars retain spacing with bounded scroll height", () => {
  for (const source of ["", "@BEAT\t0\t40\t4\n#0'0:t04", "#90000'0:t04"]) {
    const model = chart(source);
    const view = createPortraitLayout(model, 2, 320, 200);
    expect(view.layout.columns).toHaveLength(1);
    expect(view.scrollRange).toBeLessThanOrEqual(8_000_000);
    expect(view.pixelsPerTick * model.ticksPerQuarter).toBe(192);
    const column = portraitColumn(view, view.scrollRange / 2);
    expect(tickY(column, view.layout.endTick / 2) * view.scale).toBeCloseTo(152);
    expect(column.lookAheadEndTick - column.startTick).toBeLessThanOrEqual(
      200 / view.pixelsPerTick,
    );
  }
});
