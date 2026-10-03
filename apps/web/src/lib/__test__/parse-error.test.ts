/// <reference types="bun" />

import { expect, test } from "bun:test";

import { extractTranslationKeys } from "../parse-error";

test("extracts localized image errors from Elysia validation responses", () => {
  expect(
    extractTranslationKeys({
      response: {
        data: {
          code: "validationFailed",
          message: "api.error.unknown",
          errors: [{ path: "image", message: 't:["vali.image.invalidContent"]' }],
        },
      },
    }),
  ).toEqual(["vali.image.invalidContent"]);
});

test("ignores unmarked framework validation messages", () => {
  expect(
    extractTranslationKeys({
      response: {
        data: {
          errors: [{ message: "Invalid file" }],
        },
      },
    }),
  ).toEqual(["api.error.unknown"]);
});
