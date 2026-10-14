import { describe, expect, test } from "bun:test";

import * as v from "valibot";

import {
  AdminSetBundleVisibilityBodySchema,
  AssetReferencesSchema,
  BundleListQuerySchema,
  BundleTagSuggestionsQuerySchema,
  PublicBundleListQuerySchema,
  AccountBundleListQuerySchema,
  BundleUpdateMetadataBodySchema,
  BundleVisibilitySchema,
  CreateBundleUploadSessionBodySchema,
} from "../bundle.js";

test("asset references strip legacy backgrounds and preserve supported references", () => {
  const bgm = { filePath: "song.ogg", resolvedPath: "folder/song.ogg", exists: true };
  const jacket = { filePath: "cover.png", resolvedPath: "folder/cover.png", exists: true };

  expect(v.parse(AssetReferencesSchema, { bgm, jacket, bgImg: jacket, fldImg: jacket })).toEqual({
    bgm,
    jacket,
  });
});

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
  test("accepts typed difficulty and tag arrays", () => {
    expect(
      v.parse(BundleListQuerySchema, {
        diff: [3, 5],
        tag: ["remix", "original"],
      }),
    ).toEqual({
      diff: [3, 5],
      tag: ["remix", "original"],
    });
  });

  test("validates filters on public and account endpoints", () => {
    for (const schema of [
      BundleListQuerySchema,
      PublicBundleListQuerySchema,
      AccountBundleListQuerySchema,
    ]) {
      for (const query of [
        { diff: "3" },
        { diff: "3,5" },
        { diff: "" },
        { diff: ["3"] },
        { diff: [3, "5"] },
        { diff: [6] },
        { diff: [-1] },
        { diff: [3.5] },
        { tag: "remix" },
        { tag: "remix,original" },
        { tag: ["a"] },
        { tag: ["invalid!"] },
        { tag: [123] },
      ]) {
        expect(v.safeParse(schema, query).success).toBe(false);
      }
      expect(v.safeParse(schema, { diff: [0, 4, 5] }).success).toBe(true);
      expect(v.parse(schema, { diff: [] }).diff).toEqual([]);
      expect(v.parse(schema, { tag: ["remix"] }).tag).toEqual(["remix"]);
      expect(v.parse(schema, { tag: [] }).tag).toEqual([]);
    }
  });

  test("coerces limit from a string", () => {
    expect(v.parse(BundleListQuerySchema, { limit: "30" }).limit).toBe(30);
    expect(() => v.parse(BundleListQuerySchema, { limit: "999" })).toThrow();
  });
});

test("tag suggestions validate bounded pages and trim search input", () => {
  expect(v.parse(BundleTagSuggestionsQuerySchema, { q: " remix ", limit: "10" })).toEqual({
    q: "remix",
    limit: 10,
  });
  for (const query of [
    { limit: 0 },
    { limit: 51 },
    { q: "x".repeat(33) },
    { cursor: "a".repeat(1025) },
  ]) {
    expect(v.safeParse(BundleTagSuggestionsQuerySchema, query).success).toBe(false);
  }
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
