import { COLUMN_WIDTH, createLayout } from "../../../../packages/ugc-render/src/layout.js";
import { NoteIndex } from "../../../../packages/ugc-render/src/note-index.js";
import { parseUgcChart } from "../../../../packages/ugc-render/src/parser.js";
import {
  createPortraitLayout,
  portraitColumn,
} from "../../../../packages/ugc-render/src/portrait.js";
import { prepareChart } from "../../../../packages/ugc-render/src/prepare.js";
import { ChartPainter, interpolatePoint } from "../../../../packages/ugc-render/src/renderer.js";
import { buildHitTimes, createTiming } from "../../../../packages/ugc-render/src/timing.js";
import { prepareInWorker } from "../../../../packages/ugc-render/src/worker.js";

import { benchmarkSources } from "./fixtures.js";
import { referenceRenderer, verifyRendering } from "./verify.js";

function summarize(values: number[]) {
  const sorted = values.toSorted((left, right) => left - right);
  const at = (fraction: number) =>
    sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
  return { samples: values.length, p50: at(0.5), p95: at(0.95), max: sorted.at(-1)! };
}

function sample(operation: () => unknown, samples = 50, warmups = 10) {
  for (let index = 0; index < warmups; index++) operation();
  const values: number[] = [];
  for (let index = 0; index < samples; index++) {
    const start = performance.now();
    operation();
    values.push(performance.now() - start);
  }
  return summarize(values);
}

async function sampleFrames(operation: (frame: number) => void) {
  const values: number[] = [];
  for (let frame = 0; frame < 140; frame++) {
    const duration = await new Promise<number>((resolve) =>
      requestAnimationFrame(() => {
        const start = performance.now();
        operation(frame);
        resolve(performance.now() - start);
      }),
    );
    if (frame >= 20) values.push(duration);
  }
  return summarize(values);
}

function drawingCalls(context: CanvasRenderingContext2D) {
  const calls: Record<string, number> = {};
  const wrapped = new Proxy(context, {
    get(target, property) {
      const value: unknown = Reflect.get(target, property, target);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        const name = String(property);
        calls[name] = (calls[name] ?? 0) + 1;
        return Reflect.apply(value, target, args);
      };
    },
    set: (target, property, value) => Reflect.set(target, property, value, target),
  });
  return { context: wrapped, calls };
}

type Workload = (typeof benchmarkSources)[number];
type PainterConstructor = typeof ChartPainter;
type ReferenceRenderer = Awaited<ReturnType<typeof referenceRenderer>>;

async function benchmarkStages(workload: Workload, Painter: PainterConstructor) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(workload.source);
  const prepared = prepareChart(bytes);
  if (!prepared.chart) throw new Error(`${workload.name}: ${JSON.stringify(prepared.diagnostics)}`);
  const { chart, layout } = prepared;
  const timing = createTiming(chart, layout.endTick);
  const workerSamples: number[] = [];
  for (let iteration = 0; iteration < 10; iteration++) {
    const buffer = bytes.slice().buffer;
    const start = performance.now();
    const result = await prepareInWorker(buffer, {
      createWorker: () => new Worker("/worker.js", { type: "module" }),
      signal: new AbortController().signal,
    });
    if (result.chart?.notes.length !== chart.notes.length) {
      throw new Error("Worker preparation differs from the synchronous baseline");
    }
    if (iteration >= 2) workerSamples.push(performance.now() - start);
  }
  const stage = {
    name: workload.name,
    bytes: bytes.byteLength,
    roots: chart.notes.length,
    children: chart.notes.reduce((sum, note) => sum + note.children.length, 0),
    bars: layout.bars.length,
    columns: layout.columns.length,
    parse: sample(() => parseUgcChart(bytes), 30, 5),
    layout: sample(() => createLayout(chart)),
    hits: sample(() => buildHitTimes(chart, timing)),
    painter: sample(() => new Painter(chart, layout)),
    prepare: sample(() => prepareChart(bytes), 30, 5),
    clone: sample(() => structuredClone(prepared), 30, 5),
    workerRoundTrip: summarize(workerSamples),
  };
  return { chart, layout, stage };
}

