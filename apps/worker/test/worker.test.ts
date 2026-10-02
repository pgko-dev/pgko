import { afterAll, afterEach, describe, expect, spyOn, test } from "bun:test";

import worker from "../src";
import { matchSeoRequest } from "../src/seo/match";

const env = { API_ORIGIN: "https://api.pgko.dev" } as Env;
const context = {} as ExecutionContext;
const fetchSpy = spyOn(globalThis, "fetch");

afterEach(() => {
  fetchSpy.mockReset();
});

afterAll(() => {
  fetchSpy.mockRestore();
});

function crawlerRequest(path: string): Request {
  return new Request(`https://pgko.dev${path}`, {
    headers: { "User-Agent": "Discordbot" },
  });
}

describe("crawler routing", () => {
  test.each([
    "/bundles/upload",
    "/users/me",
    "/bundles/%ZZ",
    "/users/%ZZ",
    "/bundles/",
    "/users/",
    "/about",
  ])("does not intercept %s", (path) => {
    const request = crawlerRequest(path);

    expect(matchSeoRequest(request, new URL(request.url))).toBeNull();
  });

  test("decodes identifiers and preserves the canonical URL", () => {
    const request = crawlerRequest("/users/name%20with%20spaces/profile");

    expect(matchSeoRequest(request, new URL(request.url))).toEqual({
      type: "user",
      jointId: "name with spaces",
      canonicalUrl: "https://pgko.dev/users/name%20with%20spaces",
    });
  });

  test("leaves normal browser requests alone", () => {
    const request = new Request("https://pgko.dev/bundles/example", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    expect(matchSeoRequest(request, new URL(request.url))).toBeNull();
  });
});

describe("request handling", () => {
  test.each([
    ["/bundles/example?lang=ja", "https://api.pgko.dev/api/og/bundles/example?lang=ja"],
    ["/users/name%20here?lang=en", "https://api.pgko.dev/api/og/users/name%20here?lang=en"],
  ])("fetches preview HTML for %s", async (path, expectedUrl) => {
    fetchSpy.mockResolvedValue(
      new Response("<html>preview</html>", {
        status: 203,
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "public, max-age=60",
        },
      }),
    );

    const response = await worker.fetch(crawlerRequest(path), env, context);

    expect(fetchSpy).toHaveBeenCalledWith(expectedUrl, {
      headers: { Accept: "text/html" },
    });
    expect(response.status).toBe(203);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect(await response.text()).toBe("<html>preview</html>");
  });

  test("forwards the original browser request unchanged", async () => {
    const request = new Request("https://pgko.dev/bundles/example?lang=ko");
    const upstream = new Response("application");

    fetchSpy.mockResolvedValue(upstream);

    expect(await worker.fetch(request, env, context)).toBe(upstream);
    expect(fetchSpy).toHaveBeenCalledWith(request);
  });

  test("passes through when API_ORIGIN is empty", async () => {
    const request = crawlerRequest("/bundles/example");
    const upstream = new Response("application");

    fetchSpy.mockResolvedValue(upstream);

    expect(await worker.fetch(request, { API_ORIGIN: "" } as Env, context)).toBe(upstream);
    expect(fetchSpy).toHaveBeenCalledWith(request);
  });

  test("preserves failure behavior for unavailable previews", async () => {
    fetchSpy.mockResolvedValue(new Response("unavailable", { status: 503 }));

    await expect(worker.fetch(crawlerRequest("/bundles/example"), env, context)).rejects.toThrow(
      "Unexpected API response: 503",
    );
  });
});
