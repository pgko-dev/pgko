# UGC renderer benchmarks

Use the [benchmark quick start](../apps/web/bench/ugc-render/README.md#quick-start) to install and run the harness. Commands below run from the repository root.

The runner bundles renderer source with Bun, serves it on a temporary loopback port, and launches a fresh headless Chromium. It closes the browser and server after measurement. Package builds and application environment settings are unnecessary.

## Options

Set environment variables in your shell before running `bun run --cwd apps/web bench:ugc`:

| Variable                | Default                               | Purpose                                                            |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| `UGC_BENCH_CHANNEL`     | Playwright Chromium                   | Use installed `chrome` or `msedge`                                 |
| `UGC_BENCH_CPU_RATE`    | `1`                                   | Page CPU throttle multiplier; `4` applies fourfold throttling      |
| `UGC_BENCH_OUTPUT`      | `artifacts/ugc-render-benchmark.json` | Report path, resolved from the repository root                     |
| `UGC_BENCH_BUDGET_MS`   | `16.67`                               | Upper bound for each paint case's p95 in milliseconds              |
| `UGC_BENCH_RENDERER`    | `working-tree`                        | Use `reference` to paint with the selected Git revision's renderer |
| `UGC_BENCH_REFERENCE`   | `HEAD`                                | Git revision used for the reference renderer                       |
| `UGC_BENCH_VERIFY_ONLY` | Unset                                 | Set to `1` for pixel comparisons instead of timings                |

The runner saves the report before failing if any fixed-view, scrolling, controls, or frame-paced paint case has p95 greater than or equal to the budget. Preparation and worker timings have no budget check.

Check benchmark types separately with:

```sh
bun node_modules/typescript/bin/tsc -p apps/web/bench/ugc-render/tsconfig.json
```

The web application's `tsc` command also includes these files.

## Reference comparisons

Choose an explicit `UGC_BENCH_REFERENCE` commit and save reference and working-tree runs to different output paths. Reference mode replaces only `renderer.ts`; other helpers use the current checkout. Reports record the reference commit, renderer selection, bundle hashes, browser, runtime, and machine information.

With `UGC_BENCH_VERIFY_ONLY=1`, the runner requires exact pixel equality against the reference and saves differences to the report. The current matrix contains 512 comparisons: portrait and overview views, `(zoom, backing ratio)` pairs `(0.5, 1)`, `(0.5, 2)`, `(1, 1)`, `(2, 2)`, four chart positions, and optional markers enabled or disabled. Fixtures cover same-tick controls, action boundaries, and `noLine` breaks. Verification canvases use `willReadFrequently`; timing canvases use the default backend.

## Workloads and measurements

[fixtures.ts](../apps/web/bench/ugc-render/fixtures.ts) defines six authored workloads:

| Workload                                             | Coverage                              |
| ---------------------------------------------------- | ------------------------------------- |
| `fixture`                                            | Existing browser-test beatmap         |
| `mixed-2k-events`, `mixed-20k-events`                | Mixed source events and paired notes  |
| `long-slide-20k-controls`, `long-crush-20k-controls` | Long notes with 20,000 child controls |
| `sparse-90k-bars`                                    | One note after 89,999 empty bars      |

Source event counts differ from root-note counts because paired notes add roots. Reports include roots, children, bytes, bars, and columns.

Stages measure parsing, layout, hit generation, painter construction, synchronous preparation, structured cloning, and dedicated-worker preparation. Painting uses portrait and overview-column views at zoom 0.5 and backing ratios 1 and 2. Portrait is 390 × 568 CSS pixels; overview is 274 × 568. The fixed view sits near 90% of chart duration.

| Paint measurement | Coverage                                                           |
| ----------------- | ------------------------------------------------------------------ |
| `submission`      | Fixed view with default options                                    |
| `scrolling`       | Column selection and painting across 120 chart positions           |
| `controls`        | Fixed view with control points and direction labels                |
| `framePaced`      | Scrolling with both options enabled, one paint per animation frame |

| Measurement                   | Warmups | Samples |
| ----------------------------- | ------- | ------- |
| Painting and interpolation    | 20      | 120     |
| Parsing, preparation, cloning | 5       | 30      |
| Other synchronous stages      | 10      | 50      |
| Worker round trip             | 2       | 8       |

Each worker sample transfers a fresh buffer through the production adapter and terminates the worker. Its timing includes startup, preparation, reply serialization, and delivery.

Experiments compare note indexing with a linear scan, crush interpolation with the reference, and a full bar scan with a preselected visible window. Interpolation results must match the reference; the bar-window experiment requires exact pixels and excludes window selection from timing.

## Reading results

All times are milliseconds. Paint timers measure Canvas command submission; drawing-call instrumentation and pixel readback run outside them. Frame-paced timers include column selection and painting inside the animation callback. Compare tight-loop maxima with paced samples when investigating queue or collection stalls.

Measurements exclude GPU completion, presentation, React commits, DOM scrolling, network and audio latency, and input-to-first-pixel time. Backing ratio changes pixel density; it does not emulate a device. CPU throttling applies to the page's CDP session and may affect dedicated workers differently. Run without concurrent builds or tests for comparable results.