async function benchmarkPaints(
  workload: Workload,
  chart: Parameters<typeof createLayout>[0],
  layout: ReturnType<typeof createLayout>,
  Painter: PainterConstructor,
) {
  const paints = [];
  for (const configuration of [
    { mode: "portrait", ratio: 1 },
    { mode: "portrait", ratio: 2 },
    { mode: "overview", ratio: 1 },
    { mode: "overview", ratio: 2 },
  ]) {
    const { mode, ratio } = configuration;
    const portrait = createPortraitLayout(chart, 0.5, 390, 568);
    const view =
      mode === "portrait"
        ? portrait
        : {
            layout,
            width: COLUMN_WIDTH * 0.5,
            height: layout.canvasHeight * 0.5,
            offsetX: 0,
            scale: 0.5,
          };
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(view.width * ratio);
    canvas.height = Math.floor(view.height * ratio);
    canvas.style.width = `${view.width}px`;
    canvas.style.height = `${view.height}px`;
    document.body.append(canvas);
    const context = canvas.getContext("2d")!;
    const painter = new Painter(chart, view.layout);
    const column =
      mode === "portrait"
        ? portraitColumn(portrait, portrait.scrollRange * 0.1)
        : layout.columns[Math.floor((layout.columns.length - 1) * 0.9)];
    const draw = (instrumented = context, current = column, controls = false) => {
      instrumented.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (mode === "portrait") {
        instrumented.fillStyle = "#000000";
        instrumented.fillRect(0, 0, view.width, view.height);
      }
      instrumented.translate(view.offsetX, 0);
      instrumented.scale(view.scale, view.scale);
      painter.paint(instrumented, current, view.scale, {
        ...(mode === "portrait" ? { labelSize: 12 } : {}),
        showControlPoints: controls,
        showDirectionText: controls,
      });
    };
    const submission = sample(() => draw(), 120, 20);
    let frame = 0;
    const scrolling = sample(
      () => {
        const fraction = (frame++ % 120) / 119;
        const current =
          mode === "portrait"
            ? portraitColumn(portrait, portrait.scrollRange * fraction)
            : layout.columns[Math.floor((layout.columns.length - 1) * fraction)];
        draw(context, current);
      },
      120,
      20,
    );
    const controls = sample(() => draw(context, column, true), 120, 20);
    const framePaced = await sampleFrames((frame) => {
      const fraction = (frame % 120) / 119;
      const current =
        mode === "portrait"
          ? portraitColumn(portrait, portrait.scrollRange * fraction)
          : layout.columns[Math.floor((layout.columns.length - 1) * fraction)];
      draw(context, current, true);
    });
    const instrumented = drawingCalls(context);
    draw(instrumented.context);

    // Read back once outside timings: this is a command-submission benchmark, not GPU completion.
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let checksum = 0;
    for (let index = 0; index < pixels.length; index += 97)
      checksum = (checksum + pixels[index]) >>> 0;
    paints.push({
      name: workload.name,
      mode,
      ratio,
      submission,
      scrolling,
      controls,
      framePaced,
      visibleRoots: new NoteIndex(chart.notes).query(column.startTick, column.lookAheadEndTick)
        .length,
      calls: instrumented.calls,
      checksum,
      surfaceBytes: canvas.width * canvas.height * 4,
    });
    canvas.remove();
    canvas.width = 0;
    canvas.height = 0;
  }

  return paints;
}

