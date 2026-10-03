import { Buffer } from "node:buffer";

import { expect, test } from "@playwright/test";
import { FIELD_LEFT, LOOK_AHEAD, NOTE_PADDING } from "ugc-render";

import { wave } from "./audio";
import { setPortrait, setZoom } from "./view";

test("editor metadata and variable-meter air holds load and seek without warnings", async ({
  page,
}) => {
  const beatmap = [
    "@TITLE\tMeter fixture",
    "@BPM\t0'0\t120",
    "@BEAT\t0\t3\t4",
    "@BEAT\t1\t6\t4",
    "@BEAT\t2\t1\t16",
    "@BPM\t1'0\t240",
    "@FLDIMG\tfield.png",
    "@ATINFO\tDESIGNER\tExample designer",
    "@CMT\tExample comment",
    "#0'0:h63",
    "#1440>s",
    "#1'0:H633CI",
    "#2880>c634G",
  ].join("\n");
  await page.goto("/e2e/browser/preview.html");
  await page.getByLabel("Beatmap (.ugc)").setInputFiles({
    name: "meter.ugc",
    mimeType: "text/plain",
    buffer: Buffer.from(beatmap),
  });
  await page.getByRole("button", { name: "Load local files" }).click();
  await expect(page.getByRole("heading", { name: "Meter fixture", exact: true })).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.getByText(/Preview diagnostics/)).toHaveCount(0);
  const position = page.getByRole("slider", { name: "Playback position" });
  await page.getByRole("button", { name: "Next bar" }).click();
  await expect(position).toHaveValue("1.5");
  await page.getByRole("button", { name: "Next bar" }).click();
  await expect(position).toHaveValue("3");
});

test("theme tokens keep preview text readable in light and dark", async ({ page }, info) => {
  await page.goto("/e2e/browser/preview.html?fixture=silent");
  await page.getByRole("button", { name: "Open preview", exact: true }).click();
  const player = page.getByRole("region", { name: "Beatmap preview", exact: true });
  await expect(player.locator("canvas").first()).toBeVisible();
  await expect(player.locator('[data-slot="card-description"]')).toHaveCount(0);
  await expect(player.getByRole("status", { name: "Zoom", exact: true })).toHaveText("50%");
  await expect(player.getByRole("combobox", { name: "Playback speed" })).toHaveCount(0);

  for (const theme of ["Light", "Dark"]) {
    await page.getByRole("button", { name: theme, exact: true }).click();
    await expect(page.locator("html")).toHaveClass(theme.toLowerCase());
    const contrasts = await player.evaluate((element) => {
      const card = element.querySelector('[data-slot="card"]')!;
      const context = document.createElement("canvas").getContext("2d")!;
      const luminance = (color: string) => {
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const [red, green, blue] = Array.from(context.getImageData(0, 0, 1, 1).data)
          .slice(0, 3)
          .map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          });
        return red * 0.2126 + green * 0.7152 + blue * 0.0722;
      };
      const background = luminance(getComputedStyle(card).backgroundColor);
      return ["h3", '[data-slot="preview-controls"]', "output"].map((selector) => {
        const foreground = luminance(getComputedStyle(card.querySelector(selector)!).color);
        return (
          (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
        );
      });
    });
    for (const contrast of contrasts) expect(contrast).toBeGreaterThanOrEqual(4.5);
    expect(await player.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
    await player.screenshot({ path: info.outputPath(`preview-${theme.toLowerCase()}.png`) });
    const settings = player.getByRole("button", { name: "Preview settings" });
    await settings.click();
    await expect(player.getByRole("slider", { name: "Music", exact: true })).toBeDisabled();
    await expect(player.getByRole("slider", { name: "Hit sounds", exact: true })).toBeEnabled();
    await expect(player.getByRole("checkbox", { name: "Show direction text" })).toHaveCount(0);
    await expect(player.getByRole("checkbox", { name: "Show control points" })).not.toBeChecked();
    await player.screenshot({ path: info.outputPath(`settings-${theme.toLowerCase()}.png`) });
    await settings.click();
  }
});

