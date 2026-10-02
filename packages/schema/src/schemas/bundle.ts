import type { TFunction } from "i18next";
import * as v from "valibot";

import { BundleRules } from "@pgko-dev/config";

import { dTranslator } from "../i18n.js";

export function tBundleTitleSchema(translator: TFunction) {
  const required = translator("vali.bundle.title.required");
  const max = translator("vali.bundle.title.maxLength", {
    max: BundleRules.title.maxLength,
  });

  return v.pipe(
    v.string(required),
    v.trim(),
    v.nonEmpty(required),
    v.maxLength(BundleRules.title.maxLength, max),
  );
}

export const BundleTitleSchema = tBundleTitleSchema(dTranslator);

export function tBundleArtistSchema(translator: TFunction) {
  const required = translator("vali.bundle.artist.required");
  const max = translator("vali.bundle.artist.maxLength", {
    max: BundleRules.artist.maxLength,
  });

  return v.pipe(
    v.string(required),
    v.trim(),
    v.nonEmpty(required),
    v.maxLength(BundleRules.artist.maxLength, max),
  );
}

export const BundleArtistSchema = tBundleArtistSchema(dTranslator);

export function tBundleDescriptionSchema(translator: TFunction) {
  const invalid = translator("vali.bundle.description.invalid");
  const max = translator("vali.bundle.description.maxLength", {
    max: BundleRules.description.maxLength,
  });

  return v.pipe(v.string(invalid), v.trim(), v.maxLength(BundleRules.description.maxLength, max));
}

export const BundleDescriptionSchema = tBundleDescriptionSchema(dTranslator);

export function tBundleTagSchema(translator: TFunction) {
  const invalid = translator("vali.bundle.tag.invalid");
  const min = translator("vali.bundle.tag.minLength", {
    min: BundleRules.tag.minLength,
  });
  const max = translator("vali.bundle.tag.maxLength", {
    max: BundleRules.tag.maxLength,
  });
  const pattern = translator("vali.bundle.tag.pattern");

  return v.pipe(
    v.string(invalid),
    v.trim(),
    v.minLength(BundleRules.tag.minLength, min),
    v.regex(BundleRules.tag.pattern, pattern),
    v.maxLength(BundleRules.tag.maxLength, max),
  );
}

export const BundleTagSchema = tBundleTagSchema(dTranslator);

export function tBundleTagsSchema(translator: TFunction) {
  const tagsMax = translator("vali.bundle.tags.maxLength", {
    max: BundleRules.tags.maxLength,
  });

  return v.pipe(
    v.array(tBundleTagSchema(translator)),
    v.maxLength(BundleRules.tags.maxLength, tagsMax),
  );
}

export const BundleTagsSchema = tBundleTagsSchema(dTranslator);

export function tBundleVideoUrlSchema(translator: TFunction) {
  const invalid = translator("vali.bundle.videoUrl.invalid");
  const max = translator("vali.bundle.videoUrl.maxLength", {
    max: BundleRules.videoUrl.maxLength,
  });

  return v.pipe(
    v.string(invalid),
    v.trim(),
    v.maxLength(BundleRules.videoUrl.maxLength, max),
    v.check((val) => val === "" || /^https?:\/\//i.test(val), invalid),
  );
}

export const BundleVideoUrlSchema = tBundleVideoUrlSchema(dTranslator);