function benchmarkExperiments(
  workload: Workload,
  chart: Parameters<typeof createLayout>[0],
  Painter: PainterConstructor,
  reference: ReferenceRenderer,
) {
  const experiments = [];
  const view = createPortraitLayout(chart, 0.5, 390, 568);
  const column = portraitColumn(view, view.scrollRange * 0.1);
  const index = new NoteIndex(chart.notes);
  const batch = (query: () => unknown) => {
    for (let iteration = 0; iteration < 100; iteration++) query();
  };
  experiments.push({
    name: workload.name,
    query100: sample(() => batch(() => index.query(column.startTick, column.lookAheadEndTick))),
    linearQuery100: sample(() =>
      batch(() =>
        chart.notes.filter(
          (note) => note.tick <= column.lookAheadEndTick && note.endTick >= column.startTick,
        ),
      ),
    ),
  });

  if (workload.name === "long-crush-20k-controls") {
    const note = chart.notes.find((entry) => entry.kind === "airCrush")!;
    const ticks = Array.from({ length: 96 }, (_, offset) => column.startTick + offset * 120);
    for (const tick of [0, 1, 120, 121, note.endTick, ...ticks]) {
      if (
        JSON.stringify(interpolatePoint(note, tick)) !==
        JSON.stringify(reference.interpolatePoint(note, tick))
      ) {
        throw new Error("Binary interpolation differs from the baseline");
      }
    }
    experiments.push({
      name: "crush-interpolation-96-attacks",
      reference: sample(() => ticks.map((tick) => reference.interpolatePoint(note, tick)), 120, 20),
      current: sample(() => ticks.map((tick) => interpolatePoint(note, tick)), 120, 20),
    });
  }

  if (workload.name === "sparse-90k-bars") {
    const canvas = document.createElement("canvas");
    canvas.width = 390;
    canvas.height = 568;
    const context = canvas.getContext("2d")!;
    const full = new Painter(chart, view.layout);
    const visibleBars = view.layout.bars.filter(
      (bar) => bar.startTick >= column.startTick && bar.startTick <= column.lookAheadEndTick,
    );
    const ranged = new Painter(chart, { ...view.layout, bars: visibleBars });
    const paint = (painter: ChartPainter) => {
      context.setTransform(view.scale, 0, 0, view.scale, view.offsetX, 0);
      painter.paint(context, column, view.scale, { labelSize: 12 });
    };
    const fullTiming = sample(() => paint(full), 120, 20);
    const rangedTiming = sample(() => paint(ranged), 120, 20);
    paint(full);
    const original = context.getImageData(0, 0, canvas.width, canvas.height).data;
    paint(ranged);
    const optimized = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const pixelsEqual = original.every((value, offset) => value === optimized[offset]);
    if (!pixelsEqual) throw new Error("Visible-bar prototype changed rendered pixels");
    experiments.push({
      name: "visible-bar-window",
      totalBars: view.layout.bars.length,
      visibleBars: visibleBars.length,
      full: fullTiming,
      ranged: rangedTiming,
      pixelsEqual,
    });
    canvas.width = 0;
    canvas.height = 0;
  }
  return experiments;
}

export async function runBenchmark(useReference = false) {
  const reference = await referenceRenderer();
  const Painter = useReference ? reference.ChartPainter : ChartPainter;
  const stages = [];
  const paints = [];
  const experiments = [];

  for (const workload of benchmarkSources) {
    const { chart, layout, stage } = await benchmarkStages(workload, Painter);
    stages.push(stage);
    paints.push(...(await benchmarkPaints(workload, chart, layout, Painter)));
    experiments.push(...benchmarkExperiments(workload, chart, Painter, reference));
  }
  return {
    userAgent: navigator.userAgent,
    crossOriginIsolated,
    anchorFraction: 0.9,
    stages,
    paints,
    experiments,
  };
}

declare global {
  interface Window {
    runUgcBenchmark: typeof runBenchmark;
    verifyUgcRendering: typeof verifyRendering;
  }
}

window.runUgcBenchmark = runBenchmark;
window.verifyUgcRendering = verifyRendering;
