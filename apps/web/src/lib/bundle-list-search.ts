import * as v from "valibot";

import { BundleListQuerySchema } from "@pgko.dev/schema";

export const BUNDLE_SORT_FIELDS = [
  "reuploadedAt",
  "releasedAt",
  "title",
  "artist",
  "downloads",
] as const;
export const DEFAULT_BUNDLE_SORT = "reuploadedAt";
export const DEFAULT_BUNDLE_ORDER = "desc";

const bundleListSearchSchema = v.object({
  // Keep incomplete search text in the URL; the API applies its minimum length.
  q: v.fallback(
    v.optional(v.pipe(v.union([v.string(), v.number(), v.boolean()]), v.transform(String))),
    undefined,
  ),
  sort: v.fallback(BundleListQuerySchema.entries.sort, undefined),
  order: v.fallback(BundleListQuerySchema.entries.order, undefined),
  diff: v.fallback(BundleListQuerySchema.entries.diff, undefined),
  tag: v.fallback(BundleListQuerySchema.entries.tag, undefined),
});

const profileBundleSearchSchema = v.object({
  ...bundleListSearchSchema.entries,
  mode: v.fallback(v.optional(v.picklist(["released", "collab", "draft"])), undefined),
});

const collaborationBundleSearchSchema = v.object({
  ...bundleListSearchSchema.entries,
  status: v.fallback(BundleListQuerySchema.entries.collaborationStatus, undefined),
});

export type BundleListSearch = v.InferOutput<typeof bundleListSearchSchema>;
export type BundleSortField = NonNullable<BundleListSearch["sort"]>;
export type BundleSortOrder = NonNullable<BundleListSearch["order"]>;

export function validateBundleListSearch(search: Record<string, unknown>) {
  return v.parse(bundleListSearchSchema, search);
}

export function validateProfileBundleSearch(search: Record<string, unknown>) {
  return v.parse(profileBundleSearchSchema, search);
}

export function validateCollaborationBundleSearch(search: Record<string, unknown>) {
  return v.parse(collaborationBundleSearchSchema, search);
}
