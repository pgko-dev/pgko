import { expect, test } from "bun:test";

import * as v from "valibot";

import { BundleFileSchema, BundleFilesResponseSchema } from "../bundle-files.js";

const bundleId = "01900000-0000-7000-8000-000000000000";
const readyFile = {
  status: "ready",
  url: "https://assets.example.test/file",
  contentType: "audio/ogg",
  codec: "opus",
  bitrate: 128000,
} as const;

test("manifest contract preserves exact chart references and normalizes expiry", () => {
  const response = v.parse(BundleFilesResponseSchema, {
    bundleId,
    revision: 2,
    status: "partial",
    expiresAt: "2026-10-02T00:00:00.000Z",
    charts: [
      {
        id: bundleId,
        path: "folder/chart.ugc",
        file: { ...readyFile, contentType: "application/octet-stream" },
        fileMappings: {
          "../Music Name.wav": readyFile,
          "missing.png": { status: "missing", reason: "missing_source" },
        },
      },
    ],
  });

  expect(response.expiresAt).toEqual(new Date("2026-10-02T00:00:00.000Z"));
  expect(response.charts[0]?.fileMappings["../Music Name.wav"]).toEqual(readyFile);
  expect(response.charts[0]?.fileMappings["missing.png"]).toEqual({
    status: "missing",
    reason: "missing_source",
  });
});

const invalidFiles: unknown[] = [
  { status: "ready", contentType: "audio/ogg" },
  { status: "ready", url: "https://assets.example.test/file" },
  { ...readyFile, codec: "vorbis" },
  { status: "failed" },
  { status: "missing", reason: "unknown" },
];

test.each(invalidFiles)("rejects incomplete or unsupported file descriptors: %j", (file) => {
  expect(v.safeParse(BundleFileSchema, file).success).toBe(false);
});

test("pending manifest supports an empty chart set without an expiry", () => {
  const pending = {
    bundleId,
    revision: 1,
    status: "pending" as const,
    expiresAt: null,
    charts: [],
  };

  expect(v.parse(BundleFilesResponseSchema, pending)).toEqual(pending);
});
