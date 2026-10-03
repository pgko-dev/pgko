import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";
import {
  COLUMN_WIDTH,
  FIELD_HEIGHT,
  FIELD_LEFT,
  FIELD_WIDTH,
  NOTE_PADDING,
  createLayout,
  parseUgcChart,
  tickY,
} from "ugc-render";

import { setPortrait } from "./view";

type PaintedText = {
  text: string;
  x: number;
  y: number;
  font: string;
  baseline: string;
  color: string;
  width: number;
};
type TextCapture = { previewText: WeakMap<HTMLCanvasElement, PaintedText[]> };

const beatmap = [
  "@BPM\t0'0\t120",
  "@BEAT\t0\t4\t4",
  "@BEAT\t1\t3\t4",
  "@BPM\t1'0\t150",
  "@TIL\t3\t0'480\t0.75",
  "@SPDMOD\t0'960\t2",
  "#0'240:x04D",
  "#0'240:t04",
  "#0'0:hC4",
  "#360>c",
  "#720>s",
  "#960>c",
  "#0'240:h04",
  "#480>s",
  "#0'240:a04UCN",
  "#0'480:f44R",
  "#0'720:s04",
  "#240>c44",
  "#720>s84",
  "#0'1200:tC2",
  "#0'1200:HC228I",
  "#120:c",
  "#240:s",
  "#1'0:C44280,120",
  "#480:c8428",
  "#1'720:C8428Z,0",
  "#480:cA228",
  "#1'960:h04",
  "#480>s",
  "#1'1440:a04UCN",
  "#1'1440:t08",
  "#3'0:t84",
].join("\n");