test("local beatmaps and music stay in the browser and release on replacement", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as { createdUrls: string[]; revokedUrls: string[] };
    state.createdUrls = [];
    state.revokedUrls = [];
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (object) => {
      const url = create(object);
      state.createdUrls.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      state.revokedUrls.push(url);
      revoke(url);
    };
  });
  const uploads: string[] = [];
  page.on("request", (request) => {
    if (!["GET", "HEAD"].includes(request.method())) uploads.push(request.url());
  });
  await page.goto("/e2e/browser/preview.html");
  await page.getByLabel("Beatmap (.ugc)").setInputFiles({
    name: "local.ugc",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "@TITLE\tLocal beatmap\n@ARTIST\tFixture artist\n@DESIGN\tFixture designer\n@BPM\t0'0\t120\n#0'0:t04\n#3'0:t84",
    ),
  });
  await page
    .getByLabel("Music (optional)")
    .setInputFiles({ name: "local.wav", mimeType: "audio/wav", buffer: wave() });
  await page.getByRole("button", { name: "Load local files" }).click();
  await expect(
    page.getByRole("heading", { name: "Local beatmap - Fixture artist", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-slot="card-description"]')).toHaveText("Fixture designer");
  await expect(page.locator("canvas").first()).toBeVisible();
  const firstUrl = await page.evaluate(() =>
    (window as unknown as { createdUrls: string[] }).createdUrls.at(-1)!,
  );
  expect(firstUrl).toMatch(/^blob:/);
  const supportsAudio = await page.evaluate(() => typeof AudioContext !== "undefined");
  if (supportsAudio) {
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByRole("slider", { name: "Playback position" })).not.toHaveValue("0");
    expect(
      await page.evaluate(
        () => (window as unknown as { previewMedia: HTMLMediaElement }).previewMedia.src,
      ),
    ).toBe(firstUrl);
  }

  await page.getByLabel("Beatmap (.ugc)").setInputFiles({
    name: "replacement.ugc",
    mimeType: "text/plain",
    buffer: Buffer.from("@DESIGN\tFixture designer\n@BPM\t0'0\t120\n#1'0:t04"),
  });
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { revokedUrls: string[] }).revokedUrls))
    .toContain(firstUrl);
  if (supportsAudio) {
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { previewContext: AudioContext }).previewContext.state,
        ),
      )
      .toBe("closed");
  }
  await page.getByRole("button", { name: "Load local files" }).click();
  await expect(page.getByRole("heading", { name: "replacement.ugc", exact: true })).toBeVisible();
  await expect(page.locator('[data-slot="card-description"]')).toHaveText("Fixture designer");
  await expect(page.getByRole("slider", { name: "Playback position" })).toHaveValue("0");
  const secondUrl = await page.evaluate(() =>
    (window as unknown as { createdUrls: string[] }).createdUrls.at(-1)!,
  );
  await page.getByRole("button", { name: "Close preview" }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { revokedUrls: string[] }).revokedUrls))
    .toContain(secondUrl);
  expect(uploads).toEqual([]);

  await page.getByRole("button", { name: "Clear files" }).click();
  await expect(page.getByRole("button", { name: "Load local files" })).toBeDisabled();
  await page.getByLabel("Beatmap (.ugc)").setInputFiles({
    name: "invalid.ugc",
    mimeType: "text/plain",
    buffer: Buffer.from("@BPM\t0'0\t0\n#0'0:t04"),
  });
  await page.getByRole("button", { name: "Load local files" }).click();
  await expect(page.getByText(/Preview diagnostics/)).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("styled settings work with keyboard input and in expanded mode", async ({ page }) => {
  await page.goto("/e2e/browser/preview.html");
  await page.getByRole("button", { name: "Open preview", exact: true }).click();
  await setPortrait(page, false);
  const player = page.getByRole("region", { name: "Beatmap preview", exact: true });
  await page.getByRole("button", { name: "Expand / restore" }).click();
  await expect(page.getByRole("button", { name: "Expand / restore" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const field = page.getByRole("region", { name: /Beatmap columns/ });
  await expect
    .poll(() =>
      player.evaluate((element) => {
        const bottom = element.querySelector('[data-slot="card"]')!.getBoundingClientRect().bottom;
        return Math.abs(bottom - window.innerHeight);
      }),
    )
    .toBeLessThan(2);
  await expect
    .poll(() => field.evaluate((element) => element.scrollHeight - element.clientHeight))
    .toBe(0);
  const zoom = page.getByRole("status", { name: "Zoom", exact: true });
  await setZoom(page, 1);
  await page.getByRole("button", { name: "Zoom in", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(zoom).toHaveText("125%");
  await page.getByRole("button", { name: "Zoom out", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(zoom).toHaveText("100%");
  const settings = player.getByRole("button", { name: "Preview settings" });
  const credits = player.getByRole("link", { name: "Credits and licenses" });
  await expect(credits).toBeHidden();
  await settings.click();
  await expect(credits).toBeVisible();
  await expect(credits).toHaveAttribute("href", "/assets/NOTICE.txt");
  const music = player.getByRole("slider", { name: "Music", exact: true });
  await music.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(music).toHaveValue("0.8");
  const hits = player.getByRole("slider", { name: "Hit sounds", exact: true });
  await hits.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(hits).toHaveValue("0.45");
  await page.keyboard.press("Escape");
  await expect(hits).toBeHidden();
  // Native fullscreen may consume Escape before the page receives it.
  const expand = page.getByRole("button", { name: "Expand / restore" });
  if ((await expand.getAttribute("aria-pressed")) === "false") await expand.click();
  await settings.click();
  await expect(hits).toHaveValue("0.45");
  await settings.click();
  const position = page.getByRole("slider", { name: "Playback position" });
  await position.focus();
  await page.keyboard.press("ArrowRight");
  expect(Number(await position.inputValue())).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Expand / restore" }).click();
  await expect(page.getByRole("button", { name: "Expand / restore" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  // Inline Escape dismisses just the settings and returns focus to its trigger.
  await settings.click();
  await hits.focus();
  await page.keyboard.press("Escape");
  await expect(hits).toBeHidden();
  await expect(settings).toBeFocused();
});

test("expanded fallback fills available height, repacks on resize and restores inline height", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1100, height: 1200 });
  await page.addInitScript(() => {
    // Exercise browsers without the Fullscreen API, including mobile Safari.
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", { value: undefined });
  });
  await page.goto("/e2e/browser/preview.html");
  await page.getByLabel("Beatmap (.ugc)").setInputFiles({
    name: "resize.ugc",
    mimeType: "text/plain",
    buffer: Buffer.from("@BPM\t0'0\t120\n@BEAT\t0\t3\t4\n@BEAT\t1\t6\t4\n#8'0:t04"),
  });
  await page.getByRole("button", { name: "Load local files" }).click();
  const player = page.getByRole("region", { name: "Beatmap preview", exact: true });
  const field = page.getByRole("region", { name: /Beatmap columns/ });
  const position = page.getByRole("slider", { name: "Playback position" });
  const expand = page.getByRole("button", { name: "Expand / restore" });
  const zoom = page.getByRole("status", { name: "Zoom", exact: true });
  await expect(field.locator("canvas").first()).toBeVisible();
  const inlineHeight = (await field.boundingBox())!.height;
  await page.getByRole("button", { name: "Next bar" }).click();
  await expand.click();
  await expect.poll(async () => (await field.boundingBox())!.height).toBeGreaterThan(inlineHeight);
  await expect(position).toHaveValue("1.5");
  await expect
    .poll(() =>
      field.evaluate(
        (element) =>
          Number.parseFloat(element.querySelector("canvas")?.style.height ?? "0") -
          element.clientHeight,
      ),
    )
    .toBe(0);
  const packedWidth = () =>
    field
      .locator('[data-slot="preview-columns"]')
      .evaluate((element) => Number.parseFloat(element.style.width));
  const tallWidth = await packedWidth();
  await page.setViewportSize({ width: 1100, height: 680 });
  await expect.poll(async () => (await field.boundingBox())!.height).toBeLessThan(inlineHeight);
  await expect.poll(packedWidth).toBeGreaterThan(tallWidth);
  await expect(position).toHaveValue("1.5");

  await setZoom(page, 2);
  for (const height of [680, 1200]) {
    await page.setViewportSize({ width: 1100, height });
    await expect
      .poll(() =>
        player.evaluate((element) => {
          const card = element.querySelector('[data-slot="card"]')!;
          return Math.abs(card.getBoundingClientRect().bottom - window.innerHeight);
        }),
      )
      .toBeLessThan(2);
    await expect
      .poll(() =>
        field.evaluate((element) => {
          const canvasHeight = element.querySelector("canvas")!.getBoundingClientRect().height;
          return (
            Math.abs(canvasHeight - element.clientHeight) +
            element.scrollHeight -
            element.clientHeight
          );
        }),
      )
      .toBeLessThan(1);
    const second = field.locator('canvas[data-column="1"]');
    // 200% keeps its proportional spacing; an oversized 6/4 bar fits the shorter viewport.
    const fieldHeight = await field.evaluate((element) => element.clientHeight);
    const pixelsPerQuarter = Math.min(128, (fieldHeight - NOTE_PADDING - LOOK_AHEAD * 0.5) / 6);
    await second.click({
      position: {
        x: FIELD_LEFT * 0.5 + 10,
        y: fieldHeight - NOTE_PADDING * 0.5 - 3 * pixelsPerQuarter,
      },
    });
    expect(Number(await position.inputValue())).toBeCloseTo(3, 1);
    await expect(page.getByRole("button", { name: "Play", exact: true })).toBeInViewport();
  }
  await player.screenshot({ path: info.outputPath("expanded-preview.png") });
  await page.setViewportSize({ width: 1100, height: 320 });
  await expect
    .poll(() => player.evaluate((element) => element.scrollHeight - element.clientHeight))
    .toBeGreaterThan(0);
  await player.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(player.locator('[data-slot="preview-controls"]')).toBeInViewport();
  await expand.click();
  await expect.poll(async () => (await field.boundingBox())!.height).toBe(inlineHeight);
  expect(Number(await position.inputValue())).toBeCloseTo(3, 1);
  await expect(zoom).toHaveText("200%");
});
