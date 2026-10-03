// Format reference: inonote's published Umiguri Chart v8 specification.
// https://gist.github.com/inonote/5c01e73781cab17765a1d93641d52298
import type {
  ChartDiagnostic,
  ChartNote,
  ChartParseResult,
  ChartPoint,
  NoteKind,
  UgcChart,
} from "./types.js";

const MAX_BYTES = 16 * 1024 * 1024;
const MAX_NOTES = 200_000;
const NOTE_TYPES: Record<string, NoteKind> = {
  t: "tap",
  x: "exTap",
  f: "flick",
  d: "damage",
  h: "hold",
  s: "slide",
  a: "air",
  H: "airHold",
  S: "airSlide",
  C: "airCrush",
};
const LONG_TYPES = new Set<NoteKind>(["hold", "slide", "airHold", "airSlide", "airCrush"]);
const PAIRED_TYPES = new Set<NoteKind>(["air", "airHold", "airSlide"]);
const HEADER_ONLY = new Set([
  "VER",
  "EXVER",
  "TICKS",
  "TITLE",
  "ARTIST",
  "BGM",
  "BGMOFS",
  "MAINBPM",
  "MAINTIL",
  "SORT",
  "GENRE",
  "DESIGN",
  "DIFF",
  "LEVEL",
  "WEATTR",
  "CONST",
  "SONGID",
  "RLDATE",
  "BGMPRV",
  "JACKET",
  "BGIMG",
  "BGSCENE",
  "BGMODE",
  "FLDCOL",
  "FLDSCENE",
  "FLDIMG",
  "ATINFO",
  "DLURL",
  "COPYRIGHT",
  "LICENSE",
  "CMT",
  "CLKCNT",
  "ENDHEAD",
  "BEAT",
]);
const KNOWN_FLAGS = new Set(["SOFFSET", "CLICK", "DIFFTTL", "EXLONG", "BGMWCMP", "HIPRECISION"]);
const AIR_DIRECTIONS = new Set(["UC", "UL", "UR", "DC", "DL", "DR"]);
const CRUSH_COLORS = new Set("0123456789AYBCDZ");
const BASE36_DIGIT = /^[0-9a-z]$/i;
const SOURCE_POSITION = /^(\d+)'(\d+)$/;
const NOTE_RECORD = /^#([^:>]+)([:>])(.+)$/;
const LEGACY_CURVE = /^(?:b|B|curve|bezier)/;

type Row = { line: number; text: string };
const positionKey = (point: ChartPoint, timeline: number) =>
  `${timeline}:${point.tick}:${point.lane}:${point.width}`;

class InvalidRow extends Error {}

class ChartReader {
  readonly diagnostics: ChartDiagnostic[] = [];
  readonly chart: UgcChart;
  private invalid = false;
  private mainBpm?: number;
  private exLong = false;
  private extendedVersion = false;
  private readonly omitted = new Set<ChartNote>();
  private readonly barStarts: { bar: number; tick: number; duration: number }[] = [];

  constructor(
    private readonly rows: Row[],
    encoding: UgcChart["encoding"],
  ) {
    this.chart = {
      version: 8,
      ticksPerQuarter: 480,
      encoding,
      metadata: {
        title: "",
        artist: "",
        designer: "",
        bgm: "",
        bgmOffset: 0,
        startOffset: false,
        mainTimeline: 0,
      },
      tempos: [],
      meters: [],
      speeds: [],
      notes: [],
      lastTick: 0,
    };
  }

  private report(
    severity: ChartDiagnostic["severity"],
    code: string,
    line: number,
    message: string,
  ) {
    if (severity === "error") this.invalid = true;
    if (this.diagnostics.length < 500) this.diagnostics.push({ severity, code, line, message });
  }

  private require(condition: boolean, row: Row, code: string, message: string): asserts condition {
    if (condition) return;
    this.report("error", code, row.line, message);
    throw new InvalidRow();
  }

