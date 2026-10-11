import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import type {} from "../fixtures/preview-state";

import { setPortrait, setZoom } from "./view";

test("cached portrait tiles preserve the reference drawing across seams, zooms and sizes", async ({
  page,
}, info) => {
  await page.goto("/e2e/browser/preview.html");
  const results = await page.evaluate(() => window.verifyPreviewTiles());
  const difference = await page.evaluate(() => window.previewTileDifference);
  if (difference) {
    for (const [name, url] of Object.entries(difference)) {
      await writeFile(info.outputPath(`${name}.png`), Buffer.from(url.split(",")[1], "base64"));
    }
  }
  await info.attach("tile-pixels", {
    body: JSON.stringify(results),
    contentType: "application/json",
  });
  for (const result of results) {
    // Floating-point transform origins can change edge antialiasing slightly.
    expect(result.changed / result.pixels, JSON.stringify(result)).toBeLessThan(0.002);
  }
});

test("mounted portrait playback reuses tiles and keeps their memory bounded", async ({
  page,
}, info) => {
  await page.goto("/e2e/browser/preview.html");
  const notes = Array.from(
    { length: 256 },
    (_, index) => `#${Math.floor(index / 4)}'${(index % 4) * 480}:t04`,
  );
  await page.getByLabel("Beatmap (.ugc)").setInputFiles({
    name: "tiles.ugc",
    mimeType: "text/plain",
    buffer: Buffer.from(["@BPM\t0'0\t960", "#0'0:s44", "#12000>s84", ...notes].join("\n")),
  });
  await page.getByRole("button", { name: "Load local files" }).click();
  await setPortrait(page, true);
  await setZoom(page, 1);
  test.skip(
    await page.evaluate(() => typeof AudioContext === "undefined"),
    "Web Audio unavailable; static tile comparison still runs.",
  );
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const samples = await page
    .locator("canvas")
    .first()
    .evaluate(async (canvas: HTMLCanvasElement) => {
      const samples: { paints: number; bytes: number; colored: boolean }[] = [];
      const context = canvas.getContext("2d")!;
      const started = performance.now();
      while (performance.now() - started < 3000) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        samples.push({
          paints: Number(canvas.dataset.tilePaints),
          bytes: Number(canvas.dataset.cacheBytes) + canvas.width * canvas.height * 4,
          colored: pixels.some((value, index) => index % 4 !== 3 && value > 32),
        });
      }
      return samples;
    });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  expect(samples.length).toBeGreaterThan(20);
  expect(samples.every((sample) => sample.colored && sample.bytes <= 64 * 1024 * 1024)).toBe(true);
  expect(samples.at(-1)!.paints - samples[0].paints).toBeGreaterThan(0);
  expect(samples.at(-1)!.paints - samples[0].paints).toBeLessThan(samples.length / 4);
  await setZoom(page, 2);
  await page.setViewportSize({ width: 620, height: 850 });
  await page.getByRole("button", { name: "Preview settings", exact: true }).click();
  await page.getByRole("checkbox", { name: "Show control points", exact: true }).check();
  await page.getByRole("button", { name: "Preview settings", exact: true }).click();
  await page
    .getByRole("region", { name: /Beatmap columns/ })
    .screenshot({ path: info.outputPath("portrait-tiles.png") });
  await info.attach("portrait-cache", {
    body: JSON.stringify(samples),
    contentType: "application/json",
  });
});