async function open(page: Page, source = beatmap) {
  await page.addInitScript(() => {
    const capture = window as unknown as TextCapture;
    capture.previewText = new WeakMap();
    // oxlint-disable-next-line typescript/unbound-method -- Called below with the original canvas context as its receiver.
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      const labels = capture.previewText.get(this.canvas) ?? [];
      labels.push({
        text,
        x,
        y,
        font: this.font,
        baseline: this.textBaseline,
        color: typeof this.fillStyle === "string" ? this.fillStyle : "",
        width: this.measureText(text).width,
      });
      capture.previewText.set(this.canvas, labels);
      fillText.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto("/e2e/browser/preview.html");
  await page.getByLabel("Beatmap (.ugc)").setInputFiles({
    name: "appearance.ugc",
    mimeType: "text/plain",
    buffer: Buffer.from(source),
  });
  await page.getByRole("button", { name: "Load local files" }).click();
  await setPortrait(page, false);
  await expect(page.locator("canvas").first()).toBeVisible();
}

const noteY = (tick: number) => NOTE_PADDING + FIELD_HEIGHT - (tick * 64) / 480;
const laneX = (lane: number) => FIELD_LEFT + (lane * FIELD_WIDTH) / 16;

function canvas(page: Page) {
  return page.locator('canvas[data-column="0"]');
}

async function captureCanvas(page: Page, path: string) {
  const url = await canvas(page).evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await writeFile(path, Buffer.from(url.split(",")[1], "base64"));
}

async function pixels(page: Page, x: number, y: number, width = 1, height = 1) {
  return canvas(page).evaluate(
    (element, region) => {
      const surface = element as HTMLCanvasElement;
      const ratio = surface.width / region.columnWidth;
      return Array.from(
        surface
          .getContext("2d")!
          .getImageData(
            Math.floor(region.x * ratio),
            Math.floor(region.y * ratio),
            Math.max(1, Math.floor(region.width * ratio)),
            Math.max(1, Math.floor(region.height * ratio)),
          ).data,
      );
    },
    { x, y, width, height, columnWidth: COLUMN_WIDTH },
  );
}

async function labels(page: Page) {
  return canvas(page).evaluate(
    (element) =>
      (window as unknown as TextCapture).previewText.get(element as HTMLCanvasElement) ?? [],
  );
}

test("air-crush traces use the Margrete palette in UGC color order", async ({ page }, info) => {
  // UGC uses Y for purple, B for pink, C for white and D for black.
  const colors = [
    ["0", [255, 0, 187]],
    ["1", [227, 0, 0]],
    ["2", [227, 182, 0]],
    ["3", [246, 255, 0]],
    ["4", [153, 255, 0]],
    ["5", [0, 227, 4]],
    ["6", [0, 219, 227]],
    ["7", [0, 179, 255]],
    ["8", [0, 141, 255]],
    ["9", [59, 47, 224]],
    ["A", [125, 0, 227]],
    ["Y", [255, 0, 187]],
    ["B", [217, 0, 196]],
    ["C", [255, 255, 255]],
    ["D", [70, 72, 77]],
    ["Z", [0, 0, 0]],
  ] as const;
  const notes = colors.flatMap(([code], lane) => {
    const position = lane.toString(36).toUpperCase();
    return [`#0'0:C${position}128${code},0`, `#1920:c${position}128`];
  });
  const source = ["@BPM\t0'0\t120", ...notes].join("\n");
  expect(parseUgcChart(Buffer.from(source)).diagnostics).toEqual([]);
  await open(page, source);
  for (const [lane, [code, expected]] of colors.entries()) {
    // Sample between beat lines, including a transparent trace on the black field.
    const actual = (await pixels(page, laneX(lane + 0.5), noteY(900))).slice(0, 3);
    expect(actual, `UGC color ${code}`).toEqual(expected);
  }
  await captureCanvas(page, info.outputPath("air-crush-palette.png"));
});

test("EX and air-paired ground markers stay on top and control markers are opt-in", async ({
  page,
}, info) => {
  await open(page);
  const controls = page.getByRole("checkbox", { name: "Show control points", exact: true });
  const settings = page.getByRole("button", { name: "Preview settings", exact: true });
  await settings.click();
  await expect(controls).not.toBeChecked();
  await settings.click();
  expect((await pixels(page, laneX(0) + 8, noteY(240))).slice(0, 3)).toEqual([204, 204, 0]);
  expect((await pixels(page, laneX(0) + 8, noteY(3360))).slice(0, 3)).toEqual([0, 255, 0]);
  const regions = [
    { tick: 360, lane: 12 },
    { tick: 960, lane: 12 },
    { tick: 960, lane: 4 },
    { tick: 1320, lane: 12 },
    { tick: 2400, lane: 8 },
    { tick: 2640, lane: 8 },
  ];
  const markers = () =>
    Promise.all(
      regions.map(({ tick, lane }) => pixels(page, laneX(lane) + 5, noteY(tick) - 4, 8, 8)),
    );
  const hidden = await markers();
  const holdControls = () =>
    Promise.all([360, 960].map((tick) => pixels(page, laneX(12) + 8, noteY(tick))));
  const holdInteriors = await holdControls();
  const holdTail = await pixels(page, laneX(12) + 5, noteY(720) - 4, 8, 8);
  expect((await pixels(page, laneX(12) + 8, noteY(720))).slice(0, 3)).toEqual([238, 119, 0]);
  await captureCanvas(page, info.outputPath("appearance-default.png"));
  await page.getByRole("button", { name: "Next bar" }).click();
  await settings.click();
  await controls.check();
  await settings.click();
  await expect.poll(markers).not.toEqual(hidden);
  const visible = await markers();
  for (const [index, marker] of visible.entries()) expect(marker).not.toEqual(hidden[index]);
  // Hollow markers leave their ribbon visible through the center.
  expect(await holdControls()).toEqual(holdInteriors);
  expect(await pixels(page, laneX(12) + 5, noteY(720) - 4, 8, 8)).toEqual(holdTail);
  await expect(page.getByRole("slider", { name: "Playback position" })).toHaveValue("2");
  await captureCanvas(page, info.outputPath("appearance-controls.png"));
  await settings.click();
  await controls.uncheck();
  await expect.poll(markers).toEqual(hidden);
});

test("labels share a smaller size, center on ticks and omit speed events", async ({
  page,
}, info) => {
  await open(page);
  const painted = await labels(page);
  expect(painted.map((label) => label.text)).toEqual([
    "1",
    "2",
    "3",
    "4",
    "120",
    "150",
    "4/4",
    "3/4",
  ]);
  for (const label of painted) {
    expect(label.font).toBe("20px system-ui");
    expect(label.baseline).toBe("middle");
  }
  expect(painted.find((label) => label.text === "1")!.y).toBe(noteY(0));
  const meter = painted.find((label) => label.text === "3/4")!;
  const bar = painted.find((label) => label.text === "2")!;
  expect(meter.y).toBe(noteY(1920));
  expect(meter.color).toBe("#ffaa55");
  expect(meter.x).toBeLessThan(bar.x - bar.width);
  expect(meter.x - meter.width).toBeGreaterThan(0);
  expect(painted.find((label) => label.text === "150")!.x).toBeGreaterThan(
    FIELD_LEFT + FIELD_WIDTH,
  );
  const cursor = page.locator('[data-slot="preview-cursor"]');
  await expect(cursor).toHaveCSS("height", "1px");
  await expect(cursor).toHaveCSS("background-color", "rgb(255, 0, 0)");
  await expect(cursor).toHaveCSS("box-shadow", "none");
  await captureCanvas(page, info.outputPath("appearance-labels.png"));
});

test("lane and beat grid continues behind notes in the column extension", async ({
  page,
}, info) => {
  const source = [
    "@BPM\t0'0\t120",
    "@BEAT\t0\t12\t4",
    "@BEAT\t1\t8\t4",
    "#0'0:t04",
    "#0'5400:s84",
    "#480>cA4",
    "#960>s84",
    "#1'120:t44",
    "#1'120:a44UCN",
    "#1'240:t04",
    "#2'0:tC4",
  ].join("\n");
  const result = parseUgcChart(Buffer.from(source));
  expect(result.diagnostics).toEqual([]);
  const column = createLayout(result.chart!).columns[0];
  const top = tickY(column, column.lookAheadEndTick);
  const nextTapY = tickY(column, 6000);
  expect(nextTapY).toBeLessThan(top);
  await open(page, source);
  expect((await pixels(page, laneX(0) + 8, nextTapY)).slice(0, 3)).toEqual([204, 0, 0]);
  const hasGrid = (sample: number[]) =>
    sample.some((channel, index) => index % 4 !== 3 && channel > 0);
  expect(hasGrid(await pixels(page, laneX(14) - 2, top - 12, 4, 4))).toBe(true);
  expect(hasGrid(await pixels(page, laneX(14) + 4, nextTapY - 2, 8, 4))).toBe(true);
  // The empty space above the note clipping boundary stays empty.
  expect(hasGrid(await pixels(page, laneX(14) - 2, top - NOTE_PADDING - 8, 4, 4))).toBe(false);
  await captureCanvas(page, info.outputPath("column-extension.png"));
});
