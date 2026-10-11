import { afterEach, expect, test } from "bun:test";

import { prepareBufferedMusic } from "./buffered-music.js";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

class Media extends EventTarget {
  readyState = 4;
  duration = 10;
  src = "https://example.test/music";
}

const pcm = { duration: 10, length: 480000, numberOfChannels: 2 } as AudioBuffer;

function prepare(
  media = new Media(),
  decode = async () => pcm,
  renew = async () => false,
  signal = new AbortController().signal,
) {
  return prepareBufferedMusic(
    media as unknown as HTMLAudioElement,
    { sampleRate: 48000, decodeAudioData: decode } as unknown as AudioContext,
    signal,
    renew,
  );
}

test("download errors renew a signed URL once before decoding", async () => {
  const media = new Media();
  const urls: string[] = [];
  globalThis.fetch = (async (url: Parameters<typeof fetch>[0]) => {
    urls.push(url instanceof Request ? url.url : typeof url === "string" ? url : url.href);
    return new Response("audio", { status: urls.length === 1 ? 403 : 200 });
  }) as unknown as typeof fetch;
  let renewals = 0;
  const result = await prepare(
    media,
    async () => pcm,
    async () => {
      renewals++;
      media.src = "https://example.test/renewed";
      return true;
    },
  );
  expect(result.buffer).toBe(pcm);
  expect(renewals).toBe(1);
  expect(urls).toEqual(["https://example.test/music", "https://example.test/renewed"]);
});

test("bounded downloads reject both declared and streamed oversized responses", async () => {
  for (const declared of [true, false]) {
    globalThis.fetch = (async () =>
      new Response(new Uint8Array(16 * 1024 * 1024 + 1), {
        headers: declared ? { "Content-Length": String(16 * 1024 * 1024 + 1) } : {},
      })) as unknown as typeof fetch;
    let decoded = false;
    expect(
      await prepare(new Media(), async () => {
        decoded = true;
        return pcm;
      }),
    ).toEqual({ fallbackReason: "size" });
    expect(decoded).toBe(false);
  }
});

test("native decode failure and oversized PCM fall back without retaining a buffer", async () => {
  globalThis.fetch = (async () => new Response("audio")) as unknown as typeof fetch;
  expect(
    await prepare(new Media(), async () => {
      throw new Error("Unsupported codec");
    }),
  ).toEqual({ fallbackReason: "decode" });
  expect(
    await prepare(
      new Media(),
      async () =>
        ({ duration: pcm.duration, length: pcm.length, numberOfChannels: 100 }) as AudioBuffer,
    ),
  ).toEqual({
    fallbackReason: "size",
  });
});

test("unknown duration avoids decoding and disposal interrupts metadata preparation", async () => {
  const media = new Media();
  media.duration = Infinity;
  expect(await prepare(media)).toEqual({ fallbackReason: "duration" });
  media.readyState = 0;
  const controller = new AbortController();
  const pending = prepare(
    media,
    async () => pcm,
    async () => false,
    controller.signal,
  );
  controller.abort(new Error("Closed"));
  await expect(pending).rejects.toThrow("Closed");
});

test("a native decode that finishes after disposal cannot publish its PCM", async () => {
  globalThis.fetch = (async () => new Response("audio")) as unknown as typeof fetch;
  const started = Promise.withResolvers<void>();
  const decoded = Promise.withResolvers<AudioBuffer>();
  const controller = new AbortController();
  const pending = prepare(
    new Media(),
    () => {
      started.resolve();
      return decoded.promise;
    },
    async () => false,
    controller.signal,
  );
  await started.promise;
  controller.abort(new Error("Replaced"));
  await expect(pending).rejects.toThrow("Replaced");
  decoded.resolve(pcm);
});

test("metadata preparation timeout selects streaming instead of waiting indefinitely", async () => {
  const media = new Media();
  media.readyState = 0;
  const result = await prepareBufferedMusic(
    media as unknown as HTMLAudioElement,
    { sampleRate: 48000 } as AudioContext,
    new AbortController().signal,
    async () => false,
    5,
  );
  expect(result).toEqual({ fallbackReason: "timeout" });
});
