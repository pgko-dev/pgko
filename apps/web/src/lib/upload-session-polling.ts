import { isAxiosError } from "axios";
import * as v from "valibot";

import {
  BundleUploadSessionResponseSchema,
  type BundleDetail,
  type BundleUploadSessionResponse,
} from "@pgko.dev/schema";

import { apiClient } from "./api";

const INITIAL_POLL_INTERVAL_MS = 2000;
const STEADY_POLL_INTERVAL_MS = 5000;
const INITIAL_POLL_DURATION_MS = 10000;
const MAX_RETRY_DELAY_MS = 30000;
const MAX_CONSECUTIVE_FAILURES = 5;
const STATUS_REQUEST_TIMEOUT_MS = 15000;

export function waitForUploadPoll(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();

    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(signal?.reason);
    };
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function retryDelay(error: unknown, failures: number, now: number): number | null {
  if (!isAxiosError(error) || error.code === "ERR_CANCELED") {
    return null;
  }

  const status = error.response?.status;
  if (status !== undefined && status !== 408 && status !== 429 && status < 500) {
    return null;
  }

  const backoff = Math.min(MAX_RETRY_DELAY_MS, INITIAL_POLL_INTERVAL_MS * 2 ** (failures - 1));
  const retryAfter = error.response?.headers["retry-after"];
  if (typeof retryAfter !== "string" && typeof retryAfter !== "number") {
    return backoff;
  }

  const seconds = Number(retryAfter);
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(String(retryAfter)) - now;
  return Number.isFinite(delay) ? Math.max(backoff, delay) : backoff;
}

interface PollDependencies {
  load: (sessionId: string, signal?: AbortSignal) => Promise<BundleUploadSessionResponse>;
  wait: typeof waitForUploadPoll;
  now: () => number;
}

const pollingDependencies: PollDependencies = {
  async load(sessionId, signal) {
    const response = await apiClient.get(`/api/bundles/upload-sessions/${sessionId}`, {
      signal,
      timeout: STATUS_REQUEST_TIMEOUT_MS,
    });
    return v.parse(BundleUploadSessionResponseSchema, response.data);
  },
  wait: waitForUploadPoll,
  now: Date.now,
};

function completedUploadBundle(session: BundleUploadSessionResponse): BundleDetail | undefined {
  if (session.status === "failed") {
    throw new Error(session.errorKey ?? "api.error.upload.error.processingFailed");
  }
  if (session.status === "canceled") {
    throw new Error("api.error.upload.error.uploadCanceled");
  }

  return session.status === "completed" ? (session.bundle ?? undefined) : undefined;
}

export async function pollUploadSession(
  sessionId: string,
  signal?: AbortSignal,
  dependencies: PollDependencies = pollingDependencies,
): Promise<BundleDetail> {
  const startedAt = dependencies.now();
  let failures = 0;
  let nextPollDelay = 0;

  for (;;) {
    signal?.throwIfAborted();
    if (nextPollDelay > 0) {
      await dependencies.wait(nextPollDelay, signal);
    }

    let session: BundleUploadSessionResponse;
    try {
      session = await dependencies.load(sessionId, signal);
      failures = 0;
    } catch (error) {
      signal?.throwIfAborted();
      const delay = retryDelay(error, ++failures, dependencies.now());
      if (delay === null || failures > MAX_CONSECUTIVE_FAILURES) {
        throw error;
      }
      nextPollDelay = delay;
      continue;
    }

    const bundle = completedUploadBundle(session);
    if (bundle) {
      return bundle;
    }

    const elapsed = dependencies.now() - startedAt;
    nextPollDelay =
      elapsed < INITIAL_POLL_DURATION_MS ? INITIAL_POLL_INTERVAL_MS : STEADY_POLL_INTERVAL_MS;
  }
}
