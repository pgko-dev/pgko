import * as v from "valibot";

import {
  BundleUploadSessionResponseSchema,
  CreateBundleUploadSessionResponseSchema,
  type BundleDetail,
  type BundleUploadSessionKind,
} from "@pgko.dev/schema";

import { apiClient } from "@/lib/api";

import { retryUploadRequest } from "./upload-request";
import { pollUploadSession } from "./upload-session-polling";

const CONCURRENCY = 3;
const MAX_RETRIES = 5;

export type MultipartUploadPhase = "uploading" | "processing";

export type MultipartBundleUploadOptions = {
  file: File;
  kind: BundleUploadSessionKind;
  currentBundleId?: string;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
  onPhaseChange?: (phase: MultipartUploadPhase) => void;
};

class PartUploadError extends Error {
  retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "PartUploadError";
    this.retryable = retryable;
  }
}

export function getMultipartPartBounds(fileSize: number, partSize: number, partNumber: number) {
  const start = (partNumber - 1) * partSize;
  return { start, end: Math.min(start + partSize, fileSize) };
}

export function isRetryablePartStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

export function calculateMultipartProgress(
  loadedBytes: number,
  totalBytes: number,
  previousProgress: number,
): number {
  const current = Math.min(99, Math.floor((loadedBytes / totalBytes) * 99));
  return Math.max(previousProgress, current);
}

function abortError() {
  return new DOMException("Upload canceled", "AbortError");
}

function waitWithJitter(attempt: number, signal?: AbortSignal) {
  const base = Math.min(8000, 400 * 2 ** attempt);
  // Jitter spreads retries; this random value is not used for credentials or identifiers.
  const delay = Math.round(base * (0.75 + Math.random() * 0.5));
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(abortError());
    };
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delay);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function uploadPartRequest(
  url: string,
  part: Blob,
  signal: AbortSignal | undefined,
  onProgress: (loaded: number) => void,
) {
  return new Promise<string>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", "application/zip");
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    });
    xhr.addEventListener("load", () => {
      signal?.removeEventListener("abort", onAbort);
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(
          new PartUploadError(
            `Part upload failed with status ${xhr.status}`,
            isRetryablePartStatus(xhr.status),
          ),
        );
        return;
      }
      const etag = xhr.getResponseHeader("ETag");
      if (!etag) {
        reject(new PartUploadError("Part upload response did not include an ETag", false));
        return;
      }
      onProgress(part.size);
      resolve(etag);
    });
    xhr.addEventListener("error", () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new PartUploadError("Part upload failed due to a network error", true));
    });
    xhr.addEventListener("abort", () => {
      signal?.removeEventListener("abort", onAbort);
      reject(abortError());
    });
    signal?.addEventListener("abort", onAbort, { once: true });
    xhr.send(part);
  });
}

async function uploadPartWithRetry(
  url: string,
  part: Blob,
  signal: AbortSignal | undefined,
  onProgress: (loaded: number) => void,
) {
  // Each retry must wait for the previous request and its backoff before sending again.
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await uploadPartRequest(url, part, signal, onProgress);
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
        throw error;
      }
      if (!(error instanceof PartUploadError) || !error.retryable || attempt === MAX_RETRIES) {
        throw error;
      }
      onProgress(0);
      await waitWithJitter(attempt, signal);
    }
  }
  throw new PartUploadError("Part upload retry limit reached", false);
}

async function uploadAllParts(
  file: File,
  partSize: number,
  parts: { partNumber: number; url: string }[],
  signal: AbortSignal | undefined,
  onProgress?: (progress: number) => void,
) {
  const loadedByPart = Array.from({ length: parts.length }, () => 0);
  let nextPartIndex = 0;
  let displayedProgress = 0;
  const completed: { partNumber: number; etag: string }[] = [];

  const reportProgress = (partIndex: number, loaded: number) => {
    loadedByPart[partIndex] = loaded;
    const loadedTotal = loadedByPart.reduce((total, value) => total + value, 0);
    displayedProgress = calculateMultipartProgress(loadedTotal, file.size, displayedProgress);
    onProgress?.(displayedProgress);
  };

  const worker = async () => {
    // Sequential requests within each worker keep total concurrent transfers bounded.
    while (nextPartIndex < parts.length) {
      const partIndex = nextPartIndex++;
      const partInfo = parts[partIndex]!;
      const { start, end } = getMultipartPartBounds(file.size, partSize, partInfo.partNumber);
      const blob = file.slice(start, end, "application/zip");
      const etag = await uploadPartWithRetry(partInfo.url, blob, signal, (loaded) =>
        reportProgress(partIndex, loaded),
      );
      completed.push({ partNumber: partInfo.partNumber, etag });
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, parts.length) }, () => worker()));
  return completed.toSorted((a, b) => a.partNumber - b.partNumber);
}

export async function uploadMultipartBundle(
  options: MultipartBundleUploadOptions,
): Promise<BundleDetail> {
  const { file, kind, currentBundleId, signal, onProgress, onPhaseChange } = options;
  if (signal?.aborted) throw abortError();
  let sessionId: string | null = null;
  let processingStarted = false;
  const transferController = new AbortController();
  const abortTransfer = () => transferController.abort();
  signal?.addEventListener("abort", abortTransfer, { once: true });
  try {
    onPhaseChange?.("uploading");
    onProgress?.(0);
    const idempotencyKey = crypto.randomUUID();
    const createResponse = await retryUploadRequest(
      () =>
        apiClient.post(
          "/api/bundles/upload-sessions",
          {
            kind,
            currentBundleId,
            fileName: file.name,
            contentType: file.type || "application/zip",
            fileBytes: file.size,
          },
          { headers: { "Idempotency-Key": idempotencyKey }, signal },
        ),
      signal,
    );
    const created = v.parse(CreateBundleUploadSessionResponseSchema, createResponse.data);
    sessionId = created.sessionId;
    if (created.status !== "uploading") {
      processingStarted = true;
      onPhaseChange?.("processing");
      return await pollUploadSession(sessionId, signal);
    }

    const completedParts = await uploadAllParts(
      file,
      created.partSize,
      created.parts,
      transferController.signal,
      onProgress,
    );
    processingStarted = true;
    const completeResponse = await retryUploadRequest(
      () =>
        apiClient.post(
          `/api/bundles/upload-sessions/${sessionId}/complete`,
          { parts: completedParts },
          { signal },
        ),
      signal,
    );
    const completed = v.parse(BundleUploadSessionResponseSchema, completeResponse.data);
    onProgress?.(100);
    onPhaseChange?.("processing");
    if (completed.status === "completed" && completed.bundle) return completed.bundle;
    return await pollUploadSession(sessionId, signal);
  } catch (error) {
    transferController.abort();
    if (sessionId && (!processingStarted || signal?.aborted)) {
      await apiClient.delete(`/api/bundles/upload-sessions/${sessionId}`).catch(() => undefined);
    }
    throw error;
  } finally {
    signal?.removeEventListener("abort", abortTransfer);
  }
}