  private number(
    raw: string | undefined,
    row: Row,
    label: string,
    minimum = -Infinity,
    integer = false,
  ) {
    const value = raw?.trim() ? Number(raw) : Number.NaN;
    this.require(
      Number.isFinite(value) && value >= minimum && (!integer || Number.isSafeInteger(value)),
      row,
      "number",
      `Invalid ${label}.`,
    );
    return value;
  }

  private position(raw: string | undefined, row: Row) {
    const match = SOURCE_POSITION.exec(raw ?? "");
    this.require(Boolean(match), row, "position", "Expected a bar'tick position.");
    // Resolve source bars once; layout and playback share the resulting absolute ticks.
    const bar = this.number(match![1], row, "source bar", 0, true);
    const offset = this.number(match![2], row, "tick offset", 0, true);
    let low = 0;
    let high = this.barStarts.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (this.barStarts[middle].bar <= bar) low = middle + 1;
      else high = middle;
    }
    const segment = this.barStarts[low - 1];
    return this.number(
      String(segment.tick + (bar - segment.bar) * segment.duration + offset),
      row,
      "source tick",
      0,
      true,
    );
  }

  private inspect(row: Row, operation: () => void) {
    try {
      operation();
    } catch (error) {
      if (!(error instanceof InvalidRow)) throw error;
    }
  }

  private header(row: Row) {
    const [command, ...values] = row.text.slice(1).split("\t");
    const chart = this.chart;
    switch (command) {
      case "VER":
        chart.version = this.number(values[0], row, "version", 1, true);
        break;
      case "EXVER":
        this.extendedVersion = this.number(values[0], row, "extended version", 0, true) > 0;
        break;
      case "TICKS":
        chart.ticksPerQuarter = this.number(values[0], row, "resolution", 1, true);
        break;
      case "BEAT":
        chart.meters.push({
          bar: this.number(values[0], row, "bar", 0, true),
          numerator: this.number(values[1], row, "meter numerator", 0, true),
          denominator: this.number(values[2], row, "meter denominator", 1, true),
          line: row.line,
        });
        break;
      case "TITLE":
        chart.metadata.title = values[0] ?? "";
        break;
      case "ARTIST":
        chart.metadata.artist = values[0] ?? "";
        break;
      case "DESIGN":
        chart.metadata.designer = values[0] ?? "";
        break;
      case "BGM":
        chart.metadata.bgm = values[0] ?? "";
        break;
      case "BGMOFS":
        chart.metadata.bgmOffset = this.number(values[0], row, "music offset");
        break;
      case "MAINBPM":
        this.mainBpm = this.number(values[0], row, "BPM", Number.MIN_VALUE);
        break;
      case "MAINTIL":
        chart.metadata.mainTimeline = this.number(values[0], row, "timeline", 0, true);
        break;
      case "FLAG": {
        const [name, value] = values;
        this.require(
          value === "TRUE" || value === "FALSE",
          row,
          "flag",
          "Expected TRUE or FALSE for a flag.",
        );
        if (name === "SOFFSET") chart.metadata.startOffset = value === "TRUE";
        if (name === "EXLONG") this.exLong = value === "TRUE";
        if (!KNOWN_FLAGS.has(name))
          this.report("warning", "flag", row.line, `Unsupported flag ${name}.`);
        break;
      }
    }
  }

  private point(row: Row, payload: string, tick: number, parent?: ChartNote): ChartPoint {
    const inherited =
      payload.length === 1 && parent && (parent.kind === "hold" || parent.kind === "airHold");
    const lane = inherited ? parent.lane : Number.parseInt(payload[1], 36);
    const width = inherited ? parent.width : Number.parseInt(payload[2], 36);
    this.require(
      Boolean(inherited) ||
        (BASE36_DIGIT.test(payload[1] ?? "") && BASE36_DIGIT.test(payload[2] ?? "")),
      row,
      "geometry",
      "Expected base-36 lane and width.",
    );
    this.require(width > 0, row, "geometry", "Note width must be positive.");

    return {
      id: `line:${row.line}`,
      line: row.line,
      tick,
      lane,
      width,
      height: parent?.height ?? 80,
      action: payload.startsWith("s"),
      noLine: false,
    };
  }

  private airHeight(row: Row, payload: string) {
    this.require(
      /^[0-9a-z]{2}$/i.test(payload.slice(3, 5)),
      row,
      "height",
      "Expected two base-36 air-height digits.",
    );
    return Number.parseInt(payload.slice(3, 5), 36);
  }

  private note(
    row: Row,
    payload: string,
    suffix: string | undefined,
    tick: number,
    timeline: number,
  ): ChartNote | undefined {
    const kind = NOTE_TYPES[payload[0]];
    if (!kind || /[\uE000-\uF8FF]/.test(payload)) {
      this.report(
        "warning",
        "note-kind",
        row.line,
        "Unsupported note encoding; this note and its children are omitted.",
      );
      return;
    }

    const note: ChartNote = {
      ...this.point(row, payload, tick),
      kind,
      timeline,
      children: [],
      endTick: tick,
      direction: "UC",
      color: "N",
      effect: "",
      ex: kind === "exTap",
      interval: null,
    };
    this.appearance(row, payload, suffix, note);
    return note;
  }

  private appearance(row: Row, payload: string, suffix: string | undefined, note: ChartNote) {
    const { kind } = note;
    let expectedLength = 3;

    if (kind === "air") {
      expectedLength = 6;
      note.direction = payload.slice(3, 5);
      note.color = payload[5];
      this.require(AIR_DIRECTIONS.has(note.direction), row, "direction", "Unknown air direction.");
    } else if (kind === "airHold") {
      // Editors also write AIR-HOLD with AIR-SLIDE's explicit height fields.
      const hasHeight = payload.length >= 6;
      expectedLength = hasHeight ? 6 : 4;
      if (hasHeight) note.height = this.airHeight(row, payload);
      note.color = payload[expectedLength - 1];
    } else if (kind === "airSlide" || kind === "airCrush") {
      expectedLength = 6;
      note.height = this.airHeight(row, payload);
      note.color = payload[5];
      if (kind === "airCrush") {
        note.interval =
          suffix === "$" ? null : this.number(suffix, row, "attack interval", 0, true);
      }
    } else if (kind === "exTap" || kind === "flick") {
      expectedLength = 4;
      note.effect = payload[3] ?? "A";
    }

    if (PAIRED_TYPES.has(kind) && note.color !== "N" && note.color !== "I") {
      this.report("warning", "color", row.line, "Unsupported air color; normal color is used.");
      note.color = "N";
    }
    if (kind === "airCrush" && !CRUSH_COLORS.has(note.color)) {
      this.report(
        "warning",
        "color",
        row.line,
        "Unsupported air-crush color; normal color is used.",
      );
      note.color = "0";
    }
    if (payload.length > expectedLength || (suffix !== undefined && kind !== "airCrush")) {
      this.report(
        "warning",
        "appearance",
        row.line,
        "Unsupported appearance attributes were omitted.",
      );
    }
  }

  private timingEvent(row: Row, timeline: number) {
    const [command, ...values] = row.text.slice(1).split("\t");
    const line = row.line;
    switch (command) {
      case "BPM":
        this.chart.tempos.push({
          tick: this.position(values[0], row),
          bpm: this.number(values[1], row, "BPM", Number.MIN_VALUE),
          line,
        });
        break;
      case "TIL":
        this.chart.speeds.push({
          timeline: this.number(values[0], row, "timeline", 0, true),
          tick: this.position(values[1], row),
          speed: this.number(values[2], row, "note speed"),
          line,
        });
        break;
      case "SPDMOD":
        this.chart.speeds.push({
          timeline: null,
          tick: this.position(values[0], row),
          speed: this.number(values[1], row, "note speed"),
          line,
        });
        break;
      case "USETIL":
        return this.number(values[0], row, "timeline", 0, true);
      default:
        if (!HEADER_ONLY.has(command) && command !== "FLAG") {
          this.report("warning", "directive", line, `Unsupported directive ${command}.`);
        }
    }
    return timeline;
  }

  private eventsAndNotes() {
    let timeline = this.chart.metadata.mainTimeline;
    let parent: ChartNote | undefined;
    let ignoreChildren = false;
    let records = 0;

    for (const row of this.rows) {
      if (row.text.startsWith("#") && ++records > MAX_NOTES) {
        this.report("error", "size", row.line, "Beatmap exceeds 200,000 note records.");
        break;
      }

      this.inspect(row, () => {
        if (row.text.startsWith("@")) {
          timeline = this.timingEvent(row, timeline);
          return;
        }
        if (!row.text.startsWith("#")) return;

        const record = NOTE_RECORD.exec(row.text);
        this.require(Boolean(record), row, "note", "Malformed note record.");
        const [, location, separator, data] = record!;
        const [payload, suffix] = data.trim().split(",");

        if (location.includes("'")) {
          parent = undefined;
          ignoreChildren = true;
          this.require(separator === ":", row, "note", "Parent notes require a colon.");
          const tick = this.position(location, row);
          if (payload === "c") return;
          const note = this.note(row, payload, suffix, tick, timeline);
          if (!note) return;
          this.chart.notes.push(note);
          parent = LONG_TYPES.has(note.kind) ? note : undefined;
          ignoreChildren = false;
          return;
        }

        if (ignoreChildren) return;
        this.require(Boolean(parent), row, "parent", "Child has no long-note parent.");
        const owner = parent!;
        if (LEGACY_CURVE.test(payload) || !["s", "c"].includes(payload[0])) {
          const curve = LEGACY_CURVE.test(payload);
          this.report(
            "warning",
            curve ? "curve" : "child-kind",
            row.line,
            curve
              ? "Deprecated curved ribbon omitted."
              : "Unsupported child type; the whole ribbon is omitted.",
          );
          this.omitted.add(owner);
          ignoreChildren = true;
          return;
        }
        this.child(row, location, payload, owner);
      });
    }
  }

  private child(row: Row, location: string, payload: string, owner: ChartNote) {
    const offset = this.number(location, row, "child offset", 0, true);
    const tick = owner.tick + offset;
    this.require(
      Number.isSafeInteger(tick) && tick >= owner.endTick,
      row,
      "order",
      "Child ticks must be nondecreasing and within the source range.",
    );
    const child = this.point(row, payload, tick, owner);
    if (
      owner.kind === "airSlide" ||
      owner.kind === "airCrush" ||
      (owner.kind === "airHold" && payload.length > 3)
    )
      child.height = this.airHeight(row, payload);
    if (owner.kind === "airCrush") child.action = false;
    owner.children.push(child);
    owner.endTick = tick;
  }

  private relationshipIndex() {
    const omittedPositions = new Set<string>();
    const grounded = new Map<string, ChartPoint>();
    const airHeads = new Map<string, ChartNote>();
    const exHeads = new Map<string, ChartNote>();

    for (const note of this.omitted) {
      for (const point of [note, ...note.children]) {
        omittedPositions.add(positionKey(point, note.timeline));
      }
    }
    const notes = this.chart.notes.filter((note) => !this.omitted.has(note));
    for (const note of notes) {
      this.validateTail(note);
      if (note.kind === "air") airHeads.set(positionKey(note, note.timeline), note);
      if (note.kind === "exTap") exHeads.set(positionKey(note, note.timeline), note);
      for (const point of groundPoints(note)) {
        grounded.set(positionKey(point, note.timeline), point);
      }
    }
    return { notes, omittedPositions, grounded, airHeads, exHeads };
  }

  private validateTail(note: ChartNote) {
    if (LONG_TYPES.has(note.kind) && (note.children.length === 0 || note.endTick <= note.tick)) {
      this.report("error", "tail", note.line, "Long note needs an endpoint after its head.");
    }
  }

  private relationships() {
    const { notes, omittedPositions, grounded, airHeads, exHeads } = this.relationshipIndex();
    for (const note of notes) {
      if (this.omitted.has(note)) continue;
      const position = positionKey(note, note.timeline);
      if (this.exLong && (note.kind === "hold" || note.kind === "slide") && exHeads.has(position)) {
        note.ex = true;
        note.effect = exHeads.get(position)!.effect;
      }
      if (!PAIRED_TYPES.has(note.kind)) continue;

      this.pair(
        note,
        grounded.get(position),
        airHeads.get(position),
        omittedPositions.has(position),
      );
    }
    this.chart.notes = this.chart.notes.filter((note) => !this.omitted.has(note));
  }

  private pair(
    note: ChartNote,
    carrier: ChartPoint | undefined,
    air: ChartNote | undefined,
    carrierOmitted: boolean,
  ) {
    if (!carrier) {
      if (carrierOmitted) {
        this.omitted.add(note);
        this.report(
          "warning",
          "pair-omitted",
          note.line,
          "Air attached to an omitted ribbon is omitted.",
        );
      } else {
        this.report(
          "error",
          "pair",
          note.line,
          "Air needs a ground note at the same tick, lane, width and timeline.",
        );
      }
      return;
    }
    note.pairId = carrier.id;
    if (note.kind !== "air" && air) {
      note.direction = air.direction;
      note.color = air.color;
      this.omitted.add(air);
    }
  }

  private indexBars() {
    const chart = this.chart;
    chart.meters.sort((a, b) => a.bar - b.bar || a.line - b.line);
    if (chart.meters[0]?.bar !== 0) {
      chart.meters.unshift({ bar: 0, numerator: 4, denominator: 4, line: 0 });
    }
    for (const meter of chart.meters) {
      const previous = this.barStarts.at(-1);
      const tick = previous ? previous.tick + (meter.bar - previous.bar) * previous.duration : 0;
      this.barStarts.push({
        bar: meter.bar,
        tick,
        duration: (chart.ticksPerQuarter * meter.numerator * 4) / meter.denominator,
      });
    }
  }

  read(): ChartParseResult {
    if (!this.rows.some((row) => row.text.startsWith("@"))) {
      this.report("error", "format", 1, "Expected a text UGC beatmap with timing directives.");
    }
    for (const row of this.rows) {
      if (row.text.startsWith("@")) this.inspect(row, () => this.header(row));
    }
    this.exLong ||= this.extendedVersion;
    if (this.chart.version !== 8)
      this.report("warning", "version", 0, "This reader targets UGC version 8.");

    this.indexBars();
    this.eventsAndNotes();
    this.relationships();
    const chart = this.chart;
    chart.tempos.sort((a, b) => a.tick - b.tick || a.line - b.line);
    chart.speeds.sort((a, b) => a.tick - b.tick || a.line - b.line);
    if (chart.tempos[0]?.tick !== 0) {
      if (this.mainBpm !== undefined) chart.tempos.unshift({ tick: 0, bpm: this.mainBpm, line: 0 });
      else this.report("error", "tempo", 0, "Beatmap needs an initial BPM.");
    }
    for (const note of chart.notes) chart.lastTick = Math.max(chart.lastTick, note.endTick);
    if (chart.lastTick / chart.ticksPerQuarter > 400_000)
      this.report("error", "size", 0, "Beatmap exceeds the preview duration limit.");
    return { chart: this.invalid ? null : chart, diagnostics: this.diagnostics };
  }
}

function groundPoints(note: ChartNote): ChartPoint[] {
  if (note.kind.startsWith("air")) return [];
  return [note, ...note.children.filter((child) => child.action || note.kind === "hold")];
}

/** Reads text UGC only. Unknown extensions warn; invalid timing/relationships block playback. */
export function parseUgcChart(bytes: Uint8Array): ChartParseResult {
  const failure = (code: string, message: string): ChartParseResult => ({
    chart: null,
    diagnostics: [{ severity: "error", code, line: 0, message }],
  });
  if (bytes.byteLength > MAX_BYTES) return failure("size", "Beatmap exceeds 16 MiB.");

  let text: string;
  let encoding: UgcChart["encoding"] = "utf-8";
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      text = new TextDecoder("shift_jis", { fatal: true }).decode(bytes);
      encoding = "shift_jis";
    } catch {
      return failure("encoding", "Cannot decode beatmap as UTF-8 or CP932.");
    }
  }
  const rows = text
    .replace(/^\uFEFF/, "")
    .split(/\r\n?|\n/)
    .map((text, index) => ({ text, line: index + 1 }));
  return new ChartReader(rows, encoding).read();
}
