import { prepareInWorker } from "@pgko.dev/ugc-render/worker";

export function parseInWorker(bytes: ArrayBuffer, signal: AbortSignal) {
  return prepareInWorker(bytes, {
    signal,
    createWorker: () =>
      new Worker(new URL("./parser.worker.ts", import.meta.url), { type: "module" }),
  });
}
