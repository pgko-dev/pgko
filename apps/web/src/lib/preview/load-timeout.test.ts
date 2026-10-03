import { expect, test } from "bun:test";

import { loadWithTimeout } from "./load-timeout";

test("an unresponsive load times out, cancels its work and allows a fresh attempt", async () => {
  const parent = new AbortController();
  const stalled = Promise.withResolvers<string>();
  let requestSignal: AbortSignal | undefined;
  const result = loadWithTimeout(
    parent.signal,
    (signal) => {
      requestSignal = signal;
      return stalled.promise;
    },
    10,
  );

  await expect(result).rejects.toMatchObject({ name: "TimeoutError" });
  expect(requestSignal?.aborted).toBe(true);
  expect(parent.signal.aborted).toBe(false);

  const retried = loadWithTimeout(parent.signal, async () => "new beatmap");
  stalled.resolve("obsolete beatmap");
  expect(await retried).toBe("new beatmap");
  await expect(result).rejects.toMatchObject({ name: "TimeoutError" });
});

test("closing an attempt rejects promptly even when its work ignores abort", async () => {
  const parent = new AbortController();
  const started = Promise.withResolvers<AbortSignal>();
  const stalled = Promise.withResolvers<never>();
  const result = loadWithTimeout(parent.signal, (signal) => {
    started.resolve(signal);
    return stalled.promise;
  });
  const rejected = result.catch((error: unknown) => error);
  const requestSignal = await started.promise;
  const reason = new Error("Replaced beatmap");
  parent.abort(reason);

  expect(await rejected).toBe(reason);
  expect(requestSignal.aborted).toBe(true);
  stalled.reject(new Error("Late failure"));
});

test("early failures cancel sibling work and preserve the original error", async () => {
  let requestSignal: AbortSignal | undefined;
  const reason = new Error("Player module failed");
  const result = loadWithTimeout(new AbortController().signal, (signal) => {
    requestSignal = signal;
    throw reason;
  });

  await expect(result).rejects.toBe(reason);
  expect(requestSignal?.aborted).toBe(true);
});

test("completed results stay settled and pre-aborted attempts do not start work", async () => {
  const parent = new AbortController();
  const result = loadWithTimeout(parent.signal, async () => "ready", 10);
  expect(await result).toBe("ready");
  parent.abort(new Error("Closed"));
  expect(await result).toBe("ready");

  let called = false;
  const cancelled = loadWithTimeout(parent.signal, async () => {
    called = true;
  });
  await expect(cancelled).rejects.toBe(parent.signal.reason);
  expect(called).toBe(false);
});
