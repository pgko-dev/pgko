import { expect, test } from "bun:test";

import {
  columnAtTick,
  createLayout,
  FIELD_LEFT,
  hitTestTick,
  tickY,
  CONTENT_HEIGHT,
  CANVAS_HEIGHT,
  LOOK_AHEAD,
  NOTE_PADDING,
  PREVIEW_ZOOMS,
} from "./layout.js";
import { NoteIndex } from "./note-index.js";
import { parseUgcChart } from "./parser.js";
import { prepareChart } from "./prepare.js";
import { buildHitTimes, createTiming, HitQueue } from "./timing.js";

function chart(body = "") {
  const result = parseUgcChart(
    new TextEncoder().encode(`@VER\t8\n@TICKS\t480\n@BPM\t0'0\t120\n${body}`),
  );
  if (!result.chart) throw new Error(JSON.stringify(result.diagnostics));
  return result.chart;
}

test("whole-bar columns preserve time, bottom alignment, look-ahead and ownership", () => {
  const layout = createLayout(chart("#8'0:t04"));
  expect(layout.columns.map((column) => column.startTick)).toEqual([0, 7680, 15360]);
  expect(layout.columns[0].lookAheadEndTick).toBe(7860);
  expect(columnAtTick(layout, 7680).index).toBe(1);
  expect(columnAtTick(layout, layout.endTick).index).toBe(2);
  const first = layout.columns[0];
  expect(hitTestTick(first, FIELD_LEFT, tickY(first, 7770))).toBe(7770);
  expect(hitTestTick(first, 0, 500)).toBeNull();
});

test("3/4, 6/4, meter changes, empty beatmap and oversized bars", () => {
  const three = createLayout(chart("@BEAT\t0\t3\t4\n#8'0:t04"));
  expect(three.columns[0].packedEndTick).toBe(7200);
  const six = createLayout(chart("@BEAT\t0\t6\t4\n#8'0:t04"));
  expect(six.columns[0].packedEndTick).toBe(5760);
  const changed = createLayout(chart("@BEAT\t2\t3\t4\n#4'0:t04"));
  expect(changed.bars[3].startTick).toBe(5280);
  expect(createLayout(chart()).columns).toHaveLength(1);
  const large = createLayout(chart("@BEAT\t0\t40\t4\n#0'960:t04"));
  expect(large.columns.map((column) => column.packedEndTick)).toEqual([19200]);
  expect(large.columns[0].pixelsPerTick * 19200).toBe(CONTENT_HEIGHT);
});

test("time conversions span BPM boundaries and apply offsets once", () => {
  const model = chart(
    "@FLAG\tSOFFSET\tTRUE\n@BEAT\t0\t3\t4\n@BGMOFS\t-0.25\n@BPM\t1'0\t240\n#3'0:t04",
  );
  const timing = createTiming(model);
  expect(timing.leadIn).toBe(1.5);
  expect(timing.audioStart).toBe(1.25);
  expect(model.tempos[1].tick).toBe(1440);
  expect(timing.tickToSeconds(1440)).toBe(3);
  expect(timing.tickToSeconds(1920)).toBe(3.25);
  expect(timing.tickToSeconds(3840)).toBe(4.25);
  for (const tick of [-240, 0, 480, 1920, 3000, 5760]) {
    expect(timing.secondsToTick(timing.tickToSeconds(tick))).toBeCloseTo(tick, 8);
  }
  expect(createTiming(chart("@BGMOFS\t0.25")).audioStart).toBe(0.25);
});

test("hit events coalesce chords and omit sustain ticks, controls and damage", () => {
  const model = chart(
    "#0'0:t04\n#0'0:t44\n#0'0:a04UCN\n#0'120:d04\n#0'240:h04\n#480>s\n#1'0:s04\n#120>c44\n#480>s84\n#2'0:C04280,120\n#480>c8428",
  );
  const times = buildHitTimes(model, createTiming(model));
  expect(times).toEqual([0, 0.25, 0.75, 2, 2.5, 4, 4.125, 4.25, 4.375]);
  const queue = new HitQueue(times);
  expect(queue.take(0, 0.1)).toEqual([0]);
  expect(queue.take(0, 0.1)).toEqual([]);
  expect(queue.take(2, 2.1)).toEqual([2]);
  queue.reset(0.25);
  expect(queue.take(0.25, 0.35)).toEqual([0.25]);
});

