/// <reference types="bun" />

import { describe, expect, it, spyOn } from "bun:test";

import { apiClient } from "../api";
import {
  calculateMultipartProgress,
  getMultipartPartBounds,
  isRetryablePartStatus,
  uploadMultipartBundle,
} from "../multipart-bundle-upload";
import * as polling from "../upload-session-polling";

describe("multipart bundle upload", () => {
  it("keeps an accepted processing job when status polling fails", async () => {
    const sessionId = "019da941-2c3f-7000-a73d-2f24ed4fb06d";
    const originalXhr = globalThis.XMLHttpRequest;
    class SuccessfulUpload extends EventTarget {
      upload = new EventTarget();
      status = 200;
      open() {}
      setRequestHeader() {}
      getResponseHeader() {
        return '"test-etag"';
      }
      abort() {}
      send() {
        this.dispatchEvent(new Event("load"));
      }
    }
    globalThis.XMLHttpRequest = SuccessfulUpload as unknown as typeof XMLHttpRequest;
    const post = spyOn(apiClient, "post")
      .mockResolvedValueOnce({
        data: {
          sessionId,
          expiresAt: new Date(),
          partSize: 1024,
          parts: [{ partNumber: 1, url: "https://storage.example.test/part" }],
        },
      })
      .mockResolvedValueOnce({ data: { sessionId, status: "queued" } });
    const cancel = spyOn(apiClient, "delete").mockResolvedValue({});
    const poll = spyOn(polling, "pollUploadSession").mockRejectedValue(
      new Error("network unavailable"),
    );
    try {
      // oxlint-disable-next-line typescript/await-thenable -- Bun async matchers return promises despite their void types.
      await expect(
        uploadMultipartBundle({
          file: new File(["archive"], "bundle.zip"),
          kind: "upload",
        }),
      ).rejects.toThrow("network unavailable");
      expect(post).toHaveBeenCalledTimes(2);
      expect(cancel).not.toHaveBeenCalled();
    } finally {
      poll.mockRestore();
      cancel.mockRestore();
      post.mockRestore();
      globalThis.XMLHttpRequest = originalXhr;
    }
  });
  it("does not create a session when the upload is already canceled", async () => {
    const post = spyOn(apiClient, "post").mockRejectedValue(new Error("unexpected request"));
    try {
      // oxlint-disable-next-line typescript/await-thenable -- Bun async matchers return promises despite their void types.
      await expect(
        uploadMultipartBundle({
          file: new File(["archive"], "bundle.zip"),
          kind: "upload",
          signal: AbortSignal.abort(),
        }),
      ).rejects.toMatchObject({ name: "AbortError" });
      expect(post).not.toHaveBeenCalled();
    } finally {
      post.mockRestore();
    }
  });

  it("uses exact chunk boundaries and a smaller final part", () => {
    const partSize = 10 * 1024 * 1024;
    const fileSize = partSize * 2 + 123;
    expect(getMultipartPartBounds(fileSize, partSize, 1)).toEqual({ start: 0, end: partSize });
    expect(getMultipartPartBounds(fileSize, partSize, 2)).toEqual({
      start: partSize,
      end: partSize * 2,
    });
    expect(getMultipartPartBounds(fileSize, partSize, 3)).toEqual({
      start: partSize * 2,
      end: fileSize,
    });
  });

  it("classifies only transient HTTP failures for retry", () => {
    for (const status of [0, 408, 429, 500, 503]) expect(isRetryablePartStatus(status)).toBeTrue();
    for (const status of [400, 401, 403, 404, 409]) {
      expect(isRetryablePartStatus(status)).toBeFalse();
    }
  });

  it("keeps aggregate progress monotonic and below processing", () => {
    expect(calculateMultipartProgress(50, 100, 0)).toBe(49);
    expect(calculateMultipartProgress(25, 100, 49)).toBe(49);
    expect(calculateMultipartProgress(100, 100, 49)).toBe(99);
  });
});
