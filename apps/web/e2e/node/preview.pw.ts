import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";
import { CONTENT_HEIGHT, FIELD_HEIGHT, FIELD_LEFT, NOTE_PADDING, PREVIEW_ZOOMS } from "ugc-render";

import { wave } from "./audio";
import { setPortrait } from "./view";

const opus = await readFile(new URL("../fixtures/tone.opus", import.meta.url));

async function audioRoutes(page: Page) {
  await page.route(/\/(tap\.wav|tone(?:-[\w-]+)?\.opus)$/, async (route) => {
    const isMusic = route.request().url().endsWith(".opus");
    const bytes = isMusic ? opus : wave();
    const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range ?? "");
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Number(range[2]) : bytes.length - 1;
    await route.fulfill({
      status: range ? 206 : 200,
      contentType: isMusic ? "audio/ogg" : "audio/wav",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Accept-Ranges": "bytes",
        ...(range ? { "Content-Range": `bytes ${start}-${end}/${bytes.length}` } : {}),
      },
      body: bytes.subarray(start, end + 1),
    });
  });
}

async function open(page: Page, fixture = "normal") {
  await page.goto(`/e2e/browser/preview.html?fixture=${fixture}`);
  await page.getByRole("button", { name: "Open preview", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
}

test("partial and invalid inputs surface diagnostics without host services", async ({ page }) => {
  await audioRoutes(page);
  await open(page, "partial");
  await page.getByText(/Preview diagnostics/).click();
  await expect(page.getByText(/Unsupported directive FUTURE/)).toBeVisible();
  await page.goto("/e2e/browser/preview.html?fixture=invalid");
  await page.getByRole("button", { name: "Open preview", exact: true }).click();
  await expect(page.getByText(/Preview diagnostics/)).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("large synthetic beatmap stays within the canvas memory budget", async ({ page }, info) => {
  await audioRoutes(page);
  const started = performance.now();
  await open(page, "large");
  const loadMilliseconds = performance.now() - started;
  await expect(page.getByText(/Preview diagnostics/)).toHaveCount(0);
  const readCanvasBytes = () =>
    page
      .locator("canvas")
      .evaluateAll((nodes) =>
        nodes.reduce(
          (total, node) =>
            total + (node as HTMLCanvasElement).width * (node as HTMLCanvasElement).height * 4,
          0,
        ),
      );
  // A resize can replace the first canvases after the visibility assertion.
  let canvasBytes = 0;
  await expect.poll(async () => (canvasBytes = await readCanvasBytes())).toBeGreaterThan(0);
  expect(canvasBytes).toBeLessThanOrEqual(64 * 1024 * 1024);
  await info.attach("preview-metrics", {
    body: JSON.stringify({ loadMilliseconds, canvasBytes }),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("synthetic.png"), fullPage: true });
});

test("host pause, visibility and beatmap replacement stop audio and reset playback", async ({
  page,
}) => {
  await audioRoutes(page);
  await open(page, "silent");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  test.skip(
    await page.evaluate(() => typeof AudioContext === "undefined"),
    "This WebKit runtime lacks Web Audio.",
  );
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Playback position" })).not.toHaveValue("0");
  await page.getByRole("button", { name: "Host pause", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Replace beatmap" }).click();
  await expect(page.getByRole("slider", { name: "Playback position" })).toHaveValue("0");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { previewContext: AudioContext }).previewContext.state,
      ),
    )
    .toBe("closed");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
});

test("click seeks, drag only pans, and keyboard controls remain available", async ({
  page,
}, info) => {
  await audioRoutes(page);
  await open(page);
  await setPortrait(page, false);
  const field = page.getByRole("region", { name: /Beatmap columns/ });
  const position = page.getByRole("slider", { name: "Playback position" });
  await field.click({ position: { x: 80, y: 440 } });
  expect(Number(await position.inputValue())).toBeGreaterThan(0);
  if (!info.project.use.isMobile) {
    const before = await position.inputValue();
    const box = (await field.boundingBox())!;
    await page.mouse.move(box.x + 180, box.y + 350);
    await page.mouse.down();
    await page.mouse.move(box.x + 20, box.y + 350);
    await page.mouse.up();
    await expect(position).toHaveValue(before);
  }
  await field.focus();
  await page.keyboard.press("]");
  expect(Number(await position.inputValue())).toBeGreaterThan(0);
});

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

test("renders columns, follows playback and releases canvases", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await audioRoutes(page);
  await open(page);
  await setPortrait(page, false);

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
  expect(
    Number(await page.getByRole("slider", { name: "Playback position" }).inputValue()),
  ).toBeGreaterThan(1);
  await page.getByRole("combobox", { name: "Zoom", exact: true }).click();
  await page.getByRole("option", { name: "100%", exact: true }).click();
  const field = page.getByRole("region", { name: /Beatmap columns/ });
  await page.getByRole("slider", { name: "Playback position" }).focus();
  await page.keyboard.press("End");
  await expect.poll(() => field.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await expect
    .poll(() =>
      field.evaluate((element) => {
        const cursor = element
          .querySelector('[data-slot="preview-cursor"]')!
          .getBoundingClientRect();
        const bounds = element.getBoundingClientRect();
        return cursor.left >= bounds.left && cursor.right <= bounds.right;
      }),
    )
    .toBe(true);
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

test("cross-origin Opus reaches Web Audio, seeks and releases on close", async ({ page }) => {
  await audioRoutes(page);
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

test("music stays aligned when starting mid-beatmap, seeking and restarting", async ({ page }) => {
  await audioRoutes(page);
  await page.goto("/e2e/browser/preview.html");
  test.skip(
    await page.evaluate(() => typeof AudioContext === "undefined"),
    "This WebKit runtime lacks Web Audio.",
  );
  await page.getByLabel("Beatmap (.ugc)").setInputFiles({
    name: "offset.ugc",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "@BPM\t0'0\t120\n@BPM\t1'0\t240\n@FLAG\tSOFFSET\tTRUE\n@BGMOFS\t0.75\n#8'0:t04",
    ),
  });
  await page
    .getByLabel("Music (optional)")
    .setInputFiles({ name: "tone.wav", mimeType: "audio/wav", buffer: wave() });
  await page.getByRole("button", { name: "Load local files" }).click();
  const position = page.getByRole("slider", { name: "Playback position" });
  const next = page.getByRole("button", { name: "Next bar" });
  for (let bar = 0; bar < 3; bar++) await next.click();
  await expect(position).toHaveValue("5");
  const assertAligned = async () => {
    await expect
      .poll(() =>
        page.evaluate(() => {
          const media = (window as unknown as { previewMedia: HTMLMediaElement }).previewMedia;
          const slider = document.querySelector<HTMLInputElement>(
            '[aria-label="Playback position"]',
          )!;
          if (!media || media.paused || media.seeking) return Infinity;
          return Math.abs(Number(slider.value) - media.currentTime - 2.75);
        }),
      )
      .toBeLessThan(0.08);
  };
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await assertAligned();
  await next.click();
  await assertAligned();
  await page.getByRole("button", { name: "Previous bar" }).click();
  await assertAligned();
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await assertAligned();
});

test("follow keeps the cursor visible and wheel scrolling can be restored", async ({
  page,
}, info) => {
  await audioRoutes(page);
  await page.goto("/e2e/browser/preview.html");
  await page.getByLabel("Beatmap (.ugc)").setInputFiles({
    name: "follow.ugc",
    mimeType: "text/plain",
    buffer: Buffer.from("@BPM\t0'0\t960\n#31'0:t04"),
  });
  await page.getByRole("button", { name: "Load local files" }).click();
  await setPortrait(page, false);
  await page.getByRole("combobox", { name: "Zoom", exact: true }).click();
  await page.getByRole("option", { name: "100%", exact: true }).click();
  const field = page.getByRole("region", { name: /Beatmap columns/ });
  const next = page.getByRole("button", { name: "Next bar" });
  const cursor = page.locator('[data-slot="preview-cursor"]');
  const assertVisible = async () => {
    await expect
      .poll(() =>
        cursor.evaluate((element) => {
          const cursor = element.getBoundingClientRect();
          const bounds = element
            .closest('[data-slot="scroll-area-viewport"]')!
            .getBoundingClientRect();
          return (
            cursor.top >= bounds.top &&
            cursor.bottom <= bounds.bottom &&
            cursor.right > bounds.left &&
            cursor.left < bounds.right
          );
        }),
      )
      .toBe(true);
  };
  for (let bar = 0; bar < 4; bar++) {
    await next.click();
    await assertVisible();
  }
  expect(await field.evaluate((element) => element.scrollTop)).toBe(0);
  const scrollbar = page.locator(
    '[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]',
  );
  await expect(scrollbar).toBeVisible();
  await scrollbar.dispatchEvent("pointerdown", { pointerId: 2, pointerType: "mouse", button: 0 });
  await scrollbar.dispatchEvent("pointerup", { pointerId: 2, pointerType: "mouse", button: 0 });
  const follow = page.getByRole("button", { name: "Follow", exact: true });
  await expect(follow).toHaveAttribute("aria-pressed", "false");
  await field.evaluate((element) => {
    element.scrollLeft = 0;
  });
  await next.click();
  expect(await field.evaluate((element) => element.scrollLeft)).toBe(0);
  await follow.click();
  await assertVisible();
  for (let bar = 0; bar < 12; bar++) await next.click();
  await assertVisible();
  expect(await field.evaluate((element) => element.scrollLeft)).toBeGreaterThan(300);
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await assertVisible();
  const position = page.getByRole("slider", { name: "Playback position" });
  const before = await position.inputValue();
  await field.hover();
  await field.dispatchEvent("wheel", { deltaY: 300, deltaMode: 0 });
  await expect.poll(() => field.evaluate((element) => element.scrollLeft)).toBeGreaterThan(200);
  await expect(follow).toHaveAttribute("aria-pressed", "false");
  await expect(position).toHaveValue(before);
  await field.dispatchEvent("wheel", { deltaY: -300, deltaMode: 0 });
  await expect.poll(() => field.evaluate((element) => element.scrollLeft)).toBe(0);
  await follow.click();
  await field.screenshot({ path: info.outputPath("follow.png") });
  if (await page.evaluate(() => typeof AudioContext !== "undefined")) {
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect.poll(() => field.evaluate((element) => element.scrollLeft)).toBeGreaterThan(500);
    await assertVisible();
  }
});

test("zoom reflows complete bars at fixed height and keeps seeking accurate", async ({
  page,
}, info) => {
  await page.goto("/e2e/browser/preview.html");
  await page.getByLabel("Beatmap (.ugc)").setInputFiles({
    name: "zoom.ugc",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "@BPM\t0'0\t120\n@BEAT\t0\t3\t4\n@BEAT\t1\t6\t4\n@BEAT\t2\t1\t16\n#0'0:t04\n#1'0:t04\n#3'0:t04",
    ),
  });
  await page.getByRole("button", { name: "Load local files" }).click();
  const field = page.getByRole("region", { name: /Beatmap columns/ });
  const position = page.getByRole("slider", { name: "Playback position" });
  const zoom = page.getByRole("combobox", { name: "Zoom", exact: true });
  await setPortrait(page, false);
  await expect(field).toBeVisible();
  const height = (await field.boundingBox())!.height;
  const columnWidth = await field
    .locator("canvas")
    .first()
    .evaluate((element) => element.getBoundingClientRect().width);
  await page.getByRole("button", { name: "Next bar" }).click();
  for (const value of PREVIEW_ZOOMS) {
    await zoom.click();
    await page.getByRole("option", { name: `${value * 100}%`, exact: true }).click();
    expect((await field.boundingBox())!.height).toBe(height);
    expect(await field.evaluate((element) => element.scrollHeight)).toBe(height);
    await expect(position).toHaveValue("1.5");
  }
  const packedWidth = await field
    .locator('[data-slot="preview-columns"]')
    .evaluate((element) => Number.parseFloat(element.style.width));
  // The two short bars share a column even at 200%.
  expect(packedWidth).toBe(columnWidth * 3);
  const second = field.locator('canvas[data-column="1"]');
  await second.click({
    position: {
      x: FIELD_LEFT * 0.5 + 10,
      y: (NOTE_PADDING + FIELD_HEIGHT - CONTENT_HEIGHT / 2) * 0.5,
    },
  });
  await expect(position).toHaveValue("3");
  await field.screenshot({ path: info.outputPath("zoom-reflow.png") });
  await zoom.click();
  await page.getByRole("option", { name: "50%", exact: true }).click();
  await expect(position).toHaveValue("3");
  await expect(field.locator('canvas[data-column="1"]')).toHaveCount(0);
  expect(await field.evaluate((element) => element.scrollLeft)).toBe(0);
});

test("playback stops at the last occupied bar while music still has a tail", async ({ page }) => {
  await audioRoutes(page);
  await page.goto("/e2e/browser/preview.html");
  test.skip(
    await page.evaluate(() => typeof AudioContext === "undefined"),
    "This WebKit runtime lacks Web Audio.",
  );
  await page.getByLabel("Beatmap (.ugc)").setInputFiles({
    name: "ending.ugc",
    mimeType: "text/plain",
    buffer: Buffer.from("@BPM\t0'0\t120\n#0'480:t04"),
  });
  await page
    .getByLabel("Music (optional)")
    .setInputFiles({ name: "tail.wav", mimeType: "audio/wav", buffer: wave() });
  await page.getByRole("button", { name: "Load local files" }).click();
  const position = page.getByRole("slider", { name: "Playback position" });
  await expect(position).toHaveAttribute("max", "2");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(position).toHaveValue("2");
  const media = await page.evaluate(() => {
    const media = (window as unknown as { previewMedia: HTMLMediaElement }).previewMedia;
    return {
      paused: media.paused,
      ended: media.ended,
      position: media.currentTime,
      duration: media.duration,
    };
  });
  expect(media.paused).toBe(true);
  expect(media.ended).toBe(false);
  expect(media.position).toBeLessThan(2.2);
  expect(media.duration).toBe(8);
});

for (const music of [false, true]) {
  test(`hold steps sound and controls stay silent with music ${music}`, async ({ page }) => {
    await page.route("**/assets/tap.wav", (route) =>
      route.fulfill({ contentType: "audio/wav", body: wave(0.04) }),
    );
    await page.goto("/e2e/browser/preview.html");
    test.skip(
      await page.evaluate(() => typeof AudioContext === "undefined"),
      "This WebKit runtime lacks Web Audio.",
    );
    await page.getByLabel("Beatmap (.ugc)").setInputFiles({
      name: "hold-steps.ugc",
      mimeType: "text/plain",
      buffer: Buffer.from(
        [
          "@BPM\t0'0\t120",
          "#0'0:h04",
          "#240>c",
          "#480>s",
          "#720>c",
          "#1920>s",
          "#0'0:h84",
          "#1440>c",
        ].join("\n"),
      ),
    });
    if (music) {
      await page.getByLabel("Music (optional)").setInputFiles({
        name: "music.wav",
        mimeType: "audio/wav",
        buffer: wave(),
      });
    }
    await page.getByRole("button", { name: "Load local files" }).click();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
    await expect(page.getByRole("slider", { name: "Playback position" })).toHaveValue("2");

    const readHits = () =>
      page.evaluate(
        () =>
          (window as unknown as { previewHits: { time: number; endedAt?: number }[] }).previewHits,
      );
    await expect.poll(async () => (await readHits()).filter((hit) => hit.endedAt).length).toBe(3);
    const hits = await readHits();
    expect(hits).toHaveLength(3);
    expect(hits[1].time - hits[0].time).toBeCloseTo(0.5, 1);
    expect(hits[2].time - hits[0].time).toBeCloseTo(2, 1);
    expect(hits[2].endedAt! - hits[2].time).toBeGreaterThanOrEqual(0.03);
  });
}
