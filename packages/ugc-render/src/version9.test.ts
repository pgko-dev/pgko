import { expect, test } from "bun:test";

import { measureField } from "./field.js";
import {
  COLUMN_WIDTH,
  FIELD_LEFT,
  FIELD_WIDTH,
  columnAtX,
  columnField,
  columnOffset,
  columnWidth,
  createLayout,
  hitTestTick,
  layoutWidth,
  tickY,
} from "./layout.js";
import { NoteGeometry } from "./note-geometry.js";
import { parseUgcChart } from "./parser.js";
import { createPortraitLayout, portraitColumn } from "./portrait.js";
import { buildHitTimes, createTiming } from "./timing.js";

function parse(body: string, version = 9) {
  return parseUgcChart(new TextEncoder().encode(`@VER\t${version}\n@BPM\t0'0\t120\n${body}`));
}

test("numeric and case-insensitive editor flags retain their values in v8 and v9", () => {
  for (const version of [8, 9]) {
    for (const [on, off] of [
      ["1", "0"],
      ["true", "false"],
      ["Yes", "No"],
      ["TRUE", "FALSE"],
    ]) {
      for (const enabled of [true, false]) {
        const value = enabled ? on : off;
        const lane = version === 8 ? "0" : "G";
        const height = enabled ? "28" : "8";
        const result = parse(
          [
            ...["SOFFSET", "EXFIELD", "EXLONG", "HIPRECISION"].map(
              (name) => `@FLAG\t${name}\t${value}`,
            ),
            `@FLAG\tCLICK\t${on}`,
            `@FLAG\tDIFFTTL\t${off}`,
            `#0'0:x${lane}4D`,
            `#0'0:h${lane}4`,
            "#480>s",
            `#1'0:C${lane}4${height}0${version === 9 ? "N" : ""},0`,
            `#480>c${lane}4${height}`,
          ].join("\n"),
          version,
        );
        expect(result.diagnostics).toEqual([]);
        const chart = result.chart!;
        expect(chart.metadata.startOffset).toBe(enabled);
        expect(chart.metadata.extendedField).toBe(enabled);
        expect(chart.notes[1].ex).toBe(enabled);
        expect(chart.notes[2].height).toBe(80);
        expect(chart.notes[2].children[0].height).toBe(80);
      }
    }
  }
});

test("v8 and v9 retain identical geometry, pairing, timing and EX effects", () => {
  const common = "@FLAG\tHIPRECISION\tTRUE\n@EXVER\t1\n";
  const old = parse(
    common +
      [
        "#0'0:x04D",
        "#0'0:h04",
        "#480>s",
        "#0'0:a04ULI",
        "#1'0:s44",
        "#240>c82",
        "#480>sC4",
        "#1'480:SC428N",
        "#240>cC43C",
        "#480>sC428",
        "#2'0:t04",
        "#2'0:H04I",
        "#480>s",
        "#3'0:f44R",
        "#3'240:d84",
        "#4'0:C04280,120",
        "#480>c8428",
      ].join("\n"),
    8,
  );
  const current = parse(
    common +
      [
        "#0'0:xG4D",
        "#0'0:hG4",
        "#480>s",
        "#0'0:aG4ULI",
        "#1'0:sK40",
        "#240>cO2",
        "#480>sS4",
        "#1'480:SS428N",
        "#240>cS43C",
        "#480>sS428",
        "#2'0:tG4",
        "#2'0:HG4I",
        "#480>s",
        "#3'0:fK4R",
        "#3'240:dO4",
        "#4'0:CG4280N,120",
        "#480>cO428",
      ].join("\n"),
  );
  expect(old.diagnostics).toEqual([]);
  expect(current.diagnostics).toEqual([]);
  expect(current.chart!.notes.map(({ axis: _axis, ...note }) => note)).toEqual(old.chart!.notes);
  expect(buildHitTimes(current.chart!, createTiming(current.chart!))).toEqual(
    buildHitTimes(old.chart!, createTiming(old.chart!)),
  );
});

test("v9 lanes are case sensitive and offset even when EXFIELD is disabled", () => {
  for (const flag of ["TRUE", "FALSE"]) {
    const result = parse(
      `@FLAG\tEXFIELD\t${flag}\n#0'0:t0G\n#0'240:tG4\n#0'480:tW1\n#0'720:tl1\n#0'960:tL1`,
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.chart!.metadata.extendedField).toBe(flag === "TRUE");
    expect(result.chart!.notes.map(({ lane, width }) => [lane, width])).toEqual([
      [-16, 16],
      [0, 4],
      [16, 1],
      [31, 1],
      [5, 1],
    ]);
  }
  expect(parse("#0'0:tA2\n#0'240:ta2", 8).chart!.notes.map(({ lane }) => lane)).toEqual([10, 10]);
  expect(parse("#0'0:t?4").chart).toBeNull();
  expect(parse("#0'0:tG4", 10).diagnostics[0].code).toBe("version");
});

