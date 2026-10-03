import { expect, test } from "bun:test";

import { parseUgcChart } from "./parser.js";

// Authored text examples exercise the published UGC grammar. No converted beatmap data.
const encode = (text: string) => new TextEncoder().encode(text);
const parse = (body: string) => parseUgcChart(encode(`@VER\t8\n@BPM\t0'0\t120\n${body}`));

test("reads all ten note families, widths, air heights, controls and timeline annotations", () => {
  const result = parse(
    [
      "@USETIL\t2",
      "@TIL\t2\t0'0\t0.5",
      "@SPDMOD\t1'0\t2",
      "#0'0:t02",
      "#0'0:a02ULI",
      "#0'120:x44D",
      "#0'240:f82R",
      "#0'360:dC2",
      "#1'0:h04",
      "#480:s",
      "#2'0:s44",
      "#240:c82",
      "#960:sC4",
      "#3'0:t02",
      "#3'0:H02N",
      "#240:s",
      "#960:c",
      "#4'0:t44",
      "#4'0:S4428I",
      "#240:c6228",
      "#960:s8428",
      "#5'0:C04280,120",
      "#480:c8228",
      "#6'0:C8428Z,0",
      "#960:cC228",
    ].join("\n"),
  );
  expect(result.diagnostics).toEqual([]);
  const chart = result.chart!;
  expect(new Set(chart.notes.map((note) => note.kind)).size).toBe(10);
  expect(chart.notes.every((note) => note.timeline === 2)).toBe(true);
  expect(chart.speeds.map((event) => event.timeline)).toEqual([2, null]);
  const air = chart.notes.find((note) => note.kind === "air")!;
  expect(air.pairId).toBe(chart.notes[0].id);
  expect(air.direction).toBe("UL");
  expect(air.color).toBe("I");
  const slide = chart.notes.find((note) => note.kind === "slide")!;
  expect(slide.children.map((point) => [point.width, point.action])).toEqual([
    [2, false],
    [4, true],
  ]);
  expect(chart.notes.find((note) => note.kind === "airSlide")!.height).toBe(80);
  expect(chart.notes.at(-1)!.interval).toBe(0);
  expect(structuredClone(chart)).toEqual(chart);
});

test("source bars use the meter and resolution regardless of declaration order", () => {
  const chart = parse("@BEAT\t0\t3\t4\n#2'120:t02\n@TICKS\t960").chart!;
  expect(chart.notes[0].tick).toBe(5880);
  expect(chart.ticksPerQuarter).toBe(960);
});

test("ground hold children retain step and control types", () => {
  const result = parse("#0'0:h04\n#120>c\n#240:s\n#480>c04\n#960>s04");

  expect(result.diagnostics).toEqual([]);
  expect(result.chart!.notes[0].children.map((point) => [point.tick, point.action])).toEqual([
    [120, false],
    [240, true],
    [480, false],
    [960, true],
  ]);
});

test("editor metadata does not mark the preview as partial", () => {
  const result = parse(
    [
      "@FLDIMG\tfield.png",
      "@ATINFO\tARTIST\tExample artist",
      "@ATINFO\tDESIGNER\tExample designer",
      "@DLURL\thttps://example.invalid/beatmap",
      "@COPYRIGHT\tExample attribution",
      "@LICENSE\tExample license",
      "@CMT\tExample comment",
      "@ARTIST\tExample artist",
      "@DESIGN\tExample designer",
      "#0'0:t63",
    ].join("\n"),
  );
  expect(result.diagnostics).toEqual([]);
  expect(result.chart!.notes).toHaveLength(1);
  expect(result.chart!.metadata.artist).toBe("Example artist");
  expect(result.chart!.metadata.designer).toBe("Example designer");
});

test("AIR-HOLD accepts compact and explicit-height heads and children", () => {
  const result = parse(
    [
      "#0'0:t63",
      "#0'0:H633CN",
      "#120>s633W",
      "#240>c634G",
      "#1'0:tA2",
      "#1'0:HA2I",
      "#240:s",
      "#480:c",
    ].join("\n"),
  );
  expect(result.diagnostics).toEqual([]);
  const holds = result.chart!.notes.filter((note) => note.kind === "airHold");
  expect(holds.map((note) => [note.height, note.color])).toEqual([
    [120, "N"],
    [80, "I"],
  ]);
  expect(holds[0].children.map((point) => [point.height, point.action])).toEqual([
    [140, true],
    [160, false],
  ]);
  expect(holds[1].children.map((point) => [point.lane, point.width, point.height])).toEqual([
    [10, 2, 80],
    [10, 2, 80],
  ]);
});

test("meter changes align long endpoints, air pairs and timing events", () => {
  const result = parse(
    [
      "#1'0:h23",
      "#1440>s",
      "#2'0:a23UCN",
      "#3'0:s54",
      "#1440>c84",
      "#2880>sC2",
      "#4'0:SC23CI",
      "#120>cC23W",
      "@BPM\t2'0\t180",
      "@TIL\t2\t4'0\t0.5",
      "@SPDMOD\t5'0\t0.75",
      "@BEAT\t4\t1\t16",
      "@BEAT\t0\t3\t4",
      "@BEAT\t2\t6\t4",
    ].join("\n"),
  );
  expect(result.diagnostics).toEqual([]);
  const [hold, air, slide, airSlide] = result.chart!.notes;
  expect(hold.tick).toBe(1440);
  expect(air.tick).toBe(2880);
  expect(air.pairId).toBe(hold.children[0].id);
  expect(slide.tick).toBe(5760);
  expect(airSlide.tick).toBe(8640);
  expect(airSlide.pairId).toBe(slide.children.at(-1)!.id);
  expect(result.chart!.tempos[1].tick).toBe(2880);
  expect(result.chart!.speeds.map((event) => event.tick)).toEqual([8640, 8760]);
});

