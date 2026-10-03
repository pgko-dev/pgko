import { expect, test } from "bun:test";

import { prepareInWorker } from "./worker.js";

class WorkerDouble {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessageerror: (() => void) | null = null;
  terminated = false;
  failPost = false;
  transferred?: unknown[];
  postMessage(_bytes: ArrayBuffer, transfer: unknown[]) {
    if (this.failPost) throw new Error("Transfer failed");
    this.transferred = transfer;
  }
  terminate() {
    this.terminated = true;
  }
}

test("cancelled work ignores stale replies and completed work releases its worker", async () => {
  const signal = new AbortController();
  const worker = new WorkerDouble();
  const bytes = new ArrayBuffer(4);
  const pending = prepareInWorker(bytes, {
    signal: signal.signal,
    createWorker: () => worker as unknown as Worker,
  });
  const rejected = pending.catch((error: unknown) => error);
  const lateReply = worker.onmessage!;
  signal.abort(new Error("Replaced"));
  lateReply({ data: { chart: null, diagnostics: [] } });
  expect(await rejected).toEqual(new Error("Replaced"));
  expect(worker.terminated).toBe(true);
  expect(worker.onmessage).toBeNull();
  expect(worker.transferred).toEqual([bytes]);

  const next = new WorkerDouble();
  const result = prepareInWorker(new ArrayBuffer(0), {
    signal: new AbortController().signal,
    createWorker: () => next as unknown as Worker,
  });
  next.onmessage!({ data: { chart: null, diagnostics: [] } });
  expect(await result).toEqual({ chart: null, diagnostics: [] });
  expect(next.terminated).toBe(true);
});

test("post, runtime and message errors release workers; pre-aborted work creates none", async () => {
  for (const failure of ["post", "runtime", "message"] as const) {
    const worker = new WorkerDouble();
    worker.failPost = failure === "post";
    const result = prepareInWorker(new ArrayBuffer(0), {
      signal: new AbortController().signal,
      createWorker: () => worker as unknown as Worker,
    });
    const rejected = result.catch((error: unknown) => error);
    if (failure === "runtime") worker.onerror!();
    if (failure === "message") worker.onmessageerror!();
    expect(await rejected).toBeInstanceOf(Error);
    expect(worker.terminated).toBe(true);
  }
  let created = false;
  const cancelled = prepareInWorker(new ArrayBuffer(0), {
    signal: AbortSignal.abort(new Error("Already cancelled")),
    createWorker: () => {
      created = true;
      return new WorkerDouble() as unknown as Worker;
    },
  }).catch((error: unknown) => error);
  expect(await cancelled).toEqual(new Error("Already cancelled"));
  expect(created).toBe(false);
});
