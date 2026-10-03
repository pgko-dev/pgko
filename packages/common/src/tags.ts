import * as v from "valibot";

import { BundleRules } from "@pgko.dev/config";
import { BundleTagSchema, BundleTagsSchema } from "@pgko.dev/schema";

export function normalizeTag(t: string): string {
  return t.trim().replace(/\s+/g, " ").toLowerCase();
}

export function sanitizeTags(tags: string[]): string[] {
  const normalized = tags.map(normalizeTag).filter(Boolean);
  const valid = normalized.filter((t) => v.safeParse(BundleTagSchema, t).success);
  const deduped = [...new Set(valid)].slice(0, BundleRules.tags.maxLength);
  const parsed = v.safeParse(BundleTagsSchema, deduped);
  return parsed.success ? parsed.output : deduped;
}
