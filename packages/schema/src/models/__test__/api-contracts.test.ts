import { expect, test } from "bun:test";

import * as v from "valibot";

import { AccountBundleListQuerySchema, BundleUpdateMetadataBodySchema } from "../bundle";
import { CommonErrorSchema } from "../common";

test("metadata edits require a positive resource version", () => {
  for (const expectedResourceVersion of [undefined, 0, -1, 1.5]) {
    expect(
      v.safeParse(BundleUpdateMetadataBodySchema, { title: "Title", expectedResourceVersion })
        .success,
    ).toBe(false);
  }
  expect(v.safeParse(BundleUpdateMetadataBodySchema, { expectedResourceVersion: 1 }).success).toBe(
    true,
  );
});

test("account lists reject contradictory filters and errors require a machine code", () => {
  expect(
    v.safeParse(AccountBundleListQuerySchema, { draftsOnly: true, collaborationsOnly: true })
      .success,
  ).toBe(false);
  expect(
    v.safeParse(AccountBundleListQuerySchema, { collaborationStatus: "pending" }).success,
  ).toBe(true);
  expect(v.safeParse(CommonErrorSchema, { message: "api.error.unknown" }).success).toBe(false);
  expect(
    v.safeParse(CommonErrorSchema, { code: "unknown", message: "api.error.unknown" }).success,
  ).toBe(true);
});
