import { describe, expect, test } from "bun:test";

import {
  validateBundleListSearch,
  validateCollaborationBundleSearch,
  validateProfileBundleSearch,
} from "../bundle-list-search";

describe("bundle list URL state", () => {
  test("retains incomplete text and valid filters without accepting API-only scope parameters", () => {
    expect(
      validateBundleListSearch({
        q: "曲",
        diff: [3, 5],
        tag: ["remix"],
        sort: "downloads",
        order: "asc",
        userId: "someone-else",
        draftsOnly: true,
        cursor: "stale-page",
      }),
    ).toEqual({ q: "曲", diff: [3, 5], tag: ["remix"], sort: "downloads", order: "asc" });
  });

  test("invalid fields fall back independently without losing valid search state", () => {
    expect(
      validateBundleListSearch({
        q: "valid search",
        sort: "unsupported",
        order: "asc",
        diff: [99],
        tag: ["invalid!"],
      }),
    ).toEqual({
      q: "valid search",
      sort: undefined,
      order: "asc",
      diff: undefined,
      tag: undefined,
    });
    expect(validateBundleListSearch({ q: { nested: true }, order: ["desc"] })).toEqual({
      q: undefined,
      order: undefined,
    });
  });

  test("accepts numeric and boolean-looking search text from hand-written URLs", () => {
    expect(validateBundleListSearch({ q: 123 }).q).toBe("123");
    expect(validateBundleListSearch({ q: false }).q).toBe("false");
  });

  test("scope tabs are accepted only by their owning routes", () => {
    expect(validateProfileBundleSearch({ mode: "draft", q: "test" })).toEqual({
      mode: "draft",
      q: "test",
    });
    expect(validateCollaborationBundleSearch({ status: "accepted", order: "asc" })).toEqual({
      status: "accepted",
      order: "asc",
    });
    expect(validateBundleListSearch({ mode: "draft", status: "accepted" })).toEqual({});
    expect(validateProfileBundleSearch({ mode: "invalid" })).toEqual({ mode: undefined });
    expect(validateCollaborationBundleSearch({ status: "invalid" })).toEqual({ status: undefined });
  });
});
