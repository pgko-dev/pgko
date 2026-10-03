import { expect, test } from "bun:test";

import { AxiosError, AxiosHeaders } from "axios";

import type { BundleDetail, BundleUploadSessionResponse } from "@pgko.dev/schema";

import { pollUploadSession, waitForUploadPoll } from "../upload-session-polling";

const bundle = { id: "completed-bundle" } as BundleDetail;
const processing = { status: "processing" } as BundleUploadSessionResponse;
const completed = { status: "completed", bundle } as BundleUploadSessionResponse;

function httpError(status: number, retryAfter?: string): AxiosError {
  return new AxiosError("temporarily unavailable", undefined, undefined, undefined, {
    status,
    statusText: "error",
    data: null,
    config: { headers: new AxiosHeaders() },
    headers: retryAfter ? { "retry-after": retryAfter } : {},
  });
}

test("polling slows from two seconds to five seconds while processing continues", async () => {
  let now = 0;
  let reads = 0;
  const delays: number[] = [];
  const result = await pollUploadSession("session", undefined, {
    load: async () => (++reads <= 6 ? processing : completed),
    now: () => now,
    wait: async (delay) => {
      delays.push(delay);
      now += delay;
    },
  });
  expect(result).toBe(bundle);
  expect(delays).toEqual([2000, 2000, 2000, 2000, 2000, 5000]);
});

test("polling honors Retry-After seconds and dates, then resets error backoff after recovery", async () => {
  let now = Date.UTC(2026, 9, 2);
  const outcomes = [
    httpError(429, "7"),
    httpError(503, new Date(now + 17000).toUTCString()),
    processing,
    httpError(502),
    completed,
  ];
  const delays: number[] = [];
  const result = await pollUploadSession("session", undefined, {
    load: async () => {
      const outcome = outcomes.shift()!;
      if (outcome instanceof Error) {
        throw outcome;
      }
      return outcome;
    },
    now: () => now,
    wait: async (delay) => {
      delays.push(delay);
      now += delay;
    },
  });
  expect(result).toBe(bundle);
  expect(delays).toEqual([7000, 10000, 5000, 2000]);
});

test("permanent errors stop immediately and repeated transient errors have a finite retry budget", async () => {
  let reads = 0;
  let waits = 0;
  const dependencies = {
    load: async () => {
      reads++;
      throw httpError(404);
    },
    now: () => 0,
    wait: async () => {
      waits++;
    },
  };
  await expect(pollUploadSession("session", undefined, dependencies)).rejects.toMatchObject({
    response: { status: 404 },
  });
  expect(reads).toBe(1);
  expect(waits).toBe(0);

  reads = 0;
  dependencies.load = async () => {
    reads++;
    throw httpError(503);
  };
  await expect(pollUploadSession("session", undefined, dependencies)).rejects.toMatchObject({
    response: { status: 503 },
  });
  expect(reads).toBe(6);
  expect(waits).toBe(5);
});

test("canceling during a poll delay stops promptly without another status request", async () => {
  const controller = new AbortController();
  let reads = 0;
  const startedWaiting = Promise.withResolvers<void>();
  const result = pollUploadSession("session", controller.signal, {
    load: async () => {
      reads++;
      return processing;
    },
    now: () => 0,
    wait: (delay, signal) => {
      startedWaiting.resolve();
      return waitForUploadPoll(delay, signal);
    },
  });
  const rejected = result.catch((error: unknown) => error);
  await startedWaiting.promise;
  controller.abort();
  expect(await rejected).toMatchObject({ name: "AbortError" });
  expect(reads).toBe(1);
});
