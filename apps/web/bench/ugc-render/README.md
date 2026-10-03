# UGC renderer benchmark

Local chart preparation and Canvas painting benchmarks for `@pgko.dev/ugc-render`.

## Quick start

With the [repository prerequisites](../../../../README.md#prerequisites) installed, run from the repository root:

```sh
bun ci --ignore-scripts
bun x --no-install playwright install chromium
bun run --cwd apps/web bench:ugc
```

Results are saved to `artifacts/ugc-render-benchmark.json`.

See [benchmark options, comparisons, and measurement limits](../../../../docs/benchmarks.md).
