import { expect, type Page } from "@playwright/test";

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
