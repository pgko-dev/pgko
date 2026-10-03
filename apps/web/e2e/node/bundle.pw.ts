import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import { fixture } from "../fixtures/beatmap";

import { wave } from "./audio";
import { setZoom } from "./view";

test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  const state = await page.evaluate(() => {
    const state = window as unknown as {
      previewContext?: AudioContext;
      previewMedia?: HTMLMediaElement;
    };
    return {
      audioState: state.previewContext?.state,
      audioTime: state.previewContext?.currentTime,
      mediaTime: state.previewMedia?.currentTime,
      mediaPaused: state.previewMedia?.paused,
      mediaError: state.previewMedia?.error?.message,
      body: document.body.innerText,
    };
  });
  await info.attach("playback-state", {
    body: JSON.stringify(state),
    contentType: "application/json",
  });
});

const beatmapId = "00000000-0000-4000-8000-000000000002";
const bundleId = "00000000-0000-4000-8000-000000000001";
const opus = await readFile(new URL("../fixtures/tone.opus", import.meta.url));
async function mockFiles(
  page: Page,
  options: {
    missingMusic?: boolean;
    pending?: boolean;
    text?: string;
    opus?: boolean;
  } = {},
) {
  let manifestRequests = 0;
  const origin = test.info().project.use.baseURL!;
  const musicOrigin = new URL(origin);
  if (options.opus) musicOrigin.hostname = "localhost";
  const musicReference = /^@BGM\t([^\r\n]+)/m.exec(options.text ?? fixture)?.[1] ?? "fixture.wav";
  await page.route("**/api/bundles/*/files", async (route) => {
    manifestRequests++;
    await route.fulfill({
      json: {
        bundleId,
        revision: 1,
        status: options.pending && manifestRequests === 1 ? "pending" : "ready",
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        charts: [
          {
            id: beatmapId,
            path: "fixture.ugc",
            file: {
              status: "ready",
              url: `${origin}/fixture.ugc`,
              contentType: "application/octet-stream",
            },
            fileMappings: {
              [musicReference]: options.missingMusic
                ? { status: "missing", reason: "missing_source" }
                : {
                    status: "ready",
                    url: options.opus
                      ? `${musicOrigin.origin}/fixture.opus`
                      : `${musicOrigin.origin}/fixture.wav`,
                    contentType: options.opus ? "audio/ogg" : "audio/wav",
                    ...(options.opus ? { codec: "opus", bitrate: 128000 } : {}),
                  },
            },
          },
        ],
      },
    });
  });
  await page.route("**/fixture.ugc", (route) =>
    route.fulfill({ contentType: "application/octet-stream", body: options.text ?? fixture }),
  );
  await page.route(/\/fixture\.(wav|opus)$/, async (route) => {
    const bytes = options.opus ? opus : wave();
    const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range ?? "");
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Number(range[2]) : bytes.length - 1;
    await route.fulfill({
      status: range ? 206 : 200,
      contentType: options.opus ? "audio/ogg" : "audio/wav",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Accept-Ranges": "bytes",
        ...(range ? { "Content-Range": `bytes ${start}-${end}/${bytes.length}` } : {}),
      },
      body: bytes.subarray(start, end + 1),
    });
  });
}

