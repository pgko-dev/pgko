import {
  COLUMN_WIDTH,
  FIELD_LEFT,
  FIELD_WIDTH,
  NOTE_PADDING,
  tickY,
  type ChartLayout,
  type PreviewColumn,
} from "./layout.js";
import { NoteIndex } from "./note-index.js";
import { airColor, crushColor, innerWidthRatio, theme } from "./theme.js";
// MargreteOnline appearance adapted for immutable beatmap columns; see THIRD_PARTY_NOTICES.md.
import type { ChartNote, ChartPoint, UgcChart } from "./types.js";

const laneX = (lane: number) => FIELD_LEFT + (lane * FIELD_WIDTH) / 16;
type Context = CanvasRenderingContext2D;
type Vertex = readonly [number, number];
const LABEL_SIZE = 10;
const NOTE_BOTTOM_PADDING = 12;
const AIR_LONG_KINDS = ["airHold", "airSlide", "airCrush"] as const;

export type ChartRenderOptions = {
  showDirectionText?: boolean;
  showControlPoints?: boolean;
  /** Label size in CSS pixels, independent of note scale and beat spacing. */
  labelSize?: number;
};

function polygon(context: Context, points: readonly Vertex[]) {
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
}

function line(
  context: Context,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 1,
) {
  context.strokeStyle = color;
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

export function airVertices(point: ChartPoint, direction: string, y: number): Vertex[] {
  const center = laneX(point.lane + point.width / 2);
  const width = ((point.width * FIELD_WIDTH) / 16) * innerWidthRatio(point.width);
  const left = center - width / 2;
  const right = center + width / 2;
  const down = direction.startsWith("D");
  let diagonal = 0;
  if (direction.endsWith("L")) diagonal = -1;
  else if (direction.endsWith("R")) diagonal = 1;
  const offset = (down ? -diagonal : diagonal) * 18;
  const centerOffset = diagonal * Math.min(point.width * 1.5, width / 8);

  if (down) {
    return [
      [left + offset, y - 42],
      [left + (offset * 10) / 34, y - 18],
      [center + centerOffset, y - 8],
      [right + (offset * 10) / 34, y - 18],
      [right + offset, y - 42],
      [center + centerOffset + (offset * 24) / 34, y - 32],
    ];
  }
  return [
    [left, y - 8],
    [left + (offset * 24) / 34, y - 32],
    [center + centerOffset + offset, y - 42],
    [right + (offset * 24) / 34, y - 32],
    [right, y - 8],
    [center + centerOffset + (offset * 10) / 34, y - 18],
  ];
}

function tap(
  context: Context,
  point: ChartPoint,
  note: ChartNote,
  y: number,
  paired: boolean,
  child = false,
) {
  const width = (point.width * FIELD_WIDTH) / 16;
  const left = laneX(point.lane);

  context.beginPath();
  if (note.kind === "damage") context.rect(left + 1, y - 3, width - 2, 6);
  else context.roundRect(left + 1, y - 3, width - 2, 6, 2);
  context.fillStyle = tapColor(note, paired, child);
  if (!child || point.action) context.fill();
  context.lineWidth = 1;
  context.strokeStyle = theme.border;
  context.stroke();

  let stripe = width * innerWidthRatio(point.width);
  if (note.kind === "flick") {
    context.fillStyle = theme.flickInner;
    context.fillRect(left + (width - stripe) / 2, y - 3, stripe, 6);
    stripe *= 0.75;
  }
  if (note.kind !== "damage" && !child) {
    context.fillStyle = theme.highlight;
    context.fillRect(left + (width - stripe) / 2, y - 1, stripe, 2);
  }
}

function tapColor(note: ChartNote, paired: boolean, child: boolean): string {
  if (note.ex && !child) return note.kind === "exTap" ? theme.exTap : theme.exLong;
  switch (note.kind) {
    case "damage":
      return theme.damage;
    case "flick":
      return theme.flick;
    case "hold":
      return paired ? theme.airUp : theme.hold;
    case "slide":
      return paired ? theme.airUp : theme.slide;
    default:
      return theme.tap;
  }
}

function ribbon(
  context: Context,
  points: ChartPoint[],
  y: (tick: number) => number,
  colors: readonly string[],
  alpha: number,
  centerColor?: string,
) {
  if (points.length < 2) return;
  const vertices: Vertex[] = [
    ...points.map((point): Vertex => [laneX(point.lane) + 1.5, y(point.tick)]),
    ...points
      .toReversed()
      .map((point): Vertex => [laneX(point.lane + point.width) - 1.5, y(point.tick)]),
  ];
  polygon(context, vertices);
  if (colors.length === 1) context.fillStyle = colors[0];
  else {
    // Original endpoints remain unchanged when the canvas clips a column.
    const gradient = context.createLinearGradient(0, y(points[0].tick), 0, y(points.at(-1)!.tick));
    [0, 0.375, 0.625, 1].forEach((stop, index) => gradient.addColorStop(stop, colors[index]));
    context.fillStyle = gradient;
  }
  context.globalAlpha = alpha;
  context.fill();
  context.globalAlpha = 1;
  if (centerColor) centerRibbon(context, points, y, centerColor);
}

function centerRibbon(
  context: Context,
  points: ChartPoint[],
  y: (tick: number) => number,
  color: string,
) {
  // Keep the width horizontal; a Canvas stroke widens shallow segments vertically.
  polygon(context, [
    ...points.map((point): Vertex => [laneX(point.lane + point.width / 2) - 2, y(point.tick)]),
    ...points
      .toReversed()
      .map((point): Vertex => [laneX(point.lane + point.width / 2) + 2, y(point.tick)]),
  ]);
  context.fillStyle = color;
  context.fill();
}

function longBody(context: Context, note: ChartNote, y: (tick: number) => number) {
  const points = [note, ...note.children];
  if (note.kind === "hold") ribbon(context, points, y, theme.holdGradient, 0.672);
  if (note.kind === "slide") slideBody(context, note, y);
  if (note.kind === "airHold") {
    line(
      context,
      laneX(note.lane + note.width / 2),
      y(note.tick),
      laneX(note.lane + note.width / 2),
      y(note.endTick),
      theme.airUp,
      4,
    );
  }
  if (note.kind === "airSlide") ribbon(context, points, y, [theme.airUp], 0.25, theme.slideCenter);
  if (note.kind === "airCrush" && note.color !== "Z") {
    centerRibbon(context, points, y, crushColor(note.color));
  }
}

function slideBody(context: Context, note: ChartNote, y: (tick: number) => number) {
  let segment: ChartPoint[] = [note];
  for (const point of note.children) {
    if (point.noLine) segment = [point];
    else segment.push(point);
    if (point.action || point === note.children.at(-1)) {
      ribbon(context, segment, y, [...theme.slideGradient].reverse(), 0.672, theme.slideCenter);
      segment = [point];
    }
  }
}

export function interpolatePoint(note: ChartNote, tick: number): ChartPoint {
  let previous: ChartPoint = note;
  for (const next of note.children) {
    if (next.tick > tick) {
      const fraction = (tick - previous.tick) / (next.tick - previous.tick);
      return {
        ...previous,
        tick,
        lane: previous.lane + (next.lane - previous.lane) * fraction,
        width: previous.width + (next.width - previous.width) * fraction,
      };
    }
    previous = next;
  }
  return { ...previous, tick };
}

function action(context: Context, point: ChartPoint, y: number, color: string, emphasized = false) {
  const x = laneX(point.lane);
  const width = (point.width * FIELD_WIDTH) / 16;
  if (point.action) {
    context.fillStyle = color;
    context.fillRect(x + 1, y - 2, width - 2, 4);
  }
  context.strokeStyle = emphasized ? theme.crushEmphasis : theme.border;
  context.lineWidth = 1;
  context.strokeRect(x + 1, y - 2, width - 2, 4);
  if (emphasized) {
    context.strokeStyle = theme.border;
    context.strokeRect(x, y - 3, width, 6);
  }
}

export class ChartPainter {
  private readonly index: NoteIndex;
  private readonly paired = new Set<string>();
  private readonly chart: UgcChart;
  private readonly layout: ChartLayout;
  private readonly tempoLabels: [number, string][];
  private readonly beatLabels: { tick: number; text: string; bar: string }[] = [];
  constructor(chart: UgcChart, layout: ChartLayout) {
    this.chart = chart;
    this.layout = layout;
    this.index = new NoteIndex(chart.notes);
    for (const note of chart.notes) if (note.pairId) this.paired.add(note.pairId);
    const barTicks = new Map(layout.bars.map((bar) => [bar.index, bar.startTick]));
    this.tempoLabels = [...new Map(chart.tempos.map((tempo) => [tempo.tick, String(tempo.bpm)]))];
    for (const meter of chart.meters) {
      const tick = barTicks.get(meter.bar);
      if (tick === undefined) continue;
      this.beatLabels.push({
        tick,
        text: `${meter.numerator}/${meter.denominator}`,
        bar: String(meter.bar + 1),
      });
    }
  }

  private grid(context: Context, column: PreviewColumn) {
    const { pixelsPerTick } = column;
    const y = (tick: number) => tickY(column, tick);
    const start = column.startTick;
    const end = column.lookAheadEndTick;
    context.fillStyle = theme.background;
    context.fillRect(0, 0, COLUMN_WIDTH, this.layout.canvasHeight);
    // Notes can occupy the headroom above look-ahead; continue the field behind them.
    const top = y(end) - NOTE_PADDING;
    const gridEnd = end + NOTE_PADDING / pixelsPerTick;
    const bottom = y(start);
    for (let lane = 0; lane <= 16; lane++)
      line(
        context,
        laneX(lane),
        top,
        laneX(lane),
        bottom,
        lane % 4 === 0 ? theme.beat : theme.subdivision,
      );
    const subdivision = this.chart.ticksPerQuarter / 4;
    const gridStep =
      subdivision * 2 ** Math.max(0, Math.ceil(Math.log2(2 / (subdivision * pixelsPerTick))));
    for (let tick = Math.ceil(start / gridStep) * gridStep; tick <= gridEnd; tick += gridStep) {
      line(
        context,
        FIELD_LEFT,
        y(tick),
        FIELD_LEFT + FIELD_WIDTH,
        y(tick),
        tick % this.chart.ticksPerQuarter === 0 ? theme.beat : theme.subdivision,
      );
    }
    context.textBaseline = "middle";
    for (const bar of this.layout.bars) {
      if (bar.startTick < start || bar.startTick > end) continue;
      line(
        context,
        FIELD_LEFT,
        y(bar.startTick),
        FIELD_LEFT + FIELD_WIDTH,
        y(bar.startTick),
        theme.measure,
      );
      context.fillStyle = theme.measure;
      context.textAlign = "right";
      context.fillText(String(bar.index + 1), FIELD_LEFT - 6, y(bar.startTick), FIELD_LEFT - 8);
    }
  }

  private annotations(context: Context, column: PreviewColumn, scale: number) {
    const y = (tick: number) => tickY(column, tick);
    const start = column.startTick;
    const end = column.lookAheadEndTick;
    context.textAlign = "left";
    context.fillStyle = theme.airUp;
    for (const [tick, text] of this.tempoLabels) {
      if (tick < start || tick > end) continue;
      context.fillText(text, FIELD_LEFT + FIELD_WIDTH + 6, y(tick), 90);
    }
    context.textAlign = "right";
    context.fillStyle = "#ffaa55";
    for (const { tick, text, bar } of this.beatLabels) {
      if (tick < start || tick > end) continue;
      const right = FIELD_LEFT - 6 - context.measureText(bar).width - 6 / scale;
      context.fillText(text, right, y(tick), Math.max(1, right - 4));
    }
  }

  private notes(
    context: Context,
    column: PreviewColumn,
    scale: number,
    options: ChartRenderOptions,
  ) {
    const { pixelsPerTick } = column;
    const y = (tick: number) => tickY(column, tick);
    const start = column.startTick;
    const end = column.lookAheadEndTick;
    const top = y(end);
    const bottom = y(start);
    const notes = this.index.query(start - 3 / pixelsPerTick, end + 44 / pixelsPerTick);
    context.save();
    context.beginPath();
    context.rect(
      FIELD_LEFT,
      top - NOTE_PADDING,
      FIELD_WIDTH,
      bottom - top + NOTE_PADDING + NOTE_BOTTOM_PADDING,
    );
    context.clip();
    for (const note of notes)
      if (note.kind === "hold" || note.kind === "slide") longBody(context, note, y);
    for (const kind of AIR_LONG_KINDS) {
      for (const note of notes) if (note.kind === kind) longBody(context, note, y);
    }

    // Margrete layers long markers below short notes; AIR pairing changes color, not depth.
    const markers = notes.toSorted((a, b) => b.width - a.width);
    airHeads(context, markers, y);
    groundLongNotes(context, markers, y, this.paired, options.showControlPoints);
    groundShortNotes(context, markers, y);
    for (const kind of AIR_LONG_KINDS) {
      for (const note of markers) {
        if (note.kind === kind) airActions(context, note, column, y, options.showControlPoints);
      }
    }

    if (options.showDirectionText) directions(context, notes, y, scale);
    context.restore();
  }

  paint(context: Context, column: PreviewColumn, scale: number, options: ChartRenderOptions = {}) {
    context.font = `${(options.labelSize ?? LABEL_SIZE) / scale}px system-ui`;
    this.grid(context, column);
    this.annotations(context, column, scale);
    this.notes(context, column, scale, options);
    const boundaryY = tickY(column, column.packedEndTick);
    if (column.index < this.layout.columns.length - 1) {
      context.save();
      context.setLineDash([4, 4]);
      line(context, FIELD_LEFT, boundaryY, FIELD_LEFT + FIELD_WIDTH, boundaryY, "#888888");
      context.restore();
    }
  }
}

function groundLongNotes(
  context: Context,
  notes: ChartNote[],
  y: (tick: number) => number,
  paired: ReadonlySet<string>,
  showControlPoints = false,
) {
  for (const note of notes) {
    if (note.kind !== "hold" && note.kind !== "slide") continue;
    tap(context, note, note, y(note.tick), paired.has(note.id));
    for (const child of note.children) {
      if (child.action || showControlPoints) {
        tap(context, child, note, y(child.tick), paired.has(child.id), true);
      }
    }
  }
}

function groundShortNotes(context: Context, notes: ChartNote[], y: (tick: number) => number) {
  for (const note of notes) {
    if (note.kind === "tap" || note.kind === "flick" || note.kind === "damage") {
      tap(context, note, note, y(note.tick), false);
    }
  }

  // EX heads remain visible over coincident taps, hold heads and slide steps.
  for (const note of notes) {
    if (note.kind === "exTap") tap(context, note, note, y(note.tick), false);
  }
}

function airHeads(context: Context, notes: ChartNote[], y: (tick: number) => number) {
  for (const note of notes) {
    if (!["air", "airHold", "airSlide"].includes(note.kind)) continue;
    polygon(context, airVertices(note, note.direction, y(note.tick)));
    context.fillStyle = airColor(note.color, note.direction.startsWith("D"));
    context.fill();
    context.strokeStyle = theme.airEdge;
    context.lineWidth = 3;
    context.stroke();
  }
}

function airActions(
  context: Context,
  note: ChartNote,
  column: PreviewColumn,
  y: (tick: number) => number,
  showControlPoints = false,
) {
  if (note.kind === "airHold" || note.kind === "airSlide") {
    const visible = note.children.filter((point) => point.action || showControlPoints);
    for (const child of visible) action(context, child, y(child.tick), theme.airAction);
  }
  if (note.kind !== "airCrush") return;
  if (note.interval !== 0 || showControlPoints) {
    action(
      context,
      { ...note, action: note.interval !== 0 },
      y(note.tick),
      theme.crush,
      note.interval !== 0,
    );
  }
  if (showControlPoints) {
    for (const child of note.children) {
      action(context, { ...child, action: false }, y(child.tick), theme.crush);
    }
  }
  if (note.interval === null || note.interval <= 0) return;
  const first = Math.max(1, Math.ceil((column.startTick - note.tick) / note.interval));
  const last = Math.min(
    Math.floor((column.lookAheadEndTick - note.tick) / note.interval),
    Math.ceil((note.endTick - note.tick) / note.interval) - 1,
  );
  for (let index = first; index <= last; index++) {
    const point = interpolatePoint(note, note.tick + index * note.interval);
    action(context, { ...point, action: true }, y(point.tick), theme.crush);
  }
}

function directions(
  context: Context,
  notes: ChartNote[],
  y: (tick: number) => number,
  scale: number,
) {
  context.fillStyle = "#ffaa55";
  const air = notes.filter((note) => ["air", "airHold", "airSlide"].includes(note.kind));
  for (const note of notes) {
    if (note.kind !== "exTap" && note.kind !== "flick") continue;
    const text = note.effect.replace(/[!~]/g, "");
    if (!text || text === "A") continue;
    const below = air.some(
      (arrow) =>
        arrow.tick === note.tick &&
        arrow.lane < note.lane + note.width &&
        arrow.lane + arrow.width > note.lane,
    );
    context.textBaseline = below ? "top" : "bottom";
    const offset = 3.5 + 2 / scale;
    context.fillText(text, laneX(note.lane) + 2 / scale, y(note.tick) + (below ? offset : -offset));
  }
}
