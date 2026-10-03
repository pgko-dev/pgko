import { Buffer } from "node:buffer";

import { expect, test, type Locator, type Page } from "@playwright/test";
import { FIELD_LEFT, FIELD_WIDTH, createPortraitLayout, parseUgcChart } from "ugc-render";

import { fixture } from "../fixtures/beatmap";

import { wave } from "./audio";
import { setPortrait } from "./view";

const source = "@TITLE\tPortrait fixture\n@BPM\t0'0\t120\n#0'0:t04\n#31'0:t84";

async function open(page: Page, beatmap = source) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", { value: undefined });
  });
  await page.goto("/e2e/browser/preview.html?fixture=silent");
  await page.getByLabel("Beatmap (.ugc)").setInputFiles({
    name: "portrait.ugc",
    mimeType: "text/plain",
    buffer: Buffer.from(beatmap),
  });
  await page.getByRole("button", { name: "Load local files" }).click();
  const field = page.getByRole("region", { name: /Beatmap columns/ });
  await expect(field).toHaveAttribute("data-portrait", "true");
  await expect(field.locator("canvas")).toBeVisible();
  return field;
}

async function expectFit(field: Locator) {
  await expect
    .poll(() =>
      field.evaluate((element) => {
        const canvas = element.querySelector("canvas")!.getBoundingClientRect();
        return (
          Math.abs(canvas.width - element.clientWidth) +
          Math.abs(canvas.height - element.clientHeight) +
          element.scrollWidth -
          element.clientWidth
        );
      }),
    )
    .toBeLessThan(1);
  await expect(field.locator("canvas")).toHaveCount(1);
  expect(
    await field.evaluate((element) => element.scrollHeight - element.clientHeight),
  ).toBeGreaterThan(0);
}

async function expectCursor(field: Locator) {
  await expect
    .poll(() =>
      field.evaluate((element) => {
        const cursor = element
          .querySelector('[data-slot="preview-cursor"]')!
          .getBoundingClientRect();
        const bounds = element.getBoundingClientRect();
        return Math.abs(cursor.top - (bounds.bottom - 48.5));
      }),
    )
    .toBeLessThan(1);
}

test("portrait scrolls one continuous track vertically and seeks at an independent scale", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const field = await open(page);
  const player = page.getByRole("region", { name: "Beatmap preview", exact: true });
  const position = page.getByRole("slider", { name: "Playback position" });
  const follow = page.getByRole("button", { name: "Follow", exact: true });
  await expectFit(field);
  await expectCursor(field);
  const range = await field.evaluate((element) => element.scrollHeight - element.clientHeight);
  await expect.poll(() => field.evaluate((element) => element.scrollTop)).toBeCloseTo(range, 0);
  const bounds = (await field.boundingBox())!;
  await field.click({ position: { x: bounds.width / 2, y: bounds.height - 48 - 48 } });
  await expect.poll(async () => Number(await position.inputValue())).toBeCloseTo(0.5, 1);
  await expectCursor(field);
  const before = await position.inputValue();
  const top = await field.evaluate((element) => element.scrollTop);

  const visible = (await field.boundingBox())!;
  await page.mouse.move(visible.x + visible.width / 2, visible.y + visible.height * 0.25);
  await page.mouse.down();
  await page.mouse.move(visible.x + visible.width / 2, visible.y + visible.height * 0.7, {
    steps: 8,
  });
  await page.mouse.up();
  await expect.poll(() => field.evaluate((element) => element.scrollTop)).toBeLessThan(top - 100);
  await expect(follow).toHaveAttribute("aria-pressed", "false");
  await expect(position).toHaveValue(before);
  await expectFit(field);

  await field.focus();
  await page.keyboard.press("End");
  await expect.poll(() => field.evaluate((element) => element.scrollTop)).toBe(0);
  await page.keyboard.press("Home");
  await expect.poll(() => field.evaluate((element) => element.scrollTop)).toBeCloseTo(range, 0);
  await field.hover();
  if (info.project.name === "mobile-webkit") {
    // Playwright cannot dispatch native wheel input in mobile WebKit.
    await page.keyboard.press("PageUp");
  } else {
    await page.mouse.wheel(0, -160);
  }
  await expect.poll(() => field.evaluate((element) => element.scrollTop)).toBeLessThan(range - 100);
  await expect(position).toHaveValue(before);
  const scrollbar = player.locator(
    '[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]',
  );
  await expect(scrollbar).toBeVisible();
  await expect(
    player.locator('[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]'),
  ).toHaveCount(0);
  await follow.click();
  await expectCursor(field);

  await page.getByRole("combobox", { name: "Zoom", exact: true }).click();
  await page.getByRole("option", { name: "100%", exact: true }).click();
  await expectCursor(field);
  await expect
    .poll(() => field.evaluate((element) => element.scrollHeight - element.clientHeight))
    .toBeCloseTo(range * 2, 0);
  await field.click({ position: { x: bounds.width / 2, y: bounds.height - 48 - 96 } });
  await expect.poll(async () => Number(await position.inputValue())).toBeCloseTo(1, 1);
  await expectCursor(field);

  await page.setViewportSize({ width: 320, height: 740 });
  await expectFit(field);
  await expectCursor(field);
  expect(await player.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
  const controls = player.locator('[data-slot="preview-controls"]');
  expect(await controls.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
  await player.screenshot({ path: info.outputPath("portrait-mobile.png") });
  await expectCursor(field);
  await expect
    .poll(() => field.evaluate((element) => element.scrollTop))
    .toBeCloseTo(range * 2 - 192, 0);
  await page.getByRole("button", { name: "Close preview" }).click();
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("rotation, view switching and fullscreen preserve playback and vertical follow", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const field = await open(page);
  const position = page.getByRole("slider", { name: "Playback position" });
  const expand = page.getByRole("button", { name: "Expand / restore" });
  await position.focus();
  await page.keyboard.press("End");
  await expect(position).toHaveValue("64");
  const inlineHeight = (await field.boundingBox())!.height;
  await expectFit(field);
  await expectCursor(field);
  await expect.poll(() => field.evaluate((element) => element.scrollTop)).toBe(0);

  await page.setViewportSize({ width: 900, height: 500 });
  await expect(field).toHaveAttribute("data-portrait", "false");
  await expect(position).toHaveValue("64");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(field).toHaveAttribute("data-portrait", "true");
  await expectFit(field);
  await expectCursor(field);
  await setPortrait(page, false);
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(field).toHaveAttribute("data-portrait", "false");
  await setPortrait(page, true);
  await expectFit(field);
  await expect(position).toHaveValue("64");

  await expand.click();
  await expect(expand).toHaveAttribute("aria-pressed", "true");
  await expectFit(field);
  await expectCursor(field);
  const player = page.getByRole("region", { name: "Beatmap preview", exact: true });
  await expect
    .poll(() =>
      player.evaluate((element) =>
        Math.abs(
          element.querySelector('[data-slot="card"]')!.getBoundingClientRect().bottom -
            window.innerHeight,
        ),
      ),
    )
    .toBeLessThan(2);
  await player.screenshot({ path: info.outputPath("portrait-expanded.png") });
  await page.setViewportSize({ width: 900, height: 320 });
  await expect(field).toHaveAttribute("data-portrait", "true");
  await expectFit(field);
  await expectCursor(field);
  await expect(position).toHaveValue("64");
  await expand.click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await field.boundingBox())!.height).toBe(inlineHeight);
  await expect(position).toHaveValue("64");
  expect(errors).toEqual([]);
});

