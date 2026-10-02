import * as v from "valibot";

const ProcessingRunnerStatusSchema = v.object({
  running: v.boolean(),
  busy: v.boolean(),
});

export const AdminStatusResponseSchema = v.object({
  timestamp: v.pipe(v.string(), v.isoTimestamp()),
  pid: v.number(),
  nodeEnv: v.string(),
  buildTime: v.nullable(v.string()),
  uptimeSeconds: v.number(),
  inFlightCount: v.number(),
  processingRunner: ProcessingRunnerStatusSchema,
});

export { AdminSetBundleVisibilityBodySchema, type AdminSetBundleVisibilityBody } from "./bundle.js";
