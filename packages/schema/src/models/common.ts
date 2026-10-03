import * as v from "valibot";

export const CommonSuccessSchema = v.object({ success: v.boolean() });
export type CommonSuccess = v.InferOutput<typeof CommonSuccessSchema>;

export const CommonErrorSchema = v.object({
  code: v.string(),
  message: v.string(),
  errors: v.optional(v.array(v.object({ path: v.string(), message: v.string() }))),
});
export type CommonError = v.InferOutput<typeof CommonErrorSchema>;
