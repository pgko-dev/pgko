import { expect, test, type Page } from "@playwright/test";

import { PREVIEW_LOAD_TIMEOUT_MS } from "../../src/lib/preview/load-timeout";
import { fixture } from "../fixtures/beatmap";
import { bundleId, songs } from "../fixtures/bundle";

import { wave } from "./audio";

async function setup(page: Page, firstLoad?: Promise<void>) {
  let requests = 0;
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: { user: null } }));
  await page.route("**/api/bundles/*/files", (route) => {
    requests++;
    return route.fulfill({
      json: {
        bundleId,
        revision: 1,
        status: "ready",
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        charts: songs.map((song) => ({
          id: song.id,
          path: song.ugcPath,
          file: {
            status: "ready",
            url: `${test.info().project.use.baseURL}/${song.ugcPath}`,
            contentType: "application/octet-stream",
          },
          fileMappings: {
            "fixture.wav": {
              status: "ready",
              url: `${test.info().project.use.baseURL}/music.wav`,
              contentType: "audio/wav",
            },
          },
        })),
      },
    });
  });
  await page.route("**/fixture-*.ugc", async (route) => {
    if (route.request().url().endsWith("/fixture-1.ugc")) await firstLoad;
    await route.fulfill({ contentType: "application/octet-stream", body: fixture });
  });
  await page.route(/\/(music|excerpt)\.wav$/, (route) =>
    route.fulfill({ contentType: "audio/wav", body: wave() }),
  );
  await page.goto("/e2e/browser/bundle-page.html");
  await expect(page.getByRole("region", { name: "Beatmap browser", exact: true })).toBeVisible();
  return () => requests;
}

async function showList(page: Page) {
  const picker = page.getByRole("button", { name: "Select a beatmap", exact: true });
  if (await picker.isVisible()) {
    if ((await picker.getAttribute("aria-expanded")) === "false") await picker.click();
    await expect(picker).toHaveAttribute("aria-expanded", "true");
  }
  await expect(page.getByRole("searchbox")).toBeVisible();
}

function row(page: Page, number: number) {
  return page.getByRole("button", {
    name: new RegExp(`^Preview beatmap: Beatmap ${String(number).padStart(2, "0")} ·`),
  });
}

