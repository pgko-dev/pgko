import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

import { setPortrait } from "./view";

for (const cpuRate of [1, 4]) {
  test(`mounted portrait performance at ${cpuRate}x CPU`, async ({ page, browserName }, info) => {
    test.skip(browserName !== "chromium", "CDP CPU throttling requires Chromium.");
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
    await page.goto("/e2e/browser/preview.html?fixture=large");
    await page.getByRole("button", { name: "Open preview", exact: true }).click();
    await expect(page.locator("canvas").first()).toBeVisible();
    await setPortrait(page, true);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await page.waitForTimeout(1000);
    const result = await page.evaluate(async () => {
      const frames: {
        gap: number;
        paintMilliseconds: number;
        renderMilliseconds: number;
        paints: number;
      }[] = [];
      const state = window as unknown as {
        previewPaints: { at: number; milliseconds: number }[];
        previewRenderWork: { at: number; milliseconds: number }[];
      };
      state.previewPaints.length = 0;
      state.previewRenderWork.length = 0;
      const started = performance.now();
      let previous = started;
      let nextPaint = 0;
      let nextRender = 0;
      while (performance.now() - started < 8000) {
        await new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
        const now = performance.now();
        const paints = state.previewPaints.slice(nextPaint);
        const renders = state.previewRenderWork.slice(nextRender);
        nextPaint = state.previewPaints.length;
        nextRender = state.previewRenderWork.length;
        frames.push({
          gap: now - previous,
          paintMilliseconds: paints.reduce((total, paint) => total + paint.milliseconds, 0),
          renderMilliseconds: renders.reduce((total, render) => total + render.milliseconds, 0),
          paints: paints.length,
        });
        previous = now;
      }
      const percentile = (values: number[], fraction: number) =>
        values.toSorted((a, b) => a - b)[Math.floor((values.length - 1) * fraction)];
      return {
        frames: frames.length,
        paints: nextPaint,
        frameGapP95: percentile(
          frames.map((frame) => frame.gap),
          0.95,
        ),
        framePaintP95: percentile(
          frames.map((frame) => frame.paintMilliseconds),
          0.95,
        ),
        frameRenderWorkP95: percentile(
          frames.map((frame) => frame.renderMilliseconds),
          0.95,
        ),
        frameGapMax: Math.max(...frames.map((frame) => frame.gap)),
        userAgent: navigator.userAgent,
      };
    });
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    expect(result.frames).toBeGreaterThan(30);
    const directory = resolve("../../artifacts/preview-playback");
    await mkdir(directory, { recursive: true });
    const report = { label: process.env.PREVIEW_BENCH_LABEL ?? "after", cpuRate, ...result };
    await writeFile(
      resolve(directory, `${report.label}-${info.project.name}-${cpuRate}x.json`),
      JSON.stringify(report, null, 2),
    );
    await info.attach("playback-performance", {
      body: JSON.stringify(report),
      contentType: "application/json",
    });
  });
}
