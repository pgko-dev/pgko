import type { PreparedChart } from "./prepare.js";

export type WorkerOptions = {
  /** Create a dedicated worker whose message handler calls prepareChart. */
  createWorker: () => Worker;
  signal: AbortSignal;
};

/** Transfers (detaches) bytes. Terminates the owned worker on every completion path. */
export function prepareInWorker(
  bytes: ArrayBuffer,
  options: WorkerOptions,
): Promise<PreparedChart> {
  return new Promise((resolve, reject) => {
    const { signal } = options;
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }

    const worker = options.createWorker();
    let settled = false;

    const finish = (error?: unknown, result?: PreparedChart) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", abort);
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();

      if (result) resolve(result);
      else reject(error);
    };
    const abort = () => finish(signal.reason);

    signal.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event: MessageEvent<PreparedChart>) => finish(undefined, event.data);
    worker.onerror = () => finish(new Error("Preview worker failed."));
    worker.onmessageerror = () => finish(new Error("Invalid preview worker message."));

    try {
      signal.throwIfAborted();
      worker.postMessage(bytes, [bytes]);
    } catch (error) {
      finish(error);
    }
  });
}
