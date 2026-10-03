import { describe, expect, test } from "bun:test";

import * as v from "valibot";

import {
  AdminSetBundleVisibilityBodySchema,
  BundleListQuerySchema,
  BundleUpdateMetadataBodySchema,
  BundleVisibilitySchema,
  CreateBundleUploadSessionBodySchema,
} from "../bundle.js";

describe("BundleVisibilitySchema", () => {
  test("accepts the three visibility values", () => {
    expect(v.parse(BundleVisibilitySchema, "public")).toBe("public");
    expect(v.parse(BundleVisibilitySchema, "profile_only")).toBe("profile_only");
    expect(v.parse(BundleVisibilitySchema, "unlisted")).toBe("unlisted");
  });

  test("rejects unknown values", () => {
    expect(v.safeParse(BundleVisibilitySchema, "secret").success).toBe(false);
  });
});

describe("BundleUpdateMetadataBodySchema", () => {
  test("visibility is optional", () => {
    expect(
      v.parse(BundleUpdateMetadataBodySchema, { expectedResourceVersion: 1 }).visibility,
    ).toBeUndefined();
    expect(
      v.parse(BundleUpdateMetadataBodySchema, {
        expectedResourceVersion: 1,
        visibility: "unlisted",
      }).visibility,
    ).toBe("unlisted");
  });
});

describe("AdminSetBundleVisibilityBodySchema", () => {
  test("requires visibilityLocked and allows optional visibility + reason", () => {
    const parsed = v.parse(AdminSetBundleVisibilityBodySchema, {
      visibility: "unlisted",
      visibilityLocked: true,
      reason: "ToS violation",
    });
    expect(parsed.visibilityLocked).toBe(true);
    expect(parsed.visibility).toBe("unlisted");
  });

  test("visibilityLocked is required", () => {
    expect(v.safeParse(AdminSetBundleVisibilityBodySchema, { visibility: "public" }).success).toBe(
      false,
    );
  });
});

describe("BundleListQuerySchema", () => {
  test("coerces limit from a string", () => {
    expect(v.parse(BundleListQuerySchema, { limit: "30" }).limit).toBe(30);
    expect(() => v.parse(BundleListQuerySchema, { limit: "999" })).toThrow();
  });
});

describe("CreateBundleUploadSessionBodySchema", () => {
  const uuid = "01900000-0000-7000-8000-000000000000";
  const base = { fileName: "pack.zip", fileBytes: 1024 };

  test("upload must not include currentBundleId", () => {
    expect(v.parse(CreateBundleUploadSessionBodySchema, { ...base, kind: "upload" }).kind).toBe(
      "upload",
    );
    expect(
      v.safeParse(CreateBundleUploadSessionBodySchema, {
        ...base,
        kind: "upload",
        currentBundleId: uuid,
      }).success,
    ).toBe(false);
  });

  test("reupload requires currentBundleId", () => {
    expect(
      v.parse(CreateBundleUploadSessionBodySchema, {
        ...base,
        kind: "reupload",
        currentBundleId: uuid,
      }).currentBundleId,
    ).toBe(uuid);
    expect(
      v.safeParse(CreateBundleUploadSessionBodySchema, { ...base, kind: "reupload" }).success,
    ).toBe(false);
  });
});
