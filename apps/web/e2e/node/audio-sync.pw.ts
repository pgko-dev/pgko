import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type {} from "../fixtures/preview-state";

import { clickWave, wave } from "./audio";

async function openClicks(page: Page) {
  await page.route("**/assets/tap.wav", (route) =>
    route.fulfill({ contentType: "audio/wav", body: wave(0.008) }),
  );
  await page.goto("/e2e/browser/preview.html?audioProbe=1");
  test.skip(
    await page.evaluate(
      () => typeof AudioContext === "undefined" || typeof AudioWorkletNode === "undefined",
    ),
    "Web Audio/AudioWorklet unavailable; this is not an iOS audio pass.",
  );
  const notes = Array.from({ length: 131 }, (_, index) => {
    const beat = index + 1;
    return `#${Math.floor(beat / 4)}'${(beat % 4) * 480}:t04`;
  });
  await page.getByLabel("Beatmap (.ugc)").setInputFiles({
    name: "clicks.ugc",
    mimeType: "text/plain",
    buffer: Buffer.from(["@BPM\t0'0\t120", ...notes].join("\n")),
  });
  await page
    .getByLabel("Music (optional)")
    .setInputFiles({ name: "clicks.wav", mimeType: "audio/wav", buffer: clickWave() });
  await page.getByRole("button", { name: "Load local files" }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.previewTransport?.diagnostics.backend))
    .toBe("buffered");
}

async function alignment(page: Page) {
  const signals = await page.evaluate(() => window.previewSignals);
  const music = signals.filter((signal) => signal.input === 0).map((signal) => signal.time);
  const hits = signals.filter((signal) => signal.input === 1).map((signal) => signal.time);
  const separations = music.map(
    (time) =>
      hits.reduce(
        (closest, hit) =>
          Math.abs(hit - time - 0.007) < Math.abs(closest - time - 0.007) ? hit : closest,
        Infinity,
      ) - time,
  );
  const scheduling = await page.evaluate(() => ({
    maximumFrameGap: Math.max(...window.previewFrameGaps),
    music: window.previewMusic,
    hits: window.previewHits,
    diagnostics: window.previewTransport?.diagnostics,
  }));
  return { signals, separations, musicCount: music.length, hitCount: hits.length, ...scheduling };
}

function assertAlignment(result: Awaited<ReturnType<typeof alignment>>) {
  expect(result.hitCount).toBe(result.musicCount);
  for (const seconds of result.separations)
    expect(Math.abs(seconds - 0.007)).toBeLessThanOrEqual(0.002);
}

test("actual music and tap signals remain aligned for sixty seconds", async ({ page }, info) => {
  test.setTimeout(90_000);
  await openClicks(page);
  await page.waitForTimeout(60_300);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const result = await alignment(page);
  const directory = resolve("../../artifacts/preview-playback");
  await mkdir(directory, { recursive: true });
  await writeFile(
    resolve(directory, `signals-${info.project.name}.json`),
    JSON.stringify(result, null, 2),
  );
  await info.attach("audio-signals", {
    body: JSON.stringify(result),
    contentType: "application/json",
  });
  assertAlignment(result);
  expect(result.musicCount).toBeGreaterThanOrEqual(120);
  expect(Math.abs(result.separations.at(-1)! - result.separations[0])).toBeLessThanOrEqual(0.002);
});

test("signals stay aligned after seek and a 150 ms main-thread stall", async ({ page }, info) => {
  await openClicks(page);
  await page.waitForTimeout(2300);
  await page.evaluate(() => {
    window.previewTransport!.seek(10.1);
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const end = performance.now() + 150;
    while (performance.now() < end) {
      /* Deliberately block the scheduler, not the audio thread. */
    }
  });
  await page.waitForTimeout(1300);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const result = await alignment(page);
  expect(result.musicCount).toBeGreaterThanOrEqual(8);
  await info.attach("seek-and-stall-signals", {
    body: JSON.stringify(result),
    contentType: "application/json",
  });
  assertAlignment(result);
});
