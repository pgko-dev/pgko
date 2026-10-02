import * as v from "valibot";

import { integerFrom } from "../primitives.js";
import { JointIDParamSchema, SlugSchema } from "../schemas/user.js";

export const PublicUserSchema = v.object({
  id: v.string(),
  name: v.string(),
  slug: v.string(),
  bio: v.string(),
  avatarUrl: v.nullable(v.string()),
  bundlesCount: v.number(),
  createdAt: v.string(),
});
export type PublicUser = v.InferOutput<typeof PublicUserSchema>;

export const PrivateUserSchema = v.object({
  id: v.string(),
  name: v.string(),
  slug: v.string(),
  bio: v.string(),
  email: v.string(),
  role: v.string(),
  avatarUrl: v.nullable(v.string()),
});
export type PrivateUser = v.InferOutput<typeof PrivateUserSchema>;

export const SlugAvailableParamsSchema = v.object({
  jointId: SlugSchema,
});

export const GetUserByJointIDParamsSchema = v.object({
  jointId: JointIDParamSchema,
});

export const UserSlugAvailableResponseSchema = v.object({
  slug: v.string(),
  available: v.boolean(),
});
export type UserSlugAvailableResponse = v.InferOutput<typeof UserSlugAvailableResponseSchema>;

export const GetUserByJointIDResponseSchema = v.object({
  user: PublicUserSchema,
});
export type GetUserByJointIDResponse = v.InferOutput<typeof GetUserByJointIDResponseSchema>;

const USER_LIST_MIN_SEARCH_LENGTH = 2;

export const UserListItemSchema = v.object({
  ...PublicUserSchema.entries,
  lastActivityAt: v.string(),
});
export type UserListItem = v.InferOutput<typeof UserListItemSchema>;

export const UserListSortSchema = v.picklist(["activity", "bundles", "name"]);
export type UserListSort = v.InferOutput<typeof UserListSortSchema>;

export const UserListQuerySchema = v.object({
  q: v.optional(
    v.pipe(
      v.union([v.string(), v.array(v.string())]),
      v.transform((val) => {
        const s = Array.isArray(val) ? val.join(" ").trim() : val.trim();
        return s.length >= USER_LIST_MIN_SEARCH_LENGTH ? s : undefined;
      }),
    ),
  ),
  sort: v.optional(UserListSortSchema),
  order: v.optional(v.picklist(["asc", "desc"])),
  cursor: v.optional(v.string()),
  limit: v.optional(v.pipe(integerFrom(), v.minValue(1), v.maxValue(50))),
});
export type UserListQuery = v.InferOutput<typeof UserListQuerySchema>;

export const UserListResponseSchema = v.object({
  items: v.array(UserListItemSchema),
  nextCursor: v.nullable(v.string()),
});
export type UserListResponse = v.InferOutput<typeof UserListResponseSchema>;
