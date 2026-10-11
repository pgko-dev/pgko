import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

test("the lab exports browser and playback diagnostics without media URLs", async ({ page }) => {
  await page.goto("/e2e/browser/preview.html");
  await page.getByRole("button", { name: "Open preview", exact: true }).click();
  const hasAudio = await page.evaluate(() => typeof AudioContext !== "undefined");
  if (hasAudio) {
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => window.previewTransport?.diagnostics.backend))
      .toBe("buffered");
  }
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export diagnostics", exact: true }).click();
  const download = await downloaded;
  const contents = await readFile((await download.path())!, "utf8");
  const report = JSON.parse(contents);
  expect(download.suggestedFilename()).toBe("preview-diagnostics.json");
  expect(report.userAgent).toBe(await page.evaluate(() => navigator.userAgent));
  expect(report.physicalOutputValidated).toBe(false);
  expect(report.frames.count).toBeGreaterThan(0);
  expect(contents).not.toContain("musicUrl");
  expect(contents).not.toContain("blob:");
  if (hasAudio) {
    expect(report.audio.backend).toBe("buffered");
    expect(report.audio.sampleRate).toBeGreaterThan(0);
    expect(report.audio.decodedBytes).toBeGreaterThan(0);
    expect(report.presentationPosition).toBeGreaterThanOrEqual(0);
  }
});