test("same-bar meter overrides and overflow offsets preserve absolute ticks", () => {
  const result = parse(
    "@BEAT\t0\t3\t4\n@BEAT\t0\t6\t4\n#0'3000:t62\n#1'120:tA2\n@BEAT\t2\t1\t4\n#3'0:t82",
  );
  expect(result.diagnostics).toEqual([]);
  expect(result.chart!.notes.map((note) => note.tick)).toEqual([3000, 3000, 6240]);
});

test("UTF-8, BOM and CP932 preserve exact music references", () => {
  const result = parseUgcChart(encode("\uFEFF@MAINBPM\t120\r\n@BGM\t音楽.wav"));
  expect(result.chart!.metadata.bgm).toBe("音楽.wav");
  const cp932 = new Uint8Array([...encode("@MAINBPM\t120\n@TITLE\t"), 0x82, 0xa0]);
  expect(parseUgcChart(cp932).chart!.metadata.title).toBe("あ");
  expect(parseUgcChart(cp932).chart!.encoding).toBe("shift_jis");
  expect(parseUgcChart(new Uint8Array([0x81])).diagnostics[0].code).toBe("encoding");
});

test("fatal diagnostics identify malformed timing and structural source lines", () => {
  for (const body of [
    "@BPM\t0'0\t0",
    "@BEAT\t0\t-1\t4",
    "@TICKS\t0",
    "#120:s",
    "#0'0:h04",
    "#0'0:a04UCN",
    "#0'0:t00",
    "#0'0:s04\n#480:s84\n#240:c42",
    "#0'0:s04\n#9007199254740992:s84",
    "@FLAG\tSOFFSET\tMAYBE",
  ]) {
    const result = parse(body);
    expect(result.chart).toBeNull();
    expect(result.diagnostics.some((item) => item.severity === "error" && item.line >= 3)).toBe(
      true,
    );
  }
  expect(parseUgcChart(encode("unrecognized input")).chart).toBeNull();
});

test("unsupported roots and children cannot silently change neighboring notes", () => {
  const result = parse("#0'0:s04\n#480:s44\n#1'0:q02\n#480:s82\n#2'0:t02\n@FUTURE\t1");
  expect(result.chart!.notes.map((note) => note.kind)).toEqual(["slide", "tap"]);
  expect(result.chart!.notes[0].children).toHaveLength(1);
  expect(result.diagnostics.map((item) => item.code)).toEqual(["note-kind", "directive"]);
});

test("legacy curves omit the complete ribbon and its paired air", () => {
  const result = parse("#0'0:s04\n#120:b42\n#960:s84\n#0'0:a04UCN\n#2'0:t82");
  expect(result.chart!.notes.map((note) => note.kind)).toEqual(["tap"]);
  expect(result.diagnostics.map((item) => item.code)).toEqual(["curve", "pair-omitted"]);
});

test("air pairs are order independent, include long endpoints and stay on their timeline", () => {
  const result = parse("#1'0:H04N\n#480>s\n#1'0:a04DRI\n#0'0:h04\n#1920>s");
  expect(result.diagnostics).toEqual([]);
  const [airHold, hold] = result.chart!.notes;
  expect(airHold.direction).toBe("DR");
  expect(airHold.pairId).toBe(hold.children[0].id);
  expect(parse("#0'0:t04\n@USETIL\t1\n#0'0:a04UCN").chart).toBeNull();
});

test("EXLONG is opt-in and head-only crushes have no generated sustain actions", () => {
  const chart = parse(
    "@FLAG\tEXLONG\tTRUE\n#0'0:x04U\n#0'0:h04\n#480:s\n#1'0:C8428A,$\n#480:cC228",
  ).chart!;
  expect(chart.notes[1].ex).toBe(true);
  expect(chart.notes[1].effect).toBe("U");
  expect(chart.notes[2].interval).toBeNull();
  expect(chart.notes[2].children[0].action).toBe(false);
});

test("undocumented private-use coordinates and attributes are visibly partial", () => {
  const result = parse("#0'0:t\uE0014\n#1'0:x04U!\n#2'0:t24\n#2'0:a24UCR");
  expect(result.chart).not.toBeNull();
  expect(result.diagnostics.map((item) => item.code)).toEqual(["note-kind", "appearance", "color"]);
  expect(result.chart!.notes.at(-1)!.color).toBe("N");
});

test("diagnostics and file allocations are bounded", () => {
  const result = parse(Array.from({ length: 700 }, () => "@BPM\t0'0\tbad").join("\n"));
  expect(result.chart).toBeNull();
  expect(result.diagnostics).toHaveLength(500);
  expect(parseUgcChart(new Uint8Array(16 * 1024 * 1024 + 1)).diagnostics[0].code).toBe("size");
});