test("split page keeps controls visible while browsing, searching and switching beatmaps", async ({
  page,
}, info) => {
  const requests = await setup(page);
  expect(requests()).toBe(0);
  await showList(page);
  await expect(page.getByRole("searchbox")).not.toHaveAttribute("placeholder");
  if (info.project.use.isMobile) {
    for (const action of [
      page.getByRole("button", { name: "Play preview: Beatmap 01", exact: true }),
      page.getByRole("link", { name: "Video: Beatmap 01", exact: true }),
    ]) {
      await expect
        .poll(async () => {
          const bounds = (await action.boundingBox())!;
          return Math.min(bounds.width, bounds.height);
        })
        .toBeGreaterThan(43.99);
    }
  }
  await row(page, 1).click();
  await expect(page.getByRole("heading", { name: "Beatmap 01 - First artist" })).toBeVisible();
  const controls = page.locator('[data-slot="preview-controls"]');
  if (!info.project.use.isMobile) {
    const bounds = (await controls.boundingBox())!;
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    const list = page.getByRole("region", { name: "Beatmaps (24)" });
    await list.evaluate((element) => {
      element.scrollTop = 700;
    });
    const before = await list.evaluate((element) => element.scrollTop);
    await row(page, 10).click();
    await expect(page.getByRole("heading", { name: "Beatmap 10 - Second artist" })).toBeVisible();
    expect(await list.evaluate((element) => element.scrollTop)).toBeCloseTo(before, 0);
    const after = (await controls.boundingBox())!;
    expect(after.y).toBeCloseTo(bounds.y, 0);
  }
  await showList(page);
  await page.getByRole("searchbox").fill("Second designer");
  await expect(page.getByRole("button", { name: /^Preview beatmap:/ })).toHaveCount(12);
  await page.screenshot({ path: info.outputPath("beatmap-search.png"), fullPage: true });
  await row(page, 2).click();
  await expect(page.getByRole("heading", { name: "Beatmap 02 - Second artist" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Playback position" })).toHaveValue("0");
  await showList(page);
  await expect(page.getByRole("searchbox")).toHaveValue("Second designer");
  await page.getByRole("searchbox").fill("not a fixture");
  await expect(page.getByText("No matching beatmaps.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Beatmap 02 - Second artist" })).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.getByRole("searchbox")).toBeFocused();
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Clear search", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Preview beatmap:/ })).toHaveCount(24);
  if (info.project.use.isMobile) await page.keyboard.press("Escape");
  await page.screenshot({ path: info.outputPath("bundle-split.png"), fullPage: true });
});

test("collapse and picker preserve playback; beatmap changes reset it and coordinate jacket audio", async ({
  page,
}, info) => {
  await setup(page);
  await showList(page);
  await row(page, 1).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next bar", exact: true }).click();
  const seek = page.getByRole("slider", { name: "Playback position" });
  const position = await seek.inputValue();
  expect(Number(position)).toBeGreaterThan(0);
  if (!info.project.use.isMobile) {
    await page.getByRole("button", { name: "Hide beatmap list" }).click();
    await expect(page.getByRole("searchbox")).toHaveCount(0);
    await expect(seek).toHaveValue(position);
  }
  await showList(page);
  await row(page, 2).click();
  await expect(page.getByRole("heading", { name: "Beatmap 02 - Second artist" })).toBeVisible();
  await expect(seek).toHaveValue("0");
  await page.getByRole("button", { name: "Previous beatmap", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Beatmap 01 - First artist" })).toBeVisible();
  if (await page.evaluate(() => typeof AudioContext !== "undefined")) {
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await showList(page);
    await page.getByRole("button", { name: "Play preview: Beatmap 01", exact: true }).click();
    await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
    await expect
      .poll(() =>
        page.locator("audio[hidden]").evaluate((element: HTMLAudioElement) => element.paused),
      )
      .toBe(false);
    await row(page, 2).click();
    await expect
      .poll(() =>
        page.locator("audio[hidden]").evaluate((element: HTMLAudioElement) => element.paused),
      )
      .toBe(true);
  }
  await page.getByRole("button", { name: "Close preview", exact: true }).click();
  await expect(page.locator("canvas")).toHaveCount(0);
  await showList(page);
  await expect(page.getByRole("link", { name: "Video: Beatmap 01", exact: true })).toHaveAttribute(
    "href",
    "https://example.test/video",
  );
});

test("rapid selection ignores obsolete loading and a new revision clears selection", async ({
  page,
}, info) => {
  let finishFirstLoad = () => {};
  const firstLoad = new Promise<void>((resolve) => {
    finishFirstLoad = resolve;
  });
  await setup(page, firstLoad);
  try {
    await showList(page);
    await row(page, 1).click();
    const preview = page.getByRole("region", { name: "Beatmap preview", exact: true });
    await expect(preview.getByRole("status")).toHaveText("Loading beatmap preview");
    await expect(preview.getByRole("heading")).toHaveCount(0);
    await expect(preview.locator('[data-slot="spinner"]')).toBeVisible();
    await page.screenshot({ path: info.outputPath("beatmap-loading.png"), fullPage: true });
    await showList(page);
    await row(page, 2).click();
  } finally {
    finishFirstLoad();
  }
  await expect(page.getByRole("heading", { name: "Beatmap 02 - Second artist" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Beatmap 01 - First artist" })).toHaveCount(0);
  await page.getByRole("button", { name: "Change revision", exact: true }).click();
  await expect(page.locator("canvas")).toHaveCount(0);
  await showList(page);
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page.getByRole("button", { name: /^Preview beatmap:/, pressed: true })).toHaveCount(
    0,
  );
});

const stalledRequests = [
  { stage: "manifest", url: "**/api/bundles/*/files" },
  { stage: "download", url: "**/fixture-1.ugc" },
  { stage: "worker", url: /\/assets\/parser\.worker-[^/]+\.js$/ },
  { stage: "player module", url: /\/assets\/player-[^/]+\.js$/ },
];

for (const { stage, url } of stalledRequests) {
  test(`stalled ${stage} shows a retryable timeout and ignores its late result`, async ({
    page,
  }, info) => {
    await setup(page);
    await page.clock.install();
    const intercepted = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    let blocked = true;
    await page.route(url, async (route) => {
      if (blocked) {
        intercepted.resolve();
        await release.promise;
      }
      await route.fallback();
    });

    try {
      await showList(page);
      await row(page, 1).click();
      await intercepted.promise;
      await expect(page.getByText("Loading beatmap preview", { exact: true })).toBeVisible();
      await page.clock.fastForward(PREVIEW_LOAD_TIMEOUT_MS + 1);
      const error = page.getByText("Loading the beatmap preview took too long. Please retry.");
      await expect(error).toBeVisible();
      await expect(page.locator('[data-slot="spinner"]')).toHaveCount(0);
      if (stage === "worker")
        await page.screenshot({ path: info.outputPath("preview-timeout.png"), fullPage: true });

      blocked = false;
      release.resolve();
      await expect(error).toBeVisible();
      await page.getByRole("button", { name: "Retry", exact: true }).click();
      await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Beatmap 01 - First artist" })).toBeVisible();
    } finally {
      release.resolve();
    }
  });
}

test("compact header retains bundle metadata, tags and download", async ({ page }) => {
  await setup(page);
  await expect(page.getByRole("link", { name: "Download", exact: true })).toHaveAttribute(
    "href",
    new RegExp(`/api/download/bundles/${bundleId}/file$`),
  );
  await page.getByRole("button", { name: "Details", exact: true }).click();
  const details = page.getByRole("dialog");
  await expect(details).toContainText("Authored fixtures for the bundle page integration tests.");
  await expect(details).toContainText("Synthetic");
  await expect(details).toContainText("0 downloads");
  await page.keyboard.press("Escape");
  await expect(details).toHaveCount(0);
});
