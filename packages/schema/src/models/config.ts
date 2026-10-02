import * as v from "valibot";

export const ConfigResponseSchema = v.object({
  branch: v.picklist(["production", "development", "test"]),
  version: v.optional(v.string()),
});
export type ConfigResponse = v.InferOutput<typeof ConfigResponseSchema>;
