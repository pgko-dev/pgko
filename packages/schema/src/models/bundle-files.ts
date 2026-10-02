import * as v from "valibot";

import { dateFrom, uuidString } from "../primitives.js";

export const BundleFileSchema = v.variant("status", [
  v.object({
    status: v.literal("ready"),
    url: v.string(),
    contentType: v.string(),
    codec: v.optional(v.literal("opus")),
    bitrate: v.optional(v.number()),
  }),
  v.object({
    status: v.picklist(["missing", "failed"]),
    reason: v.picklist(["missing_source", "invalid_path", "processing_failed"]),
  }),
]);
export type BundleFile = v.InferOutput<typeof BundleFileSchema>;

export const BundleFilesResponseSchema = v.object({
  bundleId: uuidString(),
  revision: v.number(),
  status: v.picklist(["pending", "ready", "partial", "failed"]),
  expiresAt: v.nullable(dateFrom()),
  charts: v.array(
    v.object({
      id: uuidString(),
      path: v.string(),
      file: BundleFileSchema,
      fileMappings: v.record(v.string(), BundleFileSchema),
    }),
  ),
});
export type BundleFilesResponse = v.InferOutput<typeof BundleFilesResponseSchema>;
