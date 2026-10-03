import axios from "axios";

import { waitForUploadPoll } from "./upload-session-polling";

export async function retryUploadRequest<Result>(
  request: () => Promise<Result>,
  signal?: AbortSignal,
): Promise<Result> {
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    try {
      return await request();
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const retryable =
        axios.isAxiosError(error) &&
        (status === undefined || status === 408 || status === 429 || status >= 500);
      if (!retryable || attempt >= 2) throw error;
      const retryAfter = axios.isAxiosError(error)
        ? Number(error.response?.headers["retry-after"])
        : NaN;
      const delay =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
      await waitForUploadPoll(Math.min(delay, 30_000), signal);
    }
  }
}
