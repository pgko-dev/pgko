import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";
import {
  COLUMN_WIDTH,
  CONTENT_HEIGHT,
  FIELD_HEIGHT,
  FIELD_LEFT,
  FIELD_WIDTH,
  NOTE_PADDING,
  PREVIEW_ZOOMS,
} from "ugc-render";

import { wave } from "./audio";
import { setPortrait, setZoom } from "./view";

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
  await setZoom(page, 1);
  const field = page.getByRole("region", { name: /Beatmap columns/ });
  const beforeSeek = await field.evaluate((element) => element.scrollLeft);
  await page.getByRole("slider", { name: "Playback position" }).focus();
  await page.keyboard.press("End");
  expect(await field.evaluate((element) => element.scrollLeft)).toBe(beforeSeek);
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
  await expect(page.getByRole("button", { name: "Follow", exact: true })).toHaveCount(0);
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

for (const portrait of [false, true]) {
  test(`chart seeking and scrolling are locked only during playback in portrait ${portrait}`, async ({
    page,
  }, info) => {
    await audioRoutes(page);
    await page.goto("/e2e/browser/preview.html");
    await page.getByLabel("Beatmap (.ugc)").setInputFiles({
      name: "playback-lock.ugc",
      mimeType: "text/plain",
      buffer: Buffer.from("@BPM\t0'0\t120\n#31'0:t04"),
    });
    await page.getByRole("button", { name: "Load local files" }).click();
    await setPortrait(page, portrait);
    await setZoom(page, 1);

    const field = page.getByRole("region", { name: /Beatmap columns/ });
    const position = page.getByRole("slider", { name: "Playback position" });
    const next = page.getByRole("button", { name: "Next bar" });
    const root = field.locator("..");
    const readScroll = () =>
      field.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop }));
    const initialScroll = await readScroll();
    for (let bar = 0; bar < 4; bar++) await next.click();
    await expect(position).toHaveValue("8");
    expect(await readScroll()).toEqual(initialScroll);
    await expect(page.getByRole("button", { name: "Follow", exact: true })).toHaveCount(0);
    const settings = page.getByRole("button", { name: "Preview settings", exact: true });
    expect(
      await settings.evaluate((element) =>
        element.previousElementSibling?.getAttribute("aria-label"),
      ),
    ).toBe("Next bar");

    test.skip(
      await page.evaluate(() => typeof AudioContext === "undefined"),
      "This WebKit runtime lacks Web Audio.",
    );
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(root).toHaveAttribute("data-playing", "true");
    await expect.poll(readScroll).not.toEqual(initialScroll);
    expect(await field.evaluate((element) => getComputedStyle(element).overflow)).toBe("hidden");

    const before = Number(await position.inputValue());
    await settings.click();
    const portraitSetting = page.getByRole("checkbox", { name: "Portrait view" });
    await expect(portraitSetting).toBeVisible();
    if (info.project.use.isMobile) await field.tap({ position: { x: 80, y: 100 } });
    else await field.click({ position: { x: 80, y: 100 } });
    await expect(portraitSetting).toBeHidden();
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await field.focus();
    for (const key of ["PageUp", "PageDown", "Home", "End"]) await page.keyboard.press(key);
    const wheelBlocked = await field.evaluate((element) => {
      const event = new WheelEvent("wheel", {
        deltaX: -2000,
        deltaY: -2000,
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(wheelBlocked).toBe(true);
    const scrollbar = root.locator(
      `[data-slot="scroll-area-scrollbar"][data-orientation="${portrait ? "vertical" : "horizontal"}"]`,
    );
    await expect(scrollbar).toHaveAttribute("aria-disabled", "true");
    const scrollbarBlocked = await scrollbar.evaluate((element) => {
      const event = new PointerEvent("pointerdown", {
        pointerId: 2,
        pointerType: "mouse",
        button: 0,
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(scrollbarBlocked).toBe(true);
    expect(
      await scrollbar.evaluate((element) => {
        const before = element.parentElement!.querySelector('[role="region"]')!;
        const initial = { left: before.scrollLeft, top: before.scrollTop };
        const event = new WheelEvent("wheel", {
          deltaX: -2000,
          deltaY: -2000,
          bubbles: true,
          cancelable: true,
        });
        element.dispatchEvent(event);
        return (
          event.defaultPrevented &&
          before.scrollLeft === initial.left &&
          before.scrollTop === initial.top
        );
      }),
    ).toBe(true);
    const after = Number(await position.inputValue());
    expect(after).toBeGreaterThanOrEqual(before);
    expect(after - before).toBeLessThan(2);

    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(root).toHaveAttribute("data-playing", "false");
    const pausedScroll = await readScroll();
    await next.click();
    expect(await readScroll()).toEqual(pausedScroll);
    await field.focus();
    if (portrait) await page.keyboard.press("PageUp");
    else await field.dispatchEvent("wheel", { deltaX: -1000, deltaMode: 0 });
    await expect.poll(readScroll).not.toEqual(pausedScroll);
    await page.getByRole("button", { name: "Restart", exact: true }).click();
    await field.focus();
    await page.keyboard.press("Home");
    const bounds = (await field.boundingBox())!;
    await field.click({
      position: { x: portrait ? bounds.width / 2 : FIELD_LEFT * 0.5 + 10, y: bounds.height - 96 },
    });
    await expect(position).not.toHaveValue("0");
  });
}

test("follow scrolls linearly within columns and across their boundaries", async ({ page }) => {
  await audioRoutes(page);
  await page.goto("/e2e/browser/preview.html");
  await page.getByLabel("Beatmap (.ugc)").setInputFiles({
    name: "linear-follow.ugc",
    mimeType: "text/plain",
    buffer: Buffer.from("@BPM\t0'0\t240\n#31'0:t04"),
  });
  await page.getByRole("button", { name: "Load local files" }).click();
  await setPortrait(page, false);
  await setZoom(page, 1);

  const field = page.getByRole("region", { name: /Beatmap columns/ });
  const position = page.getByRole("slider", { name: "Playback position" });
  const next = page.getByRole("button", { name: "Next bar" });
  const columnWidth = COLUMN_WIDTH * 0.5;
  const focusOffset = await field.evaluate(
    (element, geometry) =>
      element.clientWidth * 0.382 - geometry.cursorCenter + geometry.columnWidth / 2,
    { cursorCenter: (FIELD_LEFT + FIELD_WIDTH / 2) * 0.5, columnWidth },
  );

  for (let bar = 0; bar < 3; bar++) await next.click();
  await expect(position).toHaveValue("3");
  expect(await field.evaluate((element) => element.scrollLeft)).toBe(0);

  test.skip(
    await page.evaluate(() => typeof AudioContext === "undefined"),
    "This WebKit runtime lacks Web Audio.",
  );
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();

  const samples = await field.evaluate(async (element) => {
    const slider = document.querySelector<HTMLInputElement>('[aria-label="Playback position"]')!;
    const samples: { position: number; left: number; cursorVisible: boolean }[] = [];
    const started = performance.now();
    while (performance.now() - started < 1400) {
      await new Promise(requestAnimationFrame);
      const bounds = element.getBoundingClientRect();
      const cursor = element.querySelector('[data-slot="preview-cursor"]')!.getBoundingClientRect();
      samples.push({
        position: Number(slider.value),
        left: element.scrollLeft,
        cursorVisible: cursor.right > bounds.left && cursor.left < bounds.right,
      });
    }
    return samples;
  });
  await page.getByRole("button", { name: "Pause", exact: true }).click();

  expect(samples.some((sample) => sample.position < 4)).toBe(true);
  expect(samples.some((sample) => sample.position >= 4)).toBe(true);
  expect(samples.every((sample) => sample.cursorVisible)).toBe(true);
  expect(samples.at(-1)!.left - samples[0].left).toBeGreaterThan(columnWidth / 2);
  for (const sample of samples) {
    // At 100%, each column packs two bars; equal time advances by equal distances.
    expect(
      Math.abs(sample.left - ((sample.position / 2) * columnWidth - focusOffset)),
    ).toBeLessThan(2);
  }
  for (let index = 1; index < samples.length; index++) {
    const distance = samples[index].left - samples[index - 1].left;
    expect(distance).toBeGreaterThanOrEqual(0);
    expect(distance).toBeLessThan(columnWidth / 4);
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
  const zoom = page.getByRole("status", { name: "Zoom", exact: true });
  await setPortrait(page, false);
  await expect(field).toBeVisible();
  const height = (await field.boundingBox())!.height;
  const columnWidth = await field
    .locator("canvas")
    .first()
    .evaluate((element) => element.getBoundingClientRect().width);
  await page.getByRole("button", { name: "Next bar" }).click();
  await expect(page.getByRole("button", { name: "Zoom out", exact: true })).toBeDisabled();
  for (const value of PREVIEW_ZOOMS) {
    await setZoom(page, value);
    await expect(zoom).toHaveText(`${value * 100}%`);
    expect((await field.boundingBox())!.height).toBe(height);
    expect(await field.evaluate((element) => element.scrollHeight)).toBe(height);
    await expect(position).toHaveValue("1.5");
  }
  await expect(page.getByRole("button", { name: "Zoom in", exact: true })).toBeDisabled();
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
  await setZoom(page, 0.5);
  await expect(page.getByRole("button", { name: "Zoom out", exact: true })).toBeDisabled();
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
