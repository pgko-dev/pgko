import { expect, test, type Page } from "@playwright/test";

import { bundle, songs } from "../fixtures/bundle";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: { user: null } }));
});

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

async function mockBundleList(page: Page) {
  const requests: URL[] = [];
  await page.route(/\/api\/bundles(?:\/manage)?(?:\?|$)/, async (route) => {
    requests.push(new URL(route.request().url()));
    await route.fulfill({
      json: {
        bundles: Array.from({ length: 120 }, (_, index) => ({
          ...bundle,
          id: `collection-${index}`,
          title: `Collection ${index}`,
          status: "released",
          songs: [songs[0]],
        })),
        nextCursor: null,
      },
    });
  });
  return requests;
}

test("keeps the direction button and compact field labels while describing the selected order", async ({
  page,
}) => {
  const requests = await mockBundleList(page);
  await page.goto("/e2e/browser/bundle-filters.html");
  const direction = page.getByRole("button", { name: "Toggle sort order", exact: true });
  const sorter = page.getByRole("combobox", { name: "Sort by", exact: true });
  await expect(sorter.locator('[data-slot="select-value"]')).toHaveText("Last updated");
  await expect(direction).toHaveAttribute("title", "Recently updated");
  await direction.click();
  await expect(direction).toHaveAttribute("title", "Least recently updated");
  await expect.poll(() => requests.at(-1)?.searchParams.get("order")).toBe("asc");

  await sorter.click();
  await expect(page.getByRole("option")).toHaveCount(5);
  await page.getByRole("option", { name: "Downloads", exact: true }).click();
  await expect(sorter.locator('[data-slot="select-value"]')).toHaveText("Downloads");
  await expect(direction).toHaveAccessibleDescription("Least downloaded");
  await direction.click();
  await expect(direction).toHaveAttribute("title", "Most downloaded");
  await expect.poll(() => requests.at(-1)?.searchParams.get("sort")).toBe("downloads");
  await expect.poll(() => requests.at(-1)?.searchParams.get("order")).toBe("desc");
});

test("URL state survives refresh and clears without adding typing history", async ({ page }) => {
  const requests = await mockBundleList(page);
  const params = new URLSearchParams({
    q: "123",
    sort: "title",
    order: "asc",
    diff: JSON.stringify([3, 5]),
    tag: JSON.stringify(["remix"]),
  });
  await page.goto(`/e2e/browser/bundle-filters.html?${params}`);
  const search = page.getByRole("textbox", { name: "Search…" });
  await expect(search).toHaveValue("123");
  await expect(page.locator('[data-slot="select-value"]')).toHaveText("Title");
  await expect(
    page.getByRole("button", { name: "Remove MASTER filter", exact: true }),
  ).toBeVisible();
  await expect.poll(() => requests.at(-1)?.searchParams.getAll("diff")).toEqual(["3", "5"]);
  await expect.poll(() => requests.at(-1)?.searchParams.getAll("tag")).toEqual(["remix"]);
  const historyLength = await page.evaluate(() => history.length);

  await search.fill("new search");
  await page.getByRole("button", { name: "Toggle sort order", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("new search");
  await expect.poll(() => new URL(page.url()).searchParams.get("order")).toBe("desc");
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  const sharedUrl = page.url();
  await page.reload();
  await expect(search).toHaveValue("new search");
  await expect(
    page.getByRole("button", { name: "Toggle sort order", exact: true }),
  ).toHaveAttribute("title", "Title: Z–A");
  await expect(
    page.getByRole("button", { name: "Remove remix filter", exact: true }),
  ).toBeVisible();
  expect(page.url()).toBe(sharedUrl);

  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.has("q")).toBe(false);
  await expect.poll(() => new URL(page.url()).searchParams.has("diff")).toBe(false);
  await expect.poll(() => new URL(page.url()).searchParams.has("tag")).toBe(false);
  await page.reload();
  await expect(search).toHaveValue("");
  await expect(page.getByRole("button", { name: /^Remove .* filter$/ })).toHaveCount(0);
});

for (const returnMethod of ["page", "browser"] as const) {
  test(`${returnMethod} back restores the filtered URL and virtualized scroll position`, async ({
    page,
  }, testInfo) => {
    await mockBundleList(page);
    await page.goto("/e2e/browser/bundle-filters.html?q=collection&sort=downloads&order=asc");
    await expect(page.getByRole("heading", { name: "Collection 0", exact: true })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 1600));
    const card = page.getByRole("link", {
      name: testInfo.project.use.isMobile ? "Collection 8" : "Collection 18",
      exact: true,
    });
    await expect(card).toBeInViewport();
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(500);
    const listUrl = page.url();
    await card.click();
    await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();

    if (returnMethod === "page") {
      await page.getByRole("button", { name: "Back", exact: true }).click();
    } else {
      await page.goBack();
    }

    await expect(page).toHaveURL(listUrl);
    await expect(page.getByRole("textbox", { name: "Search…" })).toHaveValue("collection");
    await expect(page.locator('[data-slot="select-value"]')).toHaveText("Downloads");
    await expect
      .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - scrollY))
      .toBeLessThan(3);
  });
}

test("draft links retain their scope and describe creation order", async ({ page }) => {
  const requests = await mockBundleList(page);
  await page.goto("/e2e/browser/bundle-filters.html?mode=draft&q=draft&order=asc");
  const direction = page.getByRole("button", { name: "Toggle sort order", exact: true });
  await expect(page.getByRole("combobox", { name: "Sort by" })).toBeDisabled();
  await expect(page.locator('[data-slot="select-value"]')).toHaveText("Date created");
  await expect(direction).toHaveAttribute("title", "Oldest drafts");
  await direction.click();
  await expect(direction).toHaveAttribute("title", "Newest drafts");
  await expect.poll(() => requests.at(-1)?.pathname).toBe("/api/bundles/manage");
  await expect.poll(() => requests.at(-1)?.searchParams.get("draftsOnly")).toBe("true");
  expect(new URL(page.url()).searchParams.get("mode")).toBe("draft");
  await page.reload();
  await expect(direction).toHaveAttribute("title", "Newest drafts");
});
