import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

import { Common } from "@pgko-dev/config";

function isSafeMethod(method: string | undefined): boolean {
  return ["GET", "HEAD", "OPTIONS"].includes(method?.toUpperCase() ?? "");
}

function getCsrfHeader(response: AxiosResponse): string | undefined {
  const header = response.headers[Common.CsrfToken];
  return typeof header === "string" && header.length ? header : undefined;
}

export function installCsrfInterceptors(client: AxiosInstance): void {
  let csrfToken: string | undefined;
  let csrfInitialization: Promise<void> | undefined;

  async function ensureCsrfToken(forceRefresh = false): Promise<void> {
    if (csrfToken && !forceRefresh && !csrfInitialization) {
      return;
    }

    csrfInitialization ??= client
      .get("/api/config", {
        headers: {
          "Cache-Control": "no-cache, no-store",
        },
      })
      .then((response) => {
        const token = getCsrfHeader(response);
        if (!token) {
          throw new Error("CSRF token was not initialized");
        }
        csrfToken = token;
      })
      .finally(() => {
        csrfInitialization = undefined;
      });

    await csrfInitialization;
  }

  client.interceptors.request.use(
    async (config) => {
      if (!isSafeMethod(config.method)) {
        await ensureCsrfToken();
        config.headers[Common.CsrfToken] = csrfToken!;
      }
      return config;
    },
    (error) => {
      throw error;
    },
  );

  client.interceptors.response.use(
    (response) => {
      csrfToken = getCsrfHeader(response) ?? csrfToken;
      return response;
    },
    async (error: unknown) => {
      if (!axios.isAxiosError<{ message?: string }>(error)) throw error;

      const response = error.response;
      const request = error.config as
        | (InternalAxiosRequestConfig & { csrfRetried?: boolean })
        | undefined;
      const replacementToken = response && getCsrfHeader(response);
      if (replacementToken) csrfToken = replacementToken;

      // The CSRF guard rejects before the route runs, so only this error is safe to replay.
      // Bound retries in case the browser cannot store/send the CSRF cookie.
      if (
        response?.status === 403 &&
        response.data?.message === "api.error.auth.csrfInvalid" &&
        request &&
        !isSafeMethod(request.method) &&
        !request.csrfRetried &&
        replacementToken
      ) {
        request.csrfRetried = true;
        // A response from another request/tab may have replaced the cookie since
        // this 403 was generated. Read its current token before the single retry.
        try {
          await ensureCsrfToken(true);
        } catch {
          throw error;
        }
        return client.request(request);
      }

      throw error;
    },
  );
}
