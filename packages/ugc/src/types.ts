import * as v from "valibot";

export const UgcIssueSchema = v.object({
  message: v.string(),
  context: v.optional(v.unknown()),
});
export type UgcIssue = v.InferOutput<typeof UgcIssueSchema>;

export const UgcHeaderSchema = v.object({
  songId: v.string(),
  title: v.string(),
  artist: v.string(),
  designer: v.string(),
  difficulty: v.number(),
  level: v.string(),
  constant: v.number(),

  bgmPreviewStart: v.optional(v.number()),
  bgmPreviewStop: v.optional(v.number()),

  bgm: v.optional(v.string()),
  jacket: v.optional(v.string()),
  bgImg: v.optional(v.string()),
  fldImg: v.optional(v.string()),

  bpm: v.optional(v.number()),
  weAttribute: v.optional(v.string()),
  comments: v.optional(v.array(v.string())),
});
export type UgcHeader = v.InferOutput<typeof UgcHeaderSchema>;

export const UgcSchema = v.object({
  header: UgcHeaderSchema,
  encoding: v.optional(
    v.object({
      hasReplacementChars: v.boolean(),
    }),
  ),
});
export type Ugc = v.InferOutput<typeof UgcSchema>;