test("native vertical touch swipes pan without seeking and playback follows continuously", async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== "mobile-chromium", "Native touch input uses Chromium CDP.");
  await page.route("**/tap.wav", (route) =>
    route.fulfill({ contentType: "audio/wav", body: wave() }),
  );
  const field = await open(page, source.replace("120", "960"));
  const position = page.getByRole("slider", { name: "Playback position" });
  const follow = page.getByRole("button", { name: "Follow", exact: true });
  await field.scrollIntoViewIfNeeded();
  const bounds = (await field.boundingBox())!;
  const initialTop = await field.evaluate((element) => element.scrollTop);
  const session = await context.newCDPSession(page);
  const x = bounds.x + bounds.width / 2;
  const start = bounds.y + bounds.height * 0.2;
  const distance = bounds.height * 0.6;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y: start }],
  });
  for (let step = 1; step <= 10; step++) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: start + (distance * step) / 10 }],
    });
    await page.waitForTimeout(30);
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect
    .poll(() => field.evaluate((element) => element.scrollTop))
    .toBeLessThan(initialTop - 100);
  await expect(position).toHaveValue("0");
  await expect(follow).toHaveAttribute("aria-pressed", "false");
  await follow.click();
  await expectCursor(field);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect
    .poll(() => field.evaluate((element) => element.scrollTop))
    .toBeLessThan(initialTop - 600);
  await expectCursor(field);
  await expectFit(field);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await session.detach();
});

test("portrait reuses note colors and preserves long-note gradients while scrolling", async ({
  page,
}, info) => {
  const field = await open(page, fixture);
  await expectCursor(field);
  const bounds = (await field.boundingBox())!;
  const model = parseUgcChart(Buffer.from(fixture)).chart!;
  const view = createPortraitLayout(model, 0.5, bounds.width, bounds.height);
  const x = view.offsetX + (FIELD_LEFT + (FIELD_WIDTH * 1.5) / 16) * view.scale;
  const y = bounds.height - 48 - 4800 * view.pixelsPerTick;
  const canvas = field.locator("canvas");
  const readColor = (y: number) =>
    canvas.evaluate(
      (element, point) => {
        const canvas = element as HTMLCanvasElement;
        const ratio = canvas.width / canvas.getBoundingClientRect().width;
        return Array.from(
          canvas
            .getContext("2d")!
            .getImageData(Math.floor(point.x * ratio), Math.floor(point.y * ratio), 1, 1).data,
        ).slice(0, 3);
      },
      { x, y },
    );
  const color = await readColor(y);
  expect(Math.max(...color) - Math.min(...color)).toBeGreaterThan(30);
  await field.screenshot({ path: info.outputPath("portrait-notes.png") });
  await page.getByRole("button", { name: "Follow", exact: true }).click();
  await field.evaluate((element) => {
    element.scrollTop -= 192;
  });
  await expect
    .poll(async () =>
      (await readColor(y + 192)).reduce(
        (difference, value, index) => difference + Math.abs(value - color[index]),
        0,
      ),
    )
    .toBeLessThan(6);
  await field.screenshot({ path: info.outputPath("portrait-scrolled-notes.png") });
});
