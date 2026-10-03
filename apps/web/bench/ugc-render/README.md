# UGC renderer benchmark

From the repository root, after `bun install --frozen-lockfile`:

```sh
bun run --cwd apps/web bench:ugc
```

Uses Playwright's installed Chromium. Set `UGC_BENCH_CHANNEL=chrome` or `msedge` to use an installed browser. Set `UGC_BENCH_CPU_RATE=4` for Chromium CPU throttling and `UGC_BENCH_OUTPUT=artifacts/ugc-render-benchmark-4x.json` to select an output file. Defaults to `artifacts/ugc-render-benchmark.json`.

The runner bundles the current renderer source with Bun, serves it on a temporary loopback port, launches a fresh headless browser, and closes both after measurement. It does not require package builds or app/API configuration. Check benchmark types with `bun node_modules/typescript/bin/tsc -p apps/web/bench/ugc-render/tsconfig.json`.

Painting must remain below **16.67 ms at p95** in each configuration. The command saves its JSON and exits with an error if a case exceeds that budget. Set `UGC_BENCH_BUDGET_MS` to use a different threshold. The budget applies to fixed-view, scrolling, control-point/direction-label, and frame-paced painting, not one-time preparation or worker round trips.

For a baseline, set `UGC_BENCH_RENDERER=reference`; it paints with `renderer.ts` from `UGC_BENCH_REFERENCE` (default `HEAD`). Other renderer helpers come from the current checkout. Reports include the resolved reference commit, renderer selection, and bundle hashes. Set an explicit reference commit when comparing after committing an optimization.

Set `UGC_BENCH_VERIFY_ONLY=1` to compare working-tree pixels against that reference. This runs 512 comparisons across portrait/overview, zooms 0.5/1/2, backing ratios 1/2, chart positions, optional markers, same-tick controls, action boundaries, and `noLine` breaks. It requires exact pixel equality and writes a verification report to `UGC_BENCH_OUTPUT`. Readback canvases use `willReadFrequently`; timing canvases retain the default rendering backend.

Six authored workloads cover the existing fixture, 2,000/20,000 mixed source events, a slide/crush with 20,000 child controls, and one note after 89,999 empty bars. Mixed event counts differ from root-note counts because paired notes add roots; the JSON records roots, children, bytes, bars, and columns.

Measurements include parsing, layout, hit generation, painter construction, synchronous preparation, structured cloning, actual dedicated-worker preparation, portrait painting, and overview-column painting. Portrait uses 390 × 568 CSS pixels; overview uses 274 × 568. Both use zoom 0.5, backing ratios 1 and 2, default options, and a position near 90% of chart duration. `ratio` controls backing pixels; it does not emulate a mobile device.

Each configuration also measures a sweep across 120 positions spanning the chart (`scrolling`) and the fixed view with both control points and direction labels enabled (`controls`). Scrolling includes column selection and paint; it does not mount the React viewport or dispatch DOM scroll events.

`framePaced` repeats the scrolling sweep with both options enabled, submitting one paint per `requestAnimationFrame` after 20 warmup frames. Its timer covers column selection and command submission inside the callback. Tight-loop samples can include large queue or collection stalls; compare their maxima with the paced samples before attributing those stalls to a displayed frame. Paced samples still exclude presentation and work outside the callback.

- Paint and interpolation: 20 warmups, 120 samples.
- Parse/prepare/clone: 5 warmups, 30 samples.
- Other synchronous stages: 10 warmups, 50 samples.
- Worker round trip: 2 warmups, 8 samples, transferring a fresh input buffer and terminating each dedicated worker through the production adapter. Includes worker startup, preparation, reply serialization, and delivery.

All times are milliseconds. Paint times measure Canvas command submission. One pixel readback and drawing-call instrumentation occur **outside** timings. These results do not measure GPU completion, presentation, React commits, app scrolling, network/audio latency, or input-to-first-pixel time. CPU throttling is applied to the page's CDP session, is not assumed to throttle dedicated workers identically, and is a sensitivity test rather than phone hardware emulation. Run without concurrent builds/tests for cleaner comparisons.

Experiments compare the existing note index with a linear scan, reference crush interpolation with the current implementation, and a full bar scan with a preselected visible bar window. Interpolation outputs are checked against the reference; the bar-window experiment requires exact pixel equality for its synthetic viewport. The bar-window timing excludes window selection.
