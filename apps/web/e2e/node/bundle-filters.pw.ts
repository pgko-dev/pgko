import { expect, test, type Page } from "@playwright/test";

async function mockSuggestions(page: Page) {
  const queries: URLSearchParams[] = [];
  await page.route("**/api/bundles/tag-suggestions*", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    queries.push(params);
    const term = params.get("q") ?? "";
    const items = term
      ? ["remix", "original", "orchestral"].filter((tag) => tag.includes(term))
      : params.get("cursor")
        ? ["next page tag"]
        : Array.from({ length: 20 }, (_, index) => `tag ${index}`);
    await route.fulfill({
      json: {
        items,
        nextCursor: !term && !params.get("cursor") ? "next-page" : null,
      },
    });
  });
  return queries;
}

test("quick filters serialize combined criteria and Enter tags without a video filter", async ({
  page,
}) => {
  const requests: URLSearchParams[] = [];
  await page.route("**/api/bundles*", async (route) => {
    requests.push(new URL(route.request().url()).searchParams);
    await route.fulfill({ json: { bundles: [], nextCursor: null } });
  });
  await mockSuggestions(page);
  await page.goto("/e2e/browser/bundle-filters.html");
  await expect(page.getByRole("button", { name: "Has video" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Creator" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Level|Constant/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Difficulty", exact: true }).click();
  await page.getByRole("button", { name: "MASTER", exact: true }).click();
  await page.getByRole("button", { name: "ULTIMA", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect.poll(() => requests.at(-1)?.getAll("diff")).toEqual(["3", "5"]);

  await page.getByRole("button", { name: "Tags", exact: true }).click();
  const tag = page.getByRole("combobox", { name: "Tags", exact: true });
  await tag.fill("Remix");
  await expect.poll(() => requests.at(-1)?.getAll("tag")).toEqual([]);
  await tag.press("Enter");
  await expect.poll(() => requests.at(-1)?.getAll("tag")).toEqual(["remix"]);
  await tag.fill(" remix ");
  await tag.press("Enter");
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Remove remix filter", exact: true }),
  ).toHaveCount(1);
  await tag.fill("a");
  await tag.press("Enter");
  await expect(page.getByRole("alert")).toHaveText("Tag must be at least 3 characters.");
  await tag.fill("invalid!");
  await tag.press("Enter");
  await expect(page.getByRole("alert")).toHaveText(
    "Tag can only contain lowercase letters (a–z), numbers (0–9), and spaces.",
  );
  await tag.fill("original");
  await tag.dispatchEvent("keydown", { key: "Enter", isComposing: true });
  await expect(tag).toHaveValue("original");
  await tag.press("Enter");
  await expect.poll(() => requests.at(-1)?.getAll("tag")).toEqual(["remix", "original"]);
  await page.keyboard.press("Escape");

  await page.getByRole("textbox", { name: "Search…" }).fill("song");
  await expect.poll(() => requests.at(-1)?.get("q")).toBe("song");
  expect({
    ...Object.fromEntries(requests.at(-1)!),
    tag: requests.at(-1)!.getAll("tag"),
    diff: requests.at(-1)!.getAll("diff"),
  }).toEqual({
    diff: ["3", "5"],
    tag: ["remix", "original"],
    q: "song",
    sort: "reuploadedAt",
    order: "desc",
  });
  await page.getByRole("button", { name: "Remove remix filter", exact: true }).click();
  await expect.poll(() => requests.at(-1)?.getAll("tag")).toEqual(["original"]);

  await page.getByRole("button", { name: "Tags", exact: true }).click();
  for (let index = 0; index < 7; index++) {
    await tag.fill(`custom ${index}`);
    await tag.press("Enter");
  }
  await tag.fill("original");
  await tag.press("Enter");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await tag.fill("too many");
  await tag.press("Enter");
  await expect(page.getByRole("alert")).toHaveText("You can add up to 8 tags.");
  await expect.poll(() => requests.at(-1)?.getAll("tag").length).toBe(8);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect.poll(() => requests.at(-1)?.get("diff")).toBeNull();
  expect(Object.fromEntries(requests.at(-1)!)).toEqual({
    q: "song",
    sort: "reuploadedAt",
    order: "desc",
  });
});

test("filters and popovers fit a narrow screen in both themes", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route("**/api/bundles*", (route) =>
    route.fulfill({ json: { bundles: [], nextCursor: null } }),
  );
  await mockSuggestions(page);
  await page.goto("/e2e/browser/bundle-filters.html");
  for (const theme of ["Light", "Dark"]) {
    await page.getByRole("button", { name: theme, exact: true }).click();
    for (const filter of ["Difficulty", "Tags"]) {
      await page.getByRole("button", { name: filter, exact: true }).click();
      const popup = page.getByRole("dialog", { name: filter, exact: true });
      await expect(popup).toBeVisible();
      await expect(popup).toHaveCSS("opacity", "1");
      const bounds = await popup.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
      if (filter === "Tags") {
        await expect(page.getByRole("option")).toHaveCount(20);
        await page.screenshot({ path: testInfo.outputPath(`mobile-${theme}.png`) });
      }
      await page.keyboard.press("Escape");
      await expect(popup).toBeHidden();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test("suggestions load more on scroll, reset on search, and support keyboard selection", async ({
  page,
}) => {
  await page.route("**/api/bundles*", (route) =>
    route.fulfill({ json: { bundles: [], nextCursor: null } }),
  );
  const queries = await mockSuggestions(page);
  await page.goto("/e2e/browser/bundle-filters.html");
  await page.getByRole("button", { name: "Tags", exact: true }).click();
  await expect(page.getByRole("option")).toHaveCount(20);
  await page.locator('[data-slot="scroll-area-viewport"]').evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.getByRole("option", { name: "next page tag" })).toBeVisible();
  expect(queries.at(-1)?.get("cursor")).toBe("next-page");
  const input = page.getByRole("combobox", { name: "Tags" });
  await input.fill("ori");
  await expect(page.getByRole("option", { name: "original" })).toBeVisible();
  expect(queries.at(-1)?.get("cursor")).toBeNull();
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Remove original filter", exact: true }),
  ).toBeVisible();
  await expect(input).toHaveValue("");
});

test("sorter and filters share space then wrap as independent groups", async ({
  page,
}, testInfo) => {
  await page.route("**/api/bundles*", (route) =>
    route.fulfill({ json: { bundles: [], nextCursor: null } }),
  );
  await mockSuggestions(page);
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto("/e2e/browser/bundle-filters.html");
  const sorter = page.getByTestId("bundle-sorter");
  const filters = page.getByTestId("bundle-filters");
  expect((await sorter.boundingBox())!.y).toBe((await filters.boundingBox())!.y);
  const controls = [
    page.getByRole("button", { name: "Toggle sort order" }),
    sorter.getByRole("combobox"),
    page.getByRole("button", { name: "Difficulty", exact: true }),
    page.getByRole("button", { name: "Tags", exact: true }),
  ];
  for (let index = 1; index < controls.length; index++) {
    const previous = (await controls[index - 1]!.boundingBox())!;
    const current = (await controls[index]!.boundingBox())!;
    expect(current.x - previous.x - previous.width).toBeCloseTo(8);
  }
  await page.getByRole("button", { name: "Tags", exact: true }).click();
  await expect(page.getByRole("option")).toHaveCount(20);
  await expect(page.getByRole("dialog")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: testInfo.outputPath("desktop-tags.png") });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.setViewportSize({ width: 420, height: 800 });
  expect((await sorter.boundingBox())!.y).toBeLessThan((await filters.boundingBox())!.y);
  await page.screenshot({ path: testInfo.outputPath("wrapped-toolbar.png") });
  await page.setViewportSize({ width: 320, height: 800 });
  for (const group of [sorter, filters]) {
    await group.evaluate((element) => {
      const button = element.querySelector("button")!;
      for (let index = 0; index < 5; index++) {
        element.append(button.cloneNode(true));
      }
    });
    const bounds = await group.boundingBox();
    expect(bounds!.height).toBeGreaterThan(30);
    expect(bounds!.width).toBeLessThanOrEqual(288);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