test("hold releases sound once, coalesce with other actions and leave control points silent", () => {
  const model = chart(
    "@FLAG\tSOFFSET\tTRUE\n@BPM\t0'480\t240\n#0'0:h04\n#120>c\n#480>s\n#0'0:h44\n#480>s\n#0'480:t84\n#0'960:h04\n#480>s",
  );
  const timing = createTiming(model);
  const hits = buildHitTimes(model, timing);
  expect(hits).toEqual([2, 2.5, 2.75, 3]);
  const queue = new HitQueue(hits);
  queue.reset(2.4);
  expect(queue.take(2.45, 2.55)).toEqual([2.5]);
  expect(queue.take(2.5, 2.6)).toEqual([]);

  const ending = chart("#0'0:h04\n#1920>s");
  const endingTiming = createTiming(ending);
  expect(endingTiming.chartEnd).toBe(2);
  expect(buildHitTimes(ending, endingTiming)).toEqual([0, 2]);
});

test("hold steps sound whether intermediate or final, and control endpoints stay silent", () => {
  const model = chart(
    [
      "#0'0:h04",
      "#120>c",
      "#240>s",
      "#480>c",
      "#720>s",
      "#960>c",
      "#0'1200:h44",
      "#480>s",
      "#0'1680:t84",
    ].join("\n"),
  );

  expect(buildHitTimes(model, createTiming(model))).toEqual([0, 0.25, 0.75, 1.25, 1.75]);
});

test("bar navigation and hit times agree across meter and tempo changes", () => {
  const model = chart(
    [
      "@BEAT\t0\t3\t4",
      "@BEAT\t1\t6\t4",
      "@BEAT\t2\t1\t16",
      "@BPM\t1'0\t240",
      "#0'0:h63",
      "#1440>s",
      "#1'0:H633CI",
      "#2880>c634G",
    ].join("\n"),
  );
  const layout = createLayout(model);
  const timing = createTiming(model);
  expect(layout.bars.map((bar) => bar.startTick)).toEqual([0, 1440]);
  expect(layout.bars.map((bar) => timing.tickToSeconds(bar.startTick))).toEqual([0, 1.5]);
  expect(buildHitTimes(model, timing)).toEqual([0, 1.5]);
  expect(timing.chartEnd).toBe(3);
});

test("zoom repacks whole bars without changing time or seek coordinates", () => {
  const model = chart("@BEAT\t0\t3\t4\n@BEAT\t2\t6\t4\n@BEAT\t4\t1\t32\n#6'0:t04");
  for (const zoom of PREVIEW_ZOOMS) {
    const layout = createLayout(model, zoom);
    expect(layout.endTick).toBe(createLayout(model).endTick);
    for (const column of layout.columns) {
      expect(layout.bars.some((bar) => bar.startTick === column.startTick)).toBe(true);
      expect(layout.bars.some((bar) => bar.endTick === column.packedEndTick)).toBe(true);
      const height = (column.packedEndTick - column.startTick) * column.pixelsPerTick;
      expect(height).toBeLessThanOrEqual(CONTENT_HEIGHT + 1e-8);
      const tick = (column.startTick + column.packedEndTick) / 2;
      expect(hitTestTick(column, FIELD_LEFT, tickY(column, tick))).toBeCloseTo(tick, 8);
    }
  }
  expect(createLayout(chart("#7'0:t04"), 0.5).columns).toHaveLength(2);
  expect(createLayout(chart("#7'0:t04"), 1).columns).toHaveLength(4);
  expect(createLayout(chart("#7'0:t04"), 2).columns).toHaveLength(8);
});

test("200% uses proportional spacing and packs multiple bars when they fit", () => {
  const model = chart("@BEAT\t0\t2\t4\n#7'0:t04");
  const layout = createLayout(model, 2);
  expect(layout.columns).toHaveLength(4);
  const heightAt = (zoom: number) => {
    const column = createLayout(model, zoom).columns[0];
    return tickY(column, 0) - tickY(column, 480);
  };
  expect(heightAt(2)).toBe(heightAt(1) * 2);
  expect(heightAt(2)).toBeCloseTo((heightAt(1.5) * 4) / 3);
  const three = createLayout(chart("@BEAT\t0\t3\t4\n#3'0:t04"), 2);
  expect(tickY(three.columns[0], 0) - tickY(three.columns[0], 1440)).toBe(768);
  const taller = createLayout(chart("#7'0:t04"), 2, CANVAS_HEIGHT + CONTENT_HEIGHT);
  expect(taller.columns).toHaveLength(4);
});

