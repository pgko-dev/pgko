import type { TFunction } from "i18next";
import * as v from "valibot";

import { UserRules } from "@pgko.dev/config";

import { dTranslator } from "../i18n.js";

export function tEmailSchema(translator: TFunction) {
  const required = translator("vali.email.required");
  const invalid = translator("vali.email.invalid");
  const max = translator("vali.email.maxLength", {
    max: UserRules.email.maxLength,
  });

  return v.pipe(
    v.string(required),
    v.trim(),
    v.nonEmpty(required),
    v.email(invalid),
    v.maxLength(UserRules.email.maxLength, max),
  );
}

export const EmailSchema = tEmailSchema(dTranslator);

export function tConfirmPasswordSchema(translator: TFunction) {
  const required = translator("vali.password.required");
  return v.pipe(v.string(required), v.trim(), v.nonEmpty(required));
}

export function tLoginPasswordSchema(translator: TFunction) {
  const max = translator("vali.password.maxLength", {
    max: UserRules.password.maxLength,
  });

  return v.pipe(tConfirmPasswordSchema(translator), v.maxLength(UserRules.password.maxLength, max));
}

export const LoginPasswordSchema = tLoginPasswordSchema(dTranslator);

export function tRegisterPasswordSchema(translator: TFunction) {
  const required = translator("vali.password.required");
  const min = translator("vali.password.minLength", { min: UserRules.password.minLength });
  const max = translator("vali.password.maxLength", { max: UserRules.password.maxLength });
  const patternMismatch = translator("vali.password.patternMismatch");

  return v.pipe(
    v.string(required),
    v.trim(),
    v.minLength(UserRules.password.minLength, min),
    v.maxLength(UserRules.password.maxLength, max),
    v.regex(UserRules.password.pattern, patternMismatch),
  );
}

export const RegisterPasswordSchema = tRegisterPasswordSchema(dTranslator);

export function tNameSchema(translator: TFunction) {
  const required = translator("vali.name.required");
  const patternMismatch = translator("vali.name.patternMismatch");
  const min = translator("vali.name.minLength", {
    min: UserRules.name.minLength,
  });
  const max = translator("vali.name.maxLength", {
    max: UserRules.name.maxLength,
  });

  return v.pipe(
    v.string(required),
    v.trim(),
    v.minLength(UserRules.name.minLength, min),
    v.maxLength(UserRules.name.maxLength, max),
    v.regex(UserRules.name.pattern, patternMismatch),
  );
}

export const NameSchema = tNameSchema(dTranslator);

export function tSlugSchema(translator: TFunction) {
  const required = translator("vali.slug.required");
  const min = translator("vali.slug.minLength", {
    min: UserRules.slug.minLength,
  });
  const max = translator("vali.slug.maxLength", {
    max: UserRules.slug.maxLength,
  });
  const patternMismatch = translator("vali.slug.patternMismatch");

  return v.pipe(
    v.string(required),
    v.trim(),
    v.minLength(UserRules.slug.minLength, min),
    v.maxLength(UserRules.slug.maxLength, max),
    v.regex(UserRules.slug.pattern, patternMismatch),
  );
}

export const SlugSchema = tSlugSchema(dTranslator);

export function tSlugLooseSchema(translator: TFunction) {
  const required = translator("vali.slug.required");
  const max = translator("vali.slug.maxLength", {
    max: UserRules.slug.maxLength,
  });

  return v.pipe(v.string(required), v.trim(), v.maxLength(UserRules.slug.maxLength, max));
}

export const SlugLooseSchema = tSlugLooseSchema(dTranslator);

const UUID_MAX = 36;

export function tJointIDParamSchema(translator: TFunction) {
  const required = translator("vali.slug.required");
  const min = translator("vali.slug.minLength", {
    min: UserRules.slug.minLength,
  });
  const max = translator("vali.slug.maxLength", { max: UUID_MAX });

  return v.pipe(
    v.string(required),
    v.trim(),
    v.minLength(UserRules.slug.minLength, min),
    v.maxLength(UUID_MAX, max),
  );
}

export const JointIDParamSchema = tJointIDParamSchema(dTranslator);

export function tBioSchema(translator: TFunction) {
  const invalid = translator("vali.bio.invalid");
  const max = translator("vali.bio.maxLength", {
    max: UserRules.bio.maxLength,
  });
  return v.pipe(v.string(invalid), v.trim(), v.maxLength(UserRules.bio.maxLength, max));
}

export const BioSchema = tBioSchema(dTranslator);

const OTP_LENGTH = 6;

export function tOtpSchema(translator: TFunction) {
  const required = translator("vali.otp.required");
  const invalid = translator("vali.otp.invalid");

  return v.pipe(v.string(required), v.trim(), v.length(OTP_LENGTH, invalid));
}

export const OtpSchema = tOtpSchema(dTranslator);
