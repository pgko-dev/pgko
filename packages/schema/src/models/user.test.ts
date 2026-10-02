import { describe, expect, it } from "bun:test";

import * as v from "valibot";

import { UserListQuerySchema, UserListResponseSchema } from "./user.js";

describe("UserListQuerySchema", () => {
  it("drops a search term shorter than 2 chars and trims", () => {
    expect(v.parse(UserListQuerySchema, { q: " a " }).q).toBeUndefined();
    expect(v.parse(UserListQuerySchema, { q: "  ab  " }).q).toBe("ab");
  });

  it("coerces limit and clamps to the allowed range", () => {
    expect(v.parse(UserListQuerySchema, { limit: "30" }).limit).toBe(30);
    expect(() => v.parse(UserListQuerySchema, { limit: "999" })).toThrow();
  });

  it("rejects an unknown sort value", () => {
    expect(() => v.parse(UserListQuerySchema, { sort: "nope" })).toThrow();
    expect(v.parse(UserListQuerySchema, { sort: "bundles" }).sort).toBe("bundles");
  });
});

describe("UserListResponseSchema", () => {
  it("parses items plus a nullable nextCursor", () => {
    const parsed = v.parse(UserListResponseSchema, {
      items: [
        {
          id: "01900000-0000-7000-8000-000000000000",
          name: "Alice",
          slug: "alice",
          bio: "",
          avatarUrl: null,
          bundlesCount: 3,
          createdAt: "2026-01-01T00:00:00.000Z",
          lastActivityAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      nextCursor: null,
    });
    expect(parsed.items[0]?.lastActivityAt).toBe("2026-06-01T00:00:00.000Z");
    expect(parsed.nextCursor).toBeNull();
  });
});
