import * as v from "valibot";

import { booleanFrom, dateFrom, integerFrom, urlString, uuidString } from "../primitives.js";
import {
  BundleArtistSchema,
  BundleDescriptionSchema,
  BundleTagsSchema,
  BundleTitleSchema,
  BundleVideoUrlSchema,
} from "../schemas/bundle.js";

export const AssetReferenceSchema = v.object({
  filePath: v.string(),
  resolvedPath: v.nullable(v.string()),
  exists: v.boolean(),
});
export type AssetReference = v.InferOutput<typeof AssetReferenceSchema>;

export const AssetReferencesSchema = v.object({
  bgm: v.optional(AssetReferenceSchema),
  jacket: v.optional(AssetReferenceSchema),
  fldImg: v.optional(AssetReferenceSchema),
  bgImg: v.optional(AssetReferenceSchema),
});
export type AssetReferences = v.InferOutput<typeof AssetReferencesSchema>;

export const ProcessOutcomeSchema = v.variant("success", [
  v.object({
    success: v.literal(true),
    key: v.string(),
    themeColor: v.nullish(v.string()),
  }),
  v.object({
    success: v.literal(false),
    message: v.string(),
    context: v.optional(v.unknown()),
  }),
]);
export type ProcessOutcome = v.InferOutput<typeof ProcessOutcomeSchema>;

export const ProcessResultSchema = v.object({
  type: v.picklist(["jacket", "preview", "beatmap"]),
  filePath: v.string(),
  ret: ProcessOutcomeSchema,
});
export type ProcessResult = v.InferOutput<typeof ProcessResultSchema>;

export const SongSummarySchema = v.object({
  id: v.string(),
  ugcPath: v.string(),

  songId: v.string(),
  title: v.string(),
  artist: v.string(),
  difficulty: v.number(),
  level: v.string(),
  constant: v.number(),
  weAttribute: v.nullable(v.string()),
  bpm: v.nullable(v.number()),
  designer: v.string(),

  assetReferences: v.nullable(AssetReferencesSchema),
  jacketUrl: v.nullish(v.string()),
  previewUrl: v.nullish(v.string()),
  videoUrl: v.nullish(v.string()),
});
export type SongSummary = v.InferOutput<typeof SongSummarySchema>;

export const BundlePublicUploaderSchema = v.object({
  id: v.string(),
  name: v.string(),
  slug: v.nullish(v.string()),
});
export type BundlePublicUploader = v.InferOutput<typeof BundlePublicUploaderSchema>;

export const BundleCollaboratorSchema = v.object({
  id: v.string(),
  name: v.string(),
  slug: v.nullish(v.string()),
});
export type BundleCollaborator = v.InferOutput<typeof BundleCollaboratorSchema>;

export const BundleManageRoleSchema = v.picklist(["owner", "collaborator"]);
export type BundleManageRole = v.InferOutput<typeof BundleManageRoleSchema>;

export const BundleVisibilitySchema = v.picklist(["public", "profile_only", "unlisted"]);
export type BundleVisibility = v.InferOutput<typeof BundleVisibilitySchema>;

export const BundleDetailSchema = v.object({
  id: v.string(),

  title: v.string(),
  artist: v.string(),
  description: v.optional(v.string()),

  songs: v.nullable(v.array(SongSummarySchema)),
  results: v.nullable(v.array(ProcessResultSchema)),

  coverUrl: v.nullish(v.string()),
  coverThemeColor: v.nullish(v.string()),
  videoUrl: v.nullish(v.string()),

  uploadedBy: BundlePublicUploaderSchema,
  releasedAt: v.nullable(dateFrom()),
  status: v.picklist(["draft", "reupload", "released"]),
  visibility: BundleVisibilitySchema,
  visibilityLocked: v.boolean(),
  tags: v.array(v.string()),
  collaborators: v.optional(v.array(BundleCollaboratorSchema)),
  encodingIssues: v.optional(v.boolean()),
  role: v.optional(BundleManageRoleSchema),
});
export type BundleDetail = v.InferOutput<typeof BundleDetailSchema>;

