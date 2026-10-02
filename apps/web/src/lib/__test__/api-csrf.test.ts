/// <reference types="bun" />

import { describe, expect, it } from "bun:test";

import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

import { Common } from "@pgko-dev/config";

import { installCsrfInterceptors } from "../api-csrf";

function response(
  config: InternalAxiosRequestConfig,
  token?: string,
  status = 200,
  message?: string,
): AxiosResponse {
  return {
    config,
    status,
    statusText: String(status),
    headers: new AxiosHeaders(token ? { [Common.CsrfToken]: token } : {}),
    data: { message },
  };
}

describe("API CSRF recovery", () => {
  it("resynchronizes when a late response changes the cookie before the CSRF rejection arrives", async () => {
    let reads = 0;
    let browserCookie = "initial-token";
    const tokens: unknown[] = [];
    let writes = 0;
    const client = axios.create({
      adapter: async (config) => {
        if (config.method === "get") {
          reads++;
          return response(config, browserCookie);
        }
        tokens.push(config.headers[Common.CsrfToken]);
        if (tokens.length === 1) {
          // The rejection describes an earlier cookie. Another in-flight response
          // reaches the browser and stores a new cookie before Axios sees the 403.
          browserCookie = "latest-browser-cookie";
          throw new AxiosError(
            "Forbidden",
            "ERR_BAD_REQUEST",
            config,
            undefined,
            response(config, "superseded-replacement", 403, "api.error.auth.csrfInvalid"),
          );
        }
        if (config.headers[Common.CsrfToken] !== browserCookie) {
          throw new AxiosError(
            "Forbidden",
            "ERR_BAD_REQUEST",
            config,
            undefined,
            response(config, browserCookie, 403, "api.error.auth.csrfInvalid"),
          );
        }
        writes++;
        return response(config, browserCookie);
      },
    });
    installCsrfInterceptors(client);

    await client.post("/api/example", { value: 42 });

    expect(tokens).toEqual(["initial-token", "latest-browser-cookie"]);
    expect(reads).toBe(2);
    expect(writes).toBe(1);
  });

  it("replays a rejected mutation with the replacement token and preserves its body", async () => {
    const tokens: unknown[] = [];
    const bodies: unknown[] = [];
    const client = axios.create({
      adapter: async (config) => {
        if (config.method === "get") {
          return response(config, tokens.length ? "fresh-token" : "stale-token");
        }
        tokens.push(config.headers[Common.CsrfToken]);
        bodies.push(config.data);
        if (tokens.length === 1) {
          throw new AxiosError(
            "Forbidden",
            "ERR_BAD_REQUEST",
            config,
            undefined,
            response(config, "fresh-token", 403, "api.error.auth.csrfInvalid"),
          );
        }
        return response(config, "fresh-token");
      },
    });
    installCsrfInterceptors(client);

    await client.post("/api/example", { value: 42 });

    expect(tokens).toEqual(["stale-token", "fresh-token"]);
    expect(bodies).toEqual(['{"value":42}', '{"value":42}']);
  });

  it("stops after one retry when the cookie remains unavailable", async () => {
    let mutations = 0;
    const client = axios.create({
      adapter: async (config) => {
        if (config.method === "get") return response(config, "initial-token");
        mutations++;
        throw new AxiosError(
          "Forbidden",
          "ERR_BAD_REQUEST",
          config,
          undefined,
          response(config, `token-${mutations}`, 403, "api.error.auth.csrfInvalid"),
        );
      },
    });
    installCsrfInterceptors(client);

    await expect(client.post("/api/example")).rejects.toThrow("Forbidden");
    expect(mutations).toBe(2);
  });

  for (const [status, message, token] of [
    [403, "api.error.auth.forbidden", "new-token"],
    [500, "api.error.auth.csrfInvalid", "new-token"],
    [403, "api.error.auth.csrfInvalid", undefined],
  ] as const) {
    it(`does not replay status ${status}, message ${message}, token ${token}`, async () => {
      let mutations = 0;
      const client = axios.create({
        adapter: async (config) => {
          if (config.method === "get") return response(config, "initial-token");
          mutations++;
          throw new AxiosError(
            "Rejected",
            "ERR_BAD_REQUEST",
            config,
            undefined,
            response(config, token, status, message),
          );
        },
      });
      installCsrfInterceptors(client);

      await expect(client.post("/api/example")).rejects.toThrow("Rejected");
      expect(mutations).toBe(1);
    });
  }

  it("shares initialization across concurrent mutations", async () => {
    let reads = 0;
    const tokens: unknown[] = [];
    const client = axios.create({
      adapter: async (config) => {
        if (config.method === "get") {
          reads++;
          return response(config, "shared-token");
        }
        tokens.push(config.headers[Common.CsrfToken]);
        return response(config, "shared-token");
      },
    });
    installCsrfInterceptors(client);

    await Promise.all([client.post("/api/first"), client.post("/api/second")]);
    expect(reads).toBe(1);
    expect(tokens).toEqual(["shared-token", "shared-token"]);
  });

  it("shares a fresh cookie lookup across concurrent CSRF rejections", async () => {
    let reads = 0;
    let writes = 0;
    const refreshing = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const client = axios.create({
      adapter: async (config) => {
        if (config.method === "get") {
          reads++;
          if (reads === 1) return response(config, "initial-token");
          expect(config.headers["Cache-Control"]).toBe("no-cache, no-store");
          refreshing.resolve();
          await release.promise;
          return response(config, "current-cookie");
        }
        if (config.headers[Common.CsrfToken] !== "current-cookie") {
          throw new AxiosError(
            "Forbidden",
            "ERR_BAD_REQUEST",
            config,
            undefined,
            response(config, "old-replacement", 403, "api.error.auth.csrfInvalid"),
          );
        }
        writes++;
        return response(config, "current-cookie");
      },
    });
    installCsrfInterceptors(client);

    const requests = Promise.all([client.post("/api/first"), client.post("/api/second")]);
    await refreshing.promise;
    release.resolve();
    await requests;

    expect(reads).toBe(2);
    expect(writes).toBe(2);
  });

  for (const refreshFails of [false, true]) {
    it(`does not retry if the refresh ${refreshFails ? "fails" : "omits the token"}`, async () => {
      let reads = 0;
      let mutations = 0;
      const client = axios.create({
        adapter: async (config) => {
          if (config.method === "get") {
            if (++reads === 1) return response(config, "initial-token");
            if (refreshFails) throw new Error("Refresh unavailable");
            return response(config);
          }
          mutations++;
          throw new AxiosError(
            "Original CSRF rejection",
            "ERR_BAD_REQUEST",
            config,
            undefined,
            response(config, "old-replacement", 403, "api.error.auth.csrfInvalid"),
          );
        },
      });
      installCsrfInterceptors(client);

      await expect(client.post("/api/example")).rejects.toThrow("Original CSRF rejection");
      expect(reads).toBe(2);
      expect(mutations).toBe(1);
    });
  }
});
