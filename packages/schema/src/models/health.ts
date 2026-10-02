import * as v from "valibot";

export const HealthResponseSchema = v.object({
  ok: v.boolean(),
  uptime: v.number(),
  services: v.object({
    database: v.boolean(),
    s3: v.boolean(),
    processingRunner: v.boolean(),
  }),
});