test("height precision shifts color and axis fields and keeps compact AIR-SLIDE children", () => {
  for (const version of [8, 9]) {
    for (const high of [false, true]) {
      const lane = version === 8 ? "0" : "G";
      const height = high ? "28" : "8";
      const result = parse(
        [
          `@FLAG\tHIPRECISION\t${high ? "TRUE" : "FALSE"}`,
          `#0'0:t${lane}4`,
          `#0'0:S${lane}4${height}I`,
          "#120>s",
          `#240>c${lane}4`,
          `#480>s${lane}4${height}`,
          ...["N", "Y", "Z"].flatMap((axis, index) => [
            `#${index + 1}'0:C${lane}4${height}Y${version === 9 ? axis : ""},0`,
            `#480>c${lane}4${height}`,
          ]),
        ].join("\n"),
        version,
      );
      expect(result.diagnostics).toEqual([]);
      const air = result.chart!.notes[1];
      expect(air.height).toBe(80);
      expect(air.color).toBe("I");
      expect(air.children.map(({ height }) => height)).toEqual([80, 80, 80]);
      expect(
        result.chart!.notes.slice(2).map(({ color, height, axis }) => [color, height, axis]),
      ).toEqual(["N", "Y", "Z"].map((axis) => ["Y", 80, version === 9 ? axis : undefined]));
    }
  }
  expect(parse("#0'0:CG48YZ,0\n#480>cG48").chart!.notes[0].axis).toBe("Z");
});

test("transparent slides keep actions and clipped controls without drawing a ribbon", () => {
  const result = parse("#0'0:sG4Z\n#240>cK0\n#480>sO4");
  expect(result.diagnostics).toEqual([]);
  const note = result.chart!.notes[0];
  expect(note.children.map(({ noLine, width, action }) => [noLine, width, action])).toEqual([
    [true, 0, false],
    [true, 4, true],
  ]);
  expect(new NoteGeometry(note).visible(0, 480)).toEqual([]);
  expect(buildHitTimes(result.chart!, createTiming(result.chart!))).toEqual([0, 0.5]);
  for (const source of ["#0'0:tG0", "#0'0:sG4\n#480>sO0"]) expect(parse(source).chart).toBeNull();
  expect(parse("#0'0:s04\n#480>c40", 8).chart).toBeNull();
});

test("only columns containing extended objects grow, with matching offsets and seek bounds", () => {
  const chart = parse("@FLAG\tEXFIELD\tTRUE\n#0'240:tG4\n#5'240:t04\n#5'480:tl1\n#9'0:tG4").chart!;
  const layout = createLayout(chart);
  const [first, extended, last] = layout.columns;
  expect(layout.columns.map(({ field }) => field)).toEqual([
    { minLane: 0, maxLane: 16 },
    { minLane: -16, maxLane: 32 },
    { minLane: 0, maxLane: 16 },
  ]);
  expect(columnWidth(first)).toBe(COLUMN_WIDTH);
  expect(columnWidth(extended)).toBe(COLUMN_WIDTH + FIELD_WIDTH * 2);
  expect(columnOffset(last)).toBe(COLUMN_WIDTH * 2 + FIELD_WIDTH * 2);
  expect(layoutWidth(layout)).toBe(COLUMN_WIDTH * 3 + FIELD_WIDTH * 2);
  for (const column of layout.columns) {
    expect(columnAtX(layout, columnOffset(column))).toBe(column);
    const x = FIELD_LEFT + columnField(column).width - 1;
    expect(hitTestTick(column, x, tickY(column, column.startTick + 240))).toBeCloseTo(
      column.startTick + 240,
    );
    expect(hitTestTick(column, x + 2, tickY(column, column.startTick))).toBeNull();
  }
  const empty = createLayout(parse("@FLAG\tEXFIELD\tTRUE").chart!);
  expect(columnWidth(empty.columns[0])).toBe(COLUMN_WIDTH);
});

test("field bounds include crossing segments and look-ahead without distant endpoints", () => {
  const chart = parse("#0'0:sG40\n#7680>sG4\n#15360>sl1").chart!;
  expect(createLayout(chart).columns[0].field).toEqual({ minLane: 0, maxLane: 16 });
  expect(measureField(chart.notes, 12000, 13000).maxLane).toBeGreaterThan(16);
  const boundary = parse("#4'120:t04\n#9'0:tG4").chart!;
  expect(createLayout(boundary).columns[0].field!.minLane).toBe(-16);
});

test("portrait fits both extended edges and preserves bounds across tile windows", () => {
  const chart = parse("#0'0:t04\n#1'0:tl1").chart!;
  for (const width of [320, 900]) {
    const view = createPortraitLayout(chart, 0.5, width, 568);
    const column = portraitColumn(view, view.scrollRange / 2);
    expect(column.field).toEqual({ minLane: -16, maxLane: 32 });
    const left = view.offsetX + FIELD_LEFT * view.scale;
    const right = left + columnField(column).width * view.scale;
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThan(width);
    expect(
      hitTestTick(
        column,
        FIELD_LEFT + columnField(column).width - 1,
        tickY(column, column.startTick),
      ),
    ).toBe(column.startTick);
  }
});
