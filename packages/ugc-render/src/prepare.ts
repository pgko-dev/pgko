import { createLayout, type ChartLayout } from "./layout.js";
import { parseUgcChart } from "./parser.js";
import { buildHitTimes, createTiming } from "./timing.js";
import type { ChartDiagnostic, UgcChart } from "./types.js";

/** Structured-clone data. A successful result always includes layout and hit times. */
export type PreparedChart =
  | { chart: UgcChart; diagnostics: ChartDiagnostic[]; layout: ChartLayout; hits: number[] }
  | { chart: null; diagnostics: ChartDiagnostic[]; layout?: never; hits?: never };

/** Synchronous and bounded; use the worker adapter for interactive applications. */
export function prepareChart(bytes: Uint8Array): PreparedChart {
  const { chart, diagnostics } = parseUgcChart(bytes);
  if (!chart) return { chart: null, diagnostics };

  try {
    const layout = createLayout(chart);
    return {
      chart,
      diagnostics,
      layout,
      hits: buildHitTimes(chart, createTiming(chart, layout.endTick)),
    };
  } catch {
    return {
      chart: null,
      diagnostics: [
        ...diagnostics,
        {
          severity: "error",
          code: "limit",
          line: 0,
          message: "Beatmap exceeds preview layout or hit-event limits.",
        },
      ],
    };
  }
}
