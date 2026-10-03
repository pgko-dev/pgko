import { expect, test } from "bun:test";

import { AxiosError } from "axios";

import { retryUploadRequest } from "../upload-request";

test("upload control retries stop on abort, terminal errors and exhausted attempts", async () => {
  let attempts = 0;
  const networkFailure = () => {
    attempts++;
    return Promise.reject(new AxiosError("network", "ERR_NETWORK"));
  };
  await expect(retryUploadRequest(networkFailure)).rejects.toThrow("network");
  expect(attempts).toBe(3);
  attempts = 0;
  await expect(retryUploadRequest(networkFailure, AbortSignal.abort())).rejects.toMatchObject({
    name: "AbortError",
  });
  expect(attempts).toBe(0);
  await expect(
    retryUploadRequest(() => {
      attempts++;
      return Promise.reject(new Error("terminal"));
    }),
  ).rejects.toThrow("terminal");
  expect(attempts).toBe(1);
});
