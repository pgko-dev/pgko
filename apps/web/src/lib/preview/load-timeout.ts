export const PREVIEW_LOAD_TIMEOUT_MS = 30_000;

/** Bound the whole attempt, including operations that fail to react to cancellation. */
export async function loadWithTimeout<T>(
  signal: AbortSignal,
  load: (signal: AbortSignal) => Promise<T>,
  timeoutMs = PREVIEW_LOAD_TIMEOUT_MS,
): Promise<T> {
  signal.throwIfAborted();
  const controller = new AbortController();
  const cancelled = Promise.withResolvers<never>();
  const cancel = (reason: unknown) => {
    cancelled.reject(reason);
    controller.abort(reason);
  };
  const onAbort = () => cancel(signal.reason);
  signal.addEventListener("abort", onAbort, { once: true });

  const timer = setTimeout(
    () => cancel(new DOMException("Beatmap preview loading timed out.", "TimeoutError")),
    timeoutMs,
  );

  try {
    const pending = Promise.resolve().then(() => {
      controller.signal.throwIfAborted();
      return load(controller.signal);
    });
    return await Promise.race([pending, cancelled.promise]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
    // Also stop sibling work if one operation in the attempt failed.
    controller.abort();
  }
}
