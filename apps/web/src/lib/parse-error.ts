import { AxiosError } from "axios";
import i18n from "i18next";
import { toast } from "sonner";
import * as v from "valibot";

import type { TranslationKey } from "@pgko-dev/i18n";

interface ValidationError {
  value?: {
    errors?: Array<{ message?: unknown }>;
  };
}

interface AxiosLikeError {
  response?: {
    data?: unknown;
  };
  cause?: unknown;
  error?: unknown;
  isAxiosError?: boolean;
}

const TRANSLATION_PREFIX = "t:";
const API_ERROR_PREFIX = "api.";
const UI_ERROR_PREFIX = "ui.";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseTranslationArray = (input: unknown): TranslationKey[] | null => {
  if (typeof input !== "string" || !input.startsWith(TRANSLATION_PREFIX)) {
    return null;
  }

  const json = input.substring(TRANSLATION_PREFIX.length);
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed)
      ? parsed.filter((key): key is TranslationKey => typeof key === "string")
      : null;
  } catch {
    return null;
  }
};

const parseTranslationSingle = (input: unknown): TranslationKey[] | null => {
  if (typeof input !== "string") {
    return null;
  }

  if (input.startsWith(TRANSLATION_PREFIX)) {
    return [input.substring(TRANSLATION_PREFIX.length) as TranslationKey];
  }

  if (input.startsWith(API_ERROR_PREFIX)) {
    return [input as TranslationKey];
  }

  if (input.startsWith(UI_ERROR_PREFIX)) {
    return [input as TranslationKey];
  }

  return null;
};

const addKeys = (keys: TranslationKey[], parsed: TranslationKey[] | null) => {
  if (parsed) {
    keys.push(...parsed);
  }
};

const isAxiosLikeError = (error: unknown): error is AxiosError | AxiosLikeError => {
  if (error instanceof AxiosError) {
    return true;
  }

  if (!isRecord(error)) {
    return false;
  }

  return error.isAxiosError === true || "response" in error;
};

const extractFromResponsePayload = (data: unknown): TranslationKey[] => {
  const keys: TranslationKey[] = [];

  if (isRecord(data) && Array.isArray(data.errors)) {
    for (const issue of data.errors) {
      if (isRecord(issue)) {
        addKeys(
          keys,
          parseTranslationArray(issue.message) ?? parseTranslationSingle(issue.message),
        );
      }
    }
  }

  if (keys.length === 0 && isRecord(data) && "message" in data) {
    addKeys(keys, parseTranslationSingle(data.message));
  }

  if (isRecord(data) && "error" in data && isRecord(data.error) && "message" in data.error) {
    addKeys(keys, parseTranslationSingle(data.error.message));
  }

  if (typeof data === "string") {
    addKeys(keys, parseTranslationSingle(data));
  }

  return keys;
};

const extractFromAxiosError = (error: AxiosError | AxiosLikeError): TranslationKey[] =>
  extractFromResponsePayload(error.response?.data);

const extractFromValidationError = (error: ValidationError): TranslationKey[] => {
  const keys: TranslationKey[] = [];
  const { value } = error;

  if (!isRecord(value)) {
    return keys;
  }

  if (Array.isArray(value.errors)) {
    for (const err of value.errors) {
      if (isRecord(err)) {
        addKeys(keys, parseTranslationArray(err.message));
      }
    }
  }

  if (keys.length === 0) {
    addKeys(keys, parseTranslationSingle(value));
  }

  return keys;
};

const extractFromGenericError = (error: unknown): TranslationKey[] => {
  const keys: TranslationKey[] = [];

  if (isRecord(error) && "message" in error) {
    addKeys(keys, parseTranslationSingle(error.message));
  } else {
    addKeys(keys, parseTranslationSingle(error));
  }

  return keys;
};

const extractFromNestedError = (error: unknown, depth: number): TranslationKey[] => {
  if (depth >= 3 || !isRecord(error)) {
    return [];
  }

  for (const key of ["cause", "error"] as const) {
    if (!(key in error)) {
      continue;
    }

    const nestedKeys = extractTranslationKeysInternal(error[key], depth + 1);
    if (nestedKeys.length > 0) {
      return nestedKeys;
    }
  }

  return [];
};

const extractTranslationKeysInternal = (error: unknown, depth = 0): TranslationKey[] => {
  let keys: TranslationKey[] = [];

  if (isAxiosLikeError(error)) {
    keys = extractFromAxiosError(error);
  } else if (isRecord(error) && "value" in error) {
    keys = extractFromValidationError(error as ValidationError);
  }

  if (keys.length === 0) {
    keys = extractFromGenericError(error);
  }

  if (keys.length === 0) {
    keys = extractFromNestedError(error, depth);
  }

  return keys;
};

export const extractTranslationKeys = (error: unknown): TranslationKey[] => {
  const keys = [...new Set(extractTranslationKeysInternal(error))];

  if (keys.length === 0) {
    return ["api.error.unknown"];
  }

  return keys;
};

export function handleApiError(error: unknown) {
  if (error instanceof v.ValiError) {
    console.error("[API] Invalid response data:", error);
    toast.error(i18n.t("api.error.invalidResponse"));
    return;
  }
  for (const key of extractTranslationKeys(error)) {
    const message = i18n.t(key as unknown as TranslationKey);
    toast.error(message);
  }
}
