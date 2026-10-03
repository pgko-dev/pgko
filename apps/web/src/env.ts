import * as v from "valibot";

import type { ClientEnvironment } from "@pgko.dev/env/client";

export const isProduction = import.meta.env.PROD;

function parseSampleRate(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  const sampleRate = Number(value);
  return Number.isFinite(sampleRate) && sampleRate >= 0 && sampleRate <= 1 ? sampleRate : undefined;
}

const clientEnvironment: ClientEnvironment = {
  PUBLIC_BUILD_TIME: import.meta.env.PUBLIC_BUILD_TIME,
  PUBLIC_API_URL: import.meta.env.PUBLIC_API_URL,

  PUBLIC_COOKIE_DOMAIN: import.meta.env.PUBLIC_COOKIE_DOMAIN,
  PUBLIC_SENTRY_DSN: import.meta.env.PUBLIC_SENTRY_DSN,
  PUBLIC_SENTRY_TRACES_SAMPLE_RATE: parseSampleRate(
    import.meta.env.PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  ),
};

async function loadEnvironment(): Promise<ClientEnvironment> {
  if (isProduction) {
    return clientEnvironment;
  }

  const { ClientEnvironmentSchema } = await import("@pgko.dev/env/client");
  return v.parse(ClientEnvironmentSchema, clientEnvironment);
}

export const env = await loadEnvironment();
