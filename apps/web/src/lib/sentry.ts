import * as Sentry from "@sentry/react";

import { env, isProduction } from "@/env";

let isInitialized = false;

type TanStackRouter = Parameters<typeof Sentry.tanstackRouterBrowserTracingIntegration>[0];
type SentryIntegration = ReturnType<typeof Sentry.tanstackRouterBrowserTracingIntegration>;

const IGNORED_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
  /Loading chunk [\w-]+ failed/i,
  /ChunkLoadError/i,
];

function getClientErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "";
}

export function isIgnorableClientError(error: unknown): boolean {
  const message = getClientErrorMessage(error);
  return IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function initSentry(router: TanStackRouter) {
  if (isInitialized || !env.PUBLIC_SENTRY_DSN) {
    return;
  }

  const integrations: SentryIntegration[] = [Sentry.extraErrorDataIntegration({ depth: 5 })];

  const tracesSampleRate = env.PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0;
  if (tracesSampleRate > 0) {
    integrations.push(Sentry.tanstackRouterBrowserTracingIntegration(router));
  }

  const tracePropagationTargets: Array<string | RegExp> = [/^\//];
  if (env.PUBLIC_API_URL) {
    tracePropagationTargets.push(env.PUBLIC_API_URL);
  }

  Sentry.init({
    dsn: env.PUBLIC_SENTRY_DSN,
    attachStacktrace: true,
    enabled: true,
    environment: isProduction ? "production" : "development",
    ignoreErrors: IGNORED_ERROR_PATTERNS,
    integrations,
    initialScope: {
      tags: {
        service: "web",
      },
    },
    beforeSend(event: any, hint: any) {
      if (isIgnorableClientError(hint.originalException ?? event.message)) {
        return null;
      }
      return event;
    },
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      graphQL: { document: false, variables: false },
    },
    tracePropagationTargets,
    tracesSampleRate,
  });

  isInitialized = true;
}

export function setSentryUser(user: { id: string; role: string; slug: string } | null) {
  Sentry.setUser(user ? { id: user.id, username: user.slug } : null);
  Sentry.setTag("user_role", user?.role ?? "anonymous");
}