export const BundlePublicDetailSchema = v.object({
  id: v.string(),
  filesUrl: v.string(),
  title: v.string(),
  artist: v.string(),
  description: v.optional(v.string()),
  coverUrl: v.nullish(v.string()),
  coverThemeColor: v.nullish(v.string()),
  videoUrl: v.nullish(v.string()),
  releasedAt: v.nullable(dateFrom()),
  reuploadedAt: v.nullable(dateFrom()),
  revision: v.number(),
  tags: v.array(v.string()),
  songs: v.nullable(v.array(SongSummarySchema)),
  uploadedBy: BundlePublicUploaderSchema,
  collaborators: v.optional(v.array(BundleCollaboratorSchema), () => []),
  downloadCount: v.number(),
  visibility: BundleVisibilitySchema,
  encodingIssues: v.optional(v.boolean()),
});
export type BundlePublicDetail = v.InferOutput<typeof BundlePublicDetailSchema>;

// Collaboration requests (inbox)
export const CollaborationRequestStatusSchema = v.picklist(["pending", "accepted", "declined"]);
export type CollaborationRequestStatus = v.InferOutput<typeof CollaborationRequestStatusSchema>;

export const InviteCollaboratorBodySchema = v.object({
  jointId: v.pipe(v.string(), v.minLength(1)),
});
export type InviteCollaboratorBody = v.InferOutput<typeof InviteCollaboratorBodySchema>;

export const BundleCollaborationRequestForOwnerSchema = v.object({
  id: v.string(),
  toUser: BundlePublicUploaderSchema,
  status: v.picklist(["pending", "accepted", "declined"]),
  createdAt: dateFrom(),
});
export type BundleCollaborationRequestForOwner = v.InferOutput<
  typeof BundleCollaborationRequestForOwnerSchema
>;

export const BundleCollaborationRequestsResponseSchema = v.object({
  requests: v.array(BundleCollaborationRequestForOwnerSchema),
});
export type BundleCollaborationRequestsResponse = v.InferOutput<
  typeof BundleCollaborationRequestsResponseSchema
>;

export const InviteCollaboratorResponseSchema = v.object({
  id: v.string(),
  bundleId: v.string(),
  fromUser: BundlePublicUploaderSchema,
  toUser: BundlePublicUploaderSchema,
  status: v.literal("pending"),
});
export type InviteCollaboratorResponse = v.InferOutput<typeof InviteCollaboratorResponseSchema>;

export const CancelCollaborationBodySchema = v.object({
  toUserId: uuidString(),
});
export type CancelCollaborationBody = v.InferOutput<typeof CancelCollaborationBodySchema>;

export const BundleStatsSchema = v.object({
  last24h: v.number(),
  lastWeek: v.number(),
  lifetime: v.number(),
  biggestDay: v.nullable(v.object({ date: v.string(), count: v.number() })),
  dailyDownloadsChart: v.array(v.object({ date: v.string(), count: v.number() })),
  totalDownloadsChart: v.array(v.object({ date: v.string(), total: v.number() })),
});
export type BundleStats = v.InferOutput<typeof BundleStatsSchema>;

export const BundleUploadResponseSchema = BundleDetailSchema;
export type BundleUploadResponse = v.InferOutput<typeof BundleUploadResponseSchema>;

export const BundleGetResponseSchema = BundleDetailSchema;
export type BundleGetResponse = v.InferOutput<typeof BundleGetResponseSchema>;

export const BundleIdParamsSchema = v.object({
  bundleId: uuidString(),
});
export type BundleIdParams = v.InferOutput<typeof BundleIdParamsSchema>;

export const BundleRandomQuerySchema = v.object({
  exclude: v.optional(uuidString()),
});
export type BundleRandomQuery = v.InferOutput<typeof BundleRandomQuerySchema>;

