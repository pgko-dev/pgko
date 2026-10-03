import { expect, type Page } from "@playwright/test";
import { PREVIEW_ZOOMS } from "ugc-render";

export async function setZoom(page: Page, zoom: number) {
  const display = page.getByRole("status", { name: "Zoom", exact: true });
  const current = Number.parseFloat((await display.textContent())!) / 100;
  const currentIndex = PREVIEW_ZOOMS.findIndex((value) => value === current);
  const targetIndex = PREVIEW_ZOOMS.findIndex((value) => value === zoom);
  expect(currentIndex).toBeGreaterThanOrEqual(0);
  expect(targetIndex).toBeGreaterThanOrEqual(0);
  const button = page.getByRole("button", {
    name: targetIndex > currentIndex ? "Zoom in" : "Zoom out",
    exact: true,
  });
  for (let step = 0; step < Math.abs(targetIndex - currentIndex); step++) await button.click();
  await expect(display).toHaveText(`${zoom * 100}%`);
}

export async function setPortrait(page: Page, portrait: boolean) {
  const settings = page.getByRole("button", { name: "Preview settings", exact: true });
  await settings.click();
  await page.getByRole("checkbox", { name: "Portrait view", exact: true }).setChecked(portrait);
  await settings.click();
  await expect(page.getByRole("region", { name: /Beatmap columns/ })).toHaveAttribute(
    "data-portrait",
    String(portrait),
  );
}
