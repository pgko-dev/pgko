import { COLUMN_WIDTH, createLayout } from "../../../../packages/ugc-render/src/layout.js";
import { parseUgcChart } from "../../../../packages/ugc-render/src/parser.js";
import {
  createPortraitLayout,
  portraitColumn,
} from "../../../../packages/ugc-render/src/portrait.js";
import {
  ChartPainter,
  type ChartRenderOptions,
} from "../../../../packages/ugc-render/src/renderer.js";
import type { NoteKind, UgcChart } from "../../../../packages/ugc-render/src/types.js";

import { benchmarkSources } from "./fixtures.js";

export async function referenceRenderer() {
  const url = new URL("/reference.js", location.href).href;
  return (await import(url)) as typeof import("../../../../packages/ugc-render/src/renderer.js");
}

function geometryChart(kind: NoteKind) {
  const source =
    "@BPM\t0'0\t120\n#0'0:s04\n" +
    Array.from(
      { length: 400 },
      (_, index) =>
        `#${Math.floor((index + 1) / 2) * 120}>c${(index % 12).toString(16).toUpperCase()}4`,
    ).join("\n");
  const chart = parseUgcChart(new TextEncoder().encode(source)).chart!;
  const note = chart.notes[0];
  note.kind = kind;
  note.interval = 60;
  note.color = "0";
  note.direction = "DR";
  for (const [index, child] of note.children.entries()) {
    child.action = index % 7 === 0;
    child.noLine = index % 19 === 0;
    child.width = (index % 4) + 1;
  }
  return chart;
}

/** Compare real Canvas output with the renderer from the chosen Git revision. */
export async function verifyRendering() {
  const reference = await referenceRenderer();
  const charts: { name: string; chart: UgcChart }[] = benchmarkSources
    .filter(({ name }) => name === "fixture" || name.startsWith("long-"))
    .map(({ name, source }) => ({
      name,
      chart: parseUgcChart(new TextEncoder().encode(source)).chart!,
    }));
  for (const kind of ["hold", "slide", "airHold", "airSlide", "airCrush"] as const) {
    charts.push({ name: `${kind}-boundaries`, chart: geometryChart(kind) });
  }

  let comparisons = 0;
  const differences = [];
  for (const { name, chart } of charts) {
    for (const [zoom, ratio] of [
      [0.5, 1],
      [0.5, 2],
      [1, 1],
      [2, 2],
    ]) {
      for (const mode of ["portrait", "overview"]) {
        const portrait = createPortraitLayout(chart, zoom, 390, 568);
        const layout = mode === "portrait" ? portrait.layout : createLayout(chart, zoom);
        const scale = mode === "portrait" ? portrait.scale : 0.5;
        const width = mode === "portrait" ? portrait.width : COLUMN_WIDTH * scale;
        const height = mode === "portrait" ? portrait.height : layout.canvasHeight * scale;
        const current = new ChartPainter(chart, layout);
        const original = new reference.ChartPainter(chart, layout);
        const surfaces = [current, original].map((painter) => {
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(width * ratio);
          canvas.height = Math.floor(height * ratio);
          return {
            painter,
            canvas,
            context: canvas.getContext("2d", { willReadFrequently: true })!,
          };
        });
        try {
          for (const fraction of [0, 0.5, 0.9, 1]) {
            const column =
              mode === "portrait"
                ? portraitColumn(portrait, portrait.scrollRange * (1 - fraction))
                : layout.columns[Math.floor((layout.columns.length - 1) * fraction)];
            for (const controls of [false, true]) {
              const options: ChartRenderOptions = {
                showControlPoints: controls,
                showDirectionText: controls,
                labelSize: mode === "portrait" ? 12 : 10,
              };
              const pixels = surfaces.map(({ painter, canvas, context }) => {
                context.setTransform(1, 0, 0, 1, 0, 0);
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.setTransform(ratio, 0, 0, ratio, 0, 0);
                context.translate(mode === "portrait" ? portrait.offsetX : 0, 0);
                context.scale(scale, scale);
                painter.paint(context, column, scale, options);
                return context.getImageData(0, 0, canvas.width, canvas.height).data;
              });
              let different = 0;
              let maximumDelta = 0;
              for (let index = 0; index < pixels[0].length; index++) {
                const delta = Math.abs(pixels[0][index] - pixels[1][index]);
                if (delta) different++;
                maximumDelta = Math.max(maximumDelta, delta);
              }
              if (different) {
                differences.push({
                  name,
                  mode,
                  zoom,
                  ratio,
                  fraction,
                  controls,
                  different,
                  maximumDelta,
                  channelFraction: different / pixels[0].length,
                });
              }
              comparisons++;
            }
          }
        } finally {
          for (const { canvas } of surfaces) {
            canvas.width = 0;
            canvas.height = 0;
          }
        }
      }
    }
  }
  return { comparisons, pixelsEqual: differences.length === 0, differences };
}
