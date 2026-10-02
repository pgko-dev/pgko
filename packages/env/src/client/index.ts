import * as v from "valibot";

import { envLooseString, envString } from "../common/index.js";

export const ClientEnvironmentSchema = v.object({
  PUBLIC_BUILD_TIME: envLooseString, // optional
  PUBLIC_API_URL: envString(v.optional(v.pipe(v.string(), v.url()))), // optional
  PUBLIC_COOKIE_DOMAIN: envLooseString, // optional
  PUBLIC_SENTRY_DSN: envString(v.optional(v.pipe(v.string(), v.url()))), // optional
  PUBLIC_SENTRY_TRACES_SAMPLE_RATE: envString(
    v.optional(
      v.pipe(v.union([v.string(), v.number()]), v.toNumber(), v.minValue(0), v.maxValue(1)),
    ),
  ), // optional
});

export type ClientEnvironment = v.InferOutput<typeof ClientEnvironmentSchema>;
