import { expect, test } from "bun:test";

import { audioReady } from "./audio-ready.js";

test("a stuck native audio promise times out and a disposed player cancels promptly", async () => {
  const controller = new AbortController();
  const stuck = new Promise<void>(() => {});
  await expect(audioReady(stuck, controller.signal, 5)).rejects.toMatchObject({
    name: "TimeoutError",
  });
  const pending = audioReady(stuck, controller.signal);
  controller.abort(new Error("Closed"));
  await expect(pending).rejects.toThrow("Closed");
  expect(await audioReady(Promise.resolve(42), new AbortController().signal)).toBe(42);
});