export const BundleRandomResponseSchema = v.object({
  bundleId: uuidString(),
});
export type BundleRandomResponse = v.InferOutput<typeof BundleRandomResponseSchema>;

export const BundleUpdateMetadataBodySchema = v.object({
  title: v.optional(BundleTitleSchema),
  artist: v.optional(BundleArtistSchema),
  description: v.optional(BundleDescriptionSchema),
  tags: v.optional(BundleTagsSchema),
  videoUrl: v.optional(BundleVideoUrlSchema),
  visibility: v.optional(BundleVisibilitySchema),
  videoUrlMappings: v.optional(v.record(v.string(), BundleVideoUrlSchema)),
});
export type BundleUpdateMetadataBody = v.InferOutput<typeof BundleUpdateMetadataBodySchema>;

export const ReleaseBundleBodySchema = v.object({});
export type ReleaseBundleBody = v.InferOutput<typeof ReleaseBundleBodySchema>;

export const DeleteBundleParamsSchema = v.object({
  bundleId: uuidString(),
});
export type DeleteBundleParams = v.InferOutput<typeof DeleteBundleParamsSchema>;

export const ReleaseBundleParamsSchema = v.object({
  bundleId: uuidString(),
});
export type ReleaseBundleParams = v.InferOutput<typeof ReleaseBundleParamsSchema>;

export const GetBundleParamsSchema = v.object({
  bundleId: uuidString(),
});
export type GetBundleParams = v.InferOutput<typeof GetBundleParamsSchema>;

export const BundleReuploadResponseSchema = BundleDetailSchema;
export type BundleReuploadResponse = v.InferOutput<typeof BundleReuploadResponseSchema>;

export const BundleUploadSessionKindSchema = v.picklist(["upload", "reupload"]);
export type BundleUploadSessionKind = v.InferOutput<typeof BundleUploadSessionKindSchema>;

export const CreateBundleUploadSessionBodySchema = v.pipe(
  v.object({
    kind: BundleUploadSessionKindSchema,
    currentBundleId: v.optional(uuidString()),
    fileName: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(512)),
    contentType: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(255)), "application/zip"),
    fileBytes: v.pipe(v.number(), v.integer(), v.minValue(1)),
  }),
  v.forward(
    v.partialCheck(
      [["kind"], ["currentBundleId"]],
      (input) => input.kind === "reupload" || input.currentBundleId === undefined,
    ),
    ["currentBundleId"],
  ),
  v.forward(
    v.partialCheck(
      [["kind"], ["currentBundleId"]],
      (input) => input.kind === "upload" || input.currentBundleId !== undefined,
    ),
    ["currentBundleId"],
  ),
);
export type CreateBundleUploadSessionBody = v.InferOutput<
  typeof CreateBundleUploadSessionBodySchema
>;

export const BundleUploadPartSchema = v.object({
  partNumber: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(10_000)),
  url: urlString(),
});

export const CreateBundleUploadSessionResponseSchema = v.object({
  sessionId: uuidString(),
  expiresAt: dateFrom(),
  partSize: v.pipe(v.number(), v.integer(), v.minValue(1)),
  parts: v.pipe(v.array(BundleUploadPartSchema), v.minLength(1)),
});
export type CreateBundleUploadSessionResponse = v.InferOutput<
  typeof CreateBundleUploadSessionResponseSchema
>;

export const CompleteBundleUploadPartSchema = v.object({
  partNumber: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(10_000)),
  etag: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(128)),
});

export const CompleteBundleUploadSessionBodySchema = v.object({
  parts: v.pipe(v.array(CompleteBundleUploadPartSchema), v.minLength(1), v.maxLength(20)),
});
export type CompleteBundleUploadSessionBody = v.InferOutput<
  typeof CompleteBundleUploadSessionBodySchema
>;

export const BundleUploadSessionParamsSchema = v.object({
  sessionId: uuidString(),
});

