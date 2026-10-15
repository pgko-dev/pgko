const MAX_SECONDS = 300;
const MAX_DOWNLOAD_BYTES = 16 * 1024 * 1024;
const MAX_DECODED_BYTES = 128 * 1024 * 1024;
const PREPARATION_TIMEOUT_MS = 30_000;

export type MusicFallbackReason = "duration" | "size" | "decode" | "network" | "timeout" | "rate";
export type BufferedMusic = { buffer?: AudioBuffer; fallbackReason?: MusicFallbackReason };

async function metadata(media: HTMLAudioElement, signal: AbortSignal) {
  if (media.readyState >= 1) return;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      media.removeEventListener("loadedmetadata", loaded);
      media.removeEventListener("error", failed);
      signal.removeEventListener("abort", aborted);
    };
    const loaded = () => {
      cleanup();
      resolve();
    };
    const failed = () => {
      cleanup();
      reject(new Error("Music metadata unavailable."));
    };
    const aborted = () => {
      cleanup();
      reject(signal.reason);
    };
    media.addEventListener("loadedmetadata", loaded);
    media.addEventListener("error", failed);
    signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) aborted();
    else if (media.error) failed();
  });
}

async function download(url: string, signal: AbortSignal): Promise<ArrayBuffer | undefined> {
  const response = await fetch(url, { signal, credentials: "omit" });
  if (!response.ok) throw new Error("Music download failed.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Music response has no body.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    if (Number(response.headers.get("Content-Length")) > MAX_DOWNLOAD_BYTES) return;
    while (true) {
      signal.throwIfAborted();
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > MAX_DOWNLOAD_BYTES) return;
      chunks.push(next.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes.buffer;
}

async function downloadMusic(
  media: HTMLAudioElement,
  sampleRate: number,
  signal: AbortSignal,
): Promise<ArrayBuffer | "duration" | "size"> {
  await metadata(media, signal);
  const duration = media.duration;
  if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_SECONDS) {
    return "duration";
  }
  if (duration * sampleRate * 2 * 4 > MAX_DECODED_BYTES) {
    return "size";
  }
  return (await download(media.src, signal)) ?? "size";
}

/** Limit retained PCM and downloads; native decoding can allocate additional temporary memory. */
export async function prepareBufferedMusic(
  media: HTMLAudioElement,
  context: AudioContext,
  signal: AbortSignal,
  renew: () => Promise<boolean>,
  timeoutMs = PREPARATION_TIMEOUT_MS,
): Promise<BufferedMusic> {
  const controller = new AbortController();
  const cancelled = Promise.withResolvers<never>();
  const abort = () => {
    controller.abort(signal.reason);
    cancelled.reject(signal.reason);
  };
  signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => {
    const error = new DOMException("Music preparation timed out.", "TimeoutError");
    controller.abort(error);
    cancelled.reject(error);
  }, timeoutMs);

  const load = async (): Promise<BufferedMusic> => {
    controller.signal.throwIfAborted();
    let bytes: Awaited<ReturnType<typeof downloadMusic>>;
    try {
      bytes = await downloadMusic(media, context.sampleRate, controller.signal);
    } catch (error) {
      controller.signal.throwIfAborted();
      if (!(await renew())) throw error;
      bytes = await downloadMusic(media, context.sampleRate, controller.signal);
    }
    if (typeof bytes === "string") return { fallbackReason: bytes };
    let buffer: AudioBuffer;
    try {
      buffer = await context.decodeAudioData(bytes);
    } catch {
      return { fallbackReason: "decode" };
    }
    controller.signal.throwIfAborted();
    if (
      buffer.duration > MAX_SECONDS ||
      buffer.length * buffer.numberOfChannels * 4 > MAX_DECODED_BYTES
    ) {
      return { fallbackReason: "size" };
    }
    return { buffer };
  };

  try {
    if (signal.aborted) abort();
    return await Promise.race([load(), cancelled.promise]);
  } catch (error) {
    signal.throwIfAborted();
    return {
      fallbackReason:
        error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "network",
    };
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
    controller.abort();
  }
}
