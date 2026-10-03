import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { cpus } from "node:os";
import { basename, resolve } from "node:path";

import { chromium } from "@playwright/test";

import type { runBenchmark } from "./browser.js";

const repository = resolve(import.meta.dir, "../../../..");
const output = resolve(
  repository,
  process.env.UGC_BENCH_OUTPUT ?? "artifacts/ugc-render-benchmark.json",
);
const channel = process.env.UGC_BENCH_CHANNEL;
const renderer = process.env.UGC_BENCH_RENDERER ?? "working-tree";
if (renderer !== "working-tree" && renderer !== "reference") throw new Error("Invalid renderer");
const cpuRate = Number(process.env.UGC_BENCH_CPU_RATE ?? 1);
if (!Number.isFinite(cpuRate) || cpuRate < 1) throw new Error("Invalid CPU throttle rate");
const budget = Number(process.env.UGC_BENCH_BUDGET_MS ?? 16.67);
if (!Number.isFinite(budget) || budget <= 0) throw new Error("Invalid paint budget");
const referenceRef = process.env.UGC_BENCH_REFERENCE ?? "HEAD";
const referenceCommit = Bun.spawnSync(
  ["git", "rev-parse", "--verify", `${referenceRef}^{commit}`],
  { cwd: repository },
);
if (referenceCommit.exitCode !== 0) throw new Error(referenceCommit.stderr.toString());
const referenceRevision = referenceCommit.stdout.toString().trim();
const rendererPath = resolve(repository, "packages/ugc-render/src/renderer.ts");
const reference = Bun.spawnSync(
  ["git", "show", `${referenceRevision}:packages/ugc-render/src/renderer.ts`],
  {
    cwd: repository,
  },
);
if (reference.exitCode !== 0) throw new Error(reference.stderr.toString());
const referenceBuild = await Bun.build({
  entrypoints: [rendererPath],
  target: "browser",
  minify: true,
  plugins: [
    {
      name: "reference-renderer",
      setup(build) {
        build.onLoad({ filter: /[\\/]renderer\.ts$/ }, () => ({
          contents: reference.stdout.toString(),
          loader: "ts",
        }));
      },
    },
  ],
});
if (!referenceBuild.success)
  throw new AggregateError(referenceBuild.logs, "Reference bundle failed");

const build = await Bun.build({
  entrypoints: [resolve(import.meta.dir, "./browser.ts"), resolve(import.meta.dir, "./worker.ts")],
  target: "browser",
  minify: true,
});
if (!build.success) throw new AggregateError(build.logs, "Benchmark bundle failed");
const bundles = new Map(
  await Promise.all(
    build.outputs.map(async (bundle) => [basename(bundle.path), await bundle.text()] as const),
  ),
);
bundles.set("reference.js", await referenceBuild.outputs[0].text());
const browserBundleHash = createHash("sha256").update(bundles.get("browser.js")!).digest("hex");
const referenceBundleHash = createHash("sha256").update(bundles.get("reference.js")!).digest("hex");
const headers = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/benchmark.js" || path === "/worker.js" || path === "/reference.js") {
      const name = path === "/benchmark.js" ? "browser.js" : path.slice(1);
      return new Response(bundles.get(name), {
        headers: { ...headers, "Content-Type": "text/javascript" },
      });
    }
    return new Response(
      '<!doctype html><title>UGC benchmark</title><script type="module" src="/benchmark.js"></script>',
      {
        headers: { ...headers, "Content-Type": "text/html" },
      },
    );
  },
});

try {
  const browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
    await page.goto(`http://127.0.0.1:${server.port}`);
    await page.waitForFunction(() => typeof window.runUgcBenchmark === "function");
    if (process.env.UGC_BENCH_VERIFY_ONLY === "1") {
      const verification = await page.evaluate(() => window.verifyUgcRendering());
      await mkdir(resolve(output, ".."), { recursive: true });
      await Bun.write(
        output,
        JSON.stringify(
          { referenceRevision, browserBundleHash, referenceBundleHash, ...verification },
          null,
          2,
        ) + "\n",
      );
      console.log(`Saved verification to ${output}`);
      console.log({ comparisons: verification.comparisons, differences: verification.differences });
      if (!verification.pixelsEqual) throw new Error("Rendered pixels differ from the reference");
    } else {
      const results: Awaited<ReturnType<typeof runBenchmark>> = await page.evaluate(
        (useReference) => window.runUgcBenchmark(useReference),
        renderer === "reference",
      );
      const revision = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: repository })
        .stdout.toString()
        .trim();
      const report = {
        timestamp: new Date().toISOString(),
        revision,
        browser: browser.version(),
        platform: process.platform,
        cpu: cpus()[0]?.model,
        cpuRate,
        referenceRevision,
        renderer,
        browserBundleHash,
        referenceBundleHash,
        budget,
        bun: Bun.version,
        ...results,
      };
      await mkdir(resolve(output, ".."), { recursive: true });
      await Bun.write(output, JSON.stringify(report, null, 2) + "\n");
      console.log(`Saved ${output}`);
      console.table(
        results.stages.map((stage) => ({
          workload: stage.name,
          roots: stage.roots,
          children: stage.children,
          prepareP50: stage.prepare.p50.toFixed(2),
          painterP50: stage.painter.p50.toFixed(2),
        })),
      );
      console.table(
        results.paints.map((paint) => ({
          workload: paint.name,
          mode: paint.mode,
          dpr: paint.ratio,
          paintP50: paint.submission.p50.toFixed(2),
          paintP95: paint.submission.p95.toFixed(2),
          scrollingP95: paint.scrolling.p95.toFixed(2),
          controlsP95: paint.controls.p95.toFixed(2),
          framePacedP95: paint.framePaced.p95.toFixed(2),
          framePacedMax: paint.framePaced.max.toFixed(2),
        })),
      );
      const failures = results.paints.filter((paint) =>
        [paint.submission, paint.scrolling, paint.controls, paint.framePaced].some(
          (timing) => timing.p95 >= budget,
        ),
      );
      if (failures.length)
        throw new Error(`${failures.length} paint cases exceeded the ${budget} ms p95 budget`);
    }
  } finally {
    await browser.close();
  }
} finally {
  await server.stop(true);
}