async function open(page: Page) {
  await page.goto("/e2e/browser/bundle.html");
  await page.getByRole("button", { name: "Preview beatmap", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
}

test("loads on demand, preserves video links, renders columns and follows playback", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockFiles(page);
  await open(page);
  await expect(
    page.getByRole("heading", { name: "Preview fixture - Test", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-slot="card-description"]')).toHaveText("Fixture");
  await expect(page.locator('a[href="https://example.test/video"]')).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("preview.png"), fullPage: true });
  await page.getByRole("button", { name: "Play", exact: true }).click();
  if (await page.evaluate(() => typeof AudioContext !== "undefined")) {
    await expect(page.getByRole("slider", { name: "Playback position" })).not.toHaveValue("0");
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    const before = await page.getByRole("slider", { name: "Playback position" }).inputValue();
    await page.waitForTimeout(150);
    await expect(page.getByRole("slider", { name: "Playback position" })).toHaveValue(before);
  } else {
    info.annotations.push({
      type: "limitation",
      description:
        "This browser build has no Web Audio; native playback still needs Safari verification.",
    });
    await expect(page.getByRole("alert")).toContainText("Playback could not start");
  }
  await page.getByRole("button", { name: "Next bar" }).click();
  await expect
    .poll(async () =>
      Number(await page.getByRole("slider", { name: "Playback position" }).inputValue()),
    )
    .toBeGreaterThan(1);
  await setZoom(page, 1);
  const field = page.getByRole("region", { name: /Beatmap columns/ });
  await page.getByRole("slider", { name: "Playback position" }).focus();
  await page.keyboard.press("End");
  if (info.project.use.isMobile) {
    await expect(field).toHaveAttribute("data-portrait", "true");
    await expect.poll(() => field.evaluate((element) => element.scrollTop)).toBe(0);
    await expect(field.locator('[data-slot="preview-cursor"]')).toBeInViewport();
  } else {
    await expect.poll(() => field.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  }
  await field.hover();
  if (info.project.use.isMobile) {
    const bounds = (await field.boundingBox())!;
    await field.dispatchEvent("pointerdown", {
      pointerId: 1,
      pointerType: "touch",
      clientX: bounds.x + 150,
      clientY: bounds.y + 100,
    });
    await field.dispatchEvent("pointermove", {
      pointerId: 1,
      pointerType: "touch",
      clientX: bounds.x + 30,
      clientY: bounds.y + 100,
    });
    await field.dispatchEvent("pointercancel", { pointerId: 1, pointerType: "touch" });
  } else {
    await page.mouse.wheel(300, 0);
  }
  await expect(page.getByRole("button", { name: "Follow", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("button", { name: "Close preview" }).click();
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("pending files retry, and missing music permits hit-sound playback", async ({
  page,
}, info) => {
  await mockFiles(page, { pending: true, missingMusic: true });
  await page.goto("/e2e/browser/bundle.html");
  await page.getByRole("button", { name: "Preview beatmap", exact: true }).click();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  if (await page.evaluate(() => typeof AudioContext !== "undefined")) {
    await expect(page.getByRole("slider", { name: "Playback position" })).not.toHaveValue("0");
  } else {
    info.annotations.push({
      type: "limitation",
      description: "Web Audio is unavailable in this browser build.",
    });
    await expect(page.getByRole("alert")).toContainText("Playback could not start");
  }
});

test("invalid beatmaps show diagnostics without creating a player", async ({ page }) => {
  await mockFiles(page, { text: "@BPM\t0'0\t0\n#100>s" });
  await page.goto("/e2e/browser/bundle.html");
  await page.getByRole("button", { name: "Preview beatmap", exact: true }).click();
  await expect(
    page.getByText("The beatmap could not be previewed. See the diagnostics below."),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("cross-origin Opus reaches Web Audio, seeks and releases on close", async ({ page }) => {
  await mockFiles(page, { opus: true });
  await open(page);
  test.skip(
    await page.evaluate(() => typeof AudioContext === "undefined"),
    "Windows WebKit has no Web Audio; run this on macOS for Safari engine coverage.",
  );
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const analyser = (window as unknown as { previewAnalyser?: AnalyserNode }).previewAnalyser;
        if (!analyser) return 0;
        const samples = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(samples);
        return samples.reduce((maximum, sample) => Math.max(maximum, Math.abs(sample)), 0);
      }),
    )
    .toBeGreaterThan(0.001);
  await page.getByRole("button", { name: "Next bar" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { previewMedia: HTMLAudioElement }).previewMedia.currentTime,
      ),
    )
    .toBeGreaterThan(1.8);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { previewMedia: HTMLAudioElement }).previewMedia.playbackRate,
      ),
    )
    .toBe(1);
  await page.getByRole("button", { name: "Close preview" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { previewContext: AudioContext }).previewContext.state,
      ),
    )
    .toBe("closed");
  expect(
    await page.evaluate(() =>
      (window as unknown as { previewMedia: HTMLAudioElement }).previewMedia.getAttribute("src"),
    ),
  ).toBeNull();
});

test("large authored UGC fixture paints within the canvas memory budget", async ({
  page,
}, info) => {
  const notes = Array.from({ length: 256 }, (_, bar) =>
    Array.from(
      { length: 16 },
      (_, beat) => `#${bar}'${beat * 120}:t${(beat % 8).toString(36)}4`,
    ).join("\n"),
  );
  await mockFiles(page, {
    missingMusic: true,
    text: `${fixture}\n${notes.join("\n")}`,
  });
  const started = performance.now();
  await open(page);
  const loadMilliseconds = performance.now() - started;
  await expect(page.getByText(/Preview diagnostics/)).toHaveCount(0);
  const bytes = await page
    .locator("canvas")
    .evaluateAll((nodes) =>
      nodes.reduce(
        (sum, node) =>
          sum + (node as HTMLCanvasElement).width * (node as HTMLCanvasElement).height * 4,
        0,
      ),
    );
  expect(bytes).toBeLessThanOrEqual(64 * 1024 * 1024);
  await info.attach("preview-metrics", {
    body: JSON.stringify({ loadMilliseconds, canvasBytes: bytes }),
    contentType: "application/json",
  });
  console.log(
    `${info.project.name}: synthetic first column ${Math.round(loadMilliseconds)} ms, ${bytes} canvas bytes`,
  );
  await page.screenshot({ path: info.outputPath("synthetic.png"), fullPage: true });
  if (await page.evaluate(() => typeof AudioContext !== "undefined")) {
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByRole("slider", { name: "Playback position" })).not.toHaveValue("0");
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  }
});
