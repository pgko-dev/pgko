import axios from "axios";

import { waitForUploadPoll } from "./upload-session-polling";

function retryDelay(error: unknown, attempt: number): number {
  if (!axios.isAxiosError(error)) throw error;

  const status = error.response?.status;
  const retryable = status === undefined || status === 408 || status === 429 || status >= 500;
  if (!retryable || attempt >= 2) throw error;

  const retryAfter = Number(error.response?.headers["retry-after"]);
  const delay =
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
  return Math.min(delay, 30_000);
}

export async function retryUploadRequest<Result>(
  request: () => Promise<Result>,
  signal?: AbortSignal,
): Promise<Result> {
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    try {
      return await request();
    } catch (error) {
      await waitForUploadPoll(retryDelay(error, attempt), signal);
    }
  }
}
