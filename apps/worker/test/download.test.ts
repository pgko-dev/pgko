import { afterEach, expect, mock, spyOn, test } from "bun:test";

import download from "../src/download";

const env = {
  API_HOST: "api.example.com",
  DOWNLOAD_ORIGIN: "https://download.example.com",
  CDN_ORIGIN: "https://cdn.example.com",
  S3_ORIGIN: "https://bucket.example.com",
  S3_BUCKET: "bundles",
};

const path = "/bundles/019caff4-8d7e-7000-bac0-f1c744ba2ff9.zip";
const query = "X-Amz-Expires=3600&X-Amz-Signature=test%2Bsignature";
const source = new URL(`/bundles${path}?${query}`, env.S3_ORIGIN);
const target = new URL(path, env.DOWNLOAD_ORIGIN);
target.searchParams.set("source", query);

afterEach(() => mock.restore());

test("preserves the existing redirect and moves its signed query to the download host", async () => {
  spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(null, {
      status: 302,
      headers: { Location: source.href, "Cache-Control": "private, no-store" },
    }),
  );
  const request = new Request(`https://${env.API_HOST}/api/download${path.slice(0, -4)}/file`);
  const response = await download.fetch(request, env);

  expect(response.status).toBe(302);
  expect(response.headers.get("Location")).toBe(target.href);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});

test("never tries the CDN when R2 rejects the signed URL", async () => {
  const fetcher = spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 403 }));
  const response = await download.fetch(new Request(target), env);

  expect(response.status).toBe(403);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]?.[0]).toEqual(source);
});

test("serves the requested bytes from the CDN using a versioned key with no signed query", async () => {
  const fetcher = spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response("a", { status: 206, headers: { ETag: '"v1"' } }))
    .mockResolvedValueOnce(
      new Response("b", {
        status: 206,
        headers: { ETag: '"v1"', "Content-Range": "bytes 1-1/3", "CF-Cache-Status": "HIT" },
      }),
    );
  const request = new Request(target, { headers: { Range: "bytes=1-1" } });
  const response = await download.fetch(request, env);

  expect(response.status).toBe(206);
  expect(response.headers.get("Content-Range")).toBe("bytes 1-1/3");
  expect(response.headers.get("X-PGKO-Cache-Status")).toBe("HIT");
  expect(await response.text()).toBe("b");
  expect(fetcher.mock.calls[1]?.[0]).toEqual(
    new URL(`${path}?download-version=%22v1%22`, env.CDN_ORIGIN),
  );
  expect(new Headers(fetcher.mock.calls[1]?.[1]?.headers).get("Range")).toBe("bytes=1-1");
});

test("falls back to R2 if the CDN has a different version", async () => {
  const fetcher = spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response("a", { status: 206, headers: { ETag: '"v1"' } }))
    .mockResolvedValueOnce(new Response("old", { headers: { ETag: '"v0"' } }))
    .mockResolvedValueOnce(new Response("new"));
  const response = await download.fetch(new Request(target), env);

  expect(await response.text()).toBe("new");
  expect(fetcher.mock.calls[2]?.[0]).toEqual(source);
});
