/** A native resume/decode promise may never settle, even after its fetch is canceled. */
export async function audioReady<T>(
  pending: Promise<T>,
  signal: AbortSignal,
  timeoutMs = 30_000,
): Promise<T> {
  signal.throwIfAborted();
  const cancelled = Promise.withResolvers<never>();
  const abort = () => cancelled.reject(signal.reason);
  const timer = setTimeout(
    () => cancelled.reject(new DOMException("Audio preparation timed out.", "TimeoutError")),
    timeoutMs,
  );
  signal.addEventListener("abort", abort, { once: true });
  try {
    return await Promise.race([pending, cancelled.promise]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