test("playback ends at the occupied bar boundary, including passive tails and offsets", () => {
  for (const body of ["#0'480:t04", "#0'0:h04\n#1920>s"]) {
    expect(createTiming(chart(body)).chartEnd).toBe(2);
  }
  expect(createTiming(chart("#1'0:t04")).chartEnd).toBe(4);
  const model = chart(
    "@FLAG\tSOFFSET\tTRUE\n@BEAT\t1\t3\t4\n@BPM\t1'0\t240\n@BGMOFS\t20\n#1'240:t04",
  );
  expect(createTiming(model).chartEnd).toBe(4.75);
  expect(createTiming(chart()).chartEnd).toBe(2);
});

test("available height repacks columns without changing time or seek coordinates", () => {
  const model = chart("@BEAT\t0\t3\t4\n@BEAT\t2\t6\t4\n#9'0:t04");
  const original = createLayout(model);
  for (const canvasHeight of [400, CANVAS_HEIGHT, 2000]) {
    for (const zoom of [0.5, 2]) {
      const layout = createLayout(model, zoom, canvasHeight);
      const contentHeight = canvasHeight - LOOK_AHEAD - NOTE_PADDING * 2;
      expect(layout.canvasHeight).toBe(canvasHeight);
      expect(layout.bars).toEqual(original.bars);
      expect(layout.endTick).toBe(original.endTick);
      for (const column of layout.columns) {
        expect(tickY(column, column.startTick)).toBe(canvasHeight - NOTE_PADDING);
        expect(tickY(column, column.lookAheadEndTick)).toBeGreaterThanOrEqual(NOTE_PADDING - 1e-8);
        const tick = (column.startTick + column.packedEndTick) / 2;
        expect(hitTestTick(column, FIELD_LEFT, tickY(column, tick))).toBeCloseTo(tick, 8);
        expect(hitTestTick(column, FIELD_LEFT, canvasHeight)).toBeNull();
        expect(
          (column.packedEndTick - column.startTick) * column.pixelsPerTick,
        ).toBeLessThanOrEqual(contentHeight + 1e-8);
      }
    }
  }
  expect(createLayout(model, 0.5, 400).columns.length).toBeGreaterThan(original.columns.length);
  expect(createLayout(model, 0.5, 2000).columns.length).toBeLessThan(original.columns.length);
  for (const invalidHeight of [0, NOTE_PADDING * 2 + LOOK_AHEAD, Number.NaN, Infinity]) {
    expect(() => createLayout(model, 0.5, invalidHeight)).toThrow("Invalid preview height.");
  }
});

test("interval queries retain crossing ribbons in stable source order", () => {
  const model = chart("#0'0:s04\n#24000>s84\n#5'0:t04\n#9'0:t04");
  const index = new NoteIndex(model.notes);
  expect(index.query(15000, 18000).map((note) => note.id)).toEqual([
    model.notes[0].id,
    model.notes[2].id,
  ]);
});

test("zero-length visual bars cannot hang layout or drop later notes", () => {
  const model = chart("@BEAT\t2\t0\t4\n#6'240:t04");
  const terminal = createLayout(model);
  expect(model.lastTick).toBe(4080);
  expect(terminal.endTick).toBeGreaterThan(model.lastTick);
  expect(terminal.bars.at(-1)!.numerator).toBe(0);
  const intermediate = createLayout(chart("@BEAT\t1\t0\t4\n@BEAT\t3\t3\t4\n#2'0:t04"));
  expect(intermediate.bars[1].index).toBe(3);
  expect(intermediate.bars[1].startTick).toBe(1920);
});

test("excessive layout and non-finite timing fail preparation instead of crashing the UI", () => {
  for (const body of ["@BEAT\t0\t99999999\t4", "@BPM\t0'0\t1e-320\n#1'0:t04"]) {
    const prepared = prepareChart(new TextEncoder().encode(`@BPM\t0'0\t120\n${body}`));
    expect(prepared.chart).toBeNull();
    expect(prepared.diagnostics.at(-1)!.code).toBe("limit");
  }
});