export const BundleUploadSessionStatusSchema = v.picklist([
  "uploading",
  "queued",
  "processing",
  "completed",
  "failed",
  "canceled",
]);

export const BundleUploadSessionResponseSchema = v.object({
  sessionId: uuidString(),
  status: BundleUploadSessionStatusSchema,
  bundle: v.optional(BundleDetailSchema),
  errorKey: v.optional(v.string()),
});
export type BundleUploadSessionResponse = v.InferOutput<typeof BundleUploadSessionResponseSchema>;

export const ReplaceBundleBodySchema = v.object({
  ...BundleUpdateMetadataBodySchema.entries,
  tempBundleId: uuidString(),
});
export type ReplaceBundleBody = v.InferOutput<typeof ReplaceBundleBodySchema>;

export const BundleListSongSchema = v.object({
  id: v.string(),
  title: v.string(),
  artist: v.string(),
  difficulty: v.number(),
  level: v.string(),
  constant: v.number(),
  weAttribute: v.nullable(v.string()),
  previewUrl: v.nullish(v.string()),
  videoUrl: v.nullish(v.string()),
});
export type BundleListSong = v.InferOutput<typeof BundleListSongSchema>;

export const BundleListUploaderSchema = v.object({
  id: v.string(),
  name: v.string(),
  slug: v.string(),
});
export type BundleListUploader = v.InferOutput<typeof BundleListUploaderSchema>;

export const BundleListItemSchema = v.object({
  id: v.string(),
  title: v.string(),
  artist: v.string(),
  coverUrl: v.nullish(v.string()),
  coverThemeColor: v.nullish(v.string()),
  videoUrl: v.nullish(v.string()),
  releasedAt: v.nullable(dateFrom()),
  reuploadedAt: v.nullish(dateFrom()),
  revision: v.optional(v.number()),
  visibility: BundleVisibilitySchema,
  tags: v.array(v.string()),
  uploadedBy: BundleListUploaderSchema,
  collaborators: v.optional(v.array(BundleCollaboratorSchema), () => []),
  songs: v.array(BundleListSongSchema),
  downloadCount: v.number(),
  status: v.optional(v.picklist(["draft", "reupload", "released"])),
  expiresAt: v.nullish(dateFrom()),
});
export type BundleListItem = v.InferOutput<typeof BundleListItemSchema>;

export const BundleListResponseSchema = v.object({
  bundles: v.array(BundleListItemSchema),
  nextCursor: v.nullable(v.string()),
});
export type BundleListResponse = v.InferOutput<typeof BundleListResponseSchema>;

const MIN_SEARCH_LENGTH = 2;

export const BundleListQuerySchema = v.object({
  q: v.optional(
    v.pipe(
      v.union([v.string(), v.array(v.string())]),
      v.transform((val) => {
        const s = Array.isArray(val) ? val.join(" ").trim() : val.trim();
        return s.length >= MIN_SEARCH_LENGTH ? s : undefined;
      }),
    ),
  ),
  userId: v.optional(uuidString()),
  sort: v.optional(v.picklist(["releasedAt", "reuploadedAt", "title", "artist", "downloads"])),
  order: v.optional(v.picklist(["asc", "desc"])),
  cursor: v.optional(v.string()),
  limit: v.optional(v.pipe(integerFrom(), v.minValue(1), v.maxValue(50))),
  draftsOnly: v.optional(booleanFrom()),
  collaborationsOnly: v.optional(booleanFrom()),
  collaborationStatus: v.optional(CollaborationRequestStatusSchema),
});
export type BundleListQuery = v.InferOutput<typeof BundleListQuerySchema>;

export const AdminSetBundleVisibilityBodySchema = v.object({
  visibility: v.optional(BundleVisibilitySchema),
  visibilityLocked: v.boolean(),
  reason: v.optional(v.pipe(v.string(), v.maxLength(500))),
});
export type AdminSetBundleVisibilityBody = v.InferOutput<typeof AdminSetBundleVisibilityBodySchema>;
