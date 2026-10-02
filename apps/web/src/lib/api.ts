import axios from "axios";

import { env } from "@/env.ts";

import { installCsrfInterceptors } from "./api-csrf";

export const apiClient = axios.create({
  baseURL: env.PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

installCsrfInterceptors(apiClient);

function resolveApiOrigin(raw: string | undefined): string | undefined {
  const s = raw?.trim();
  if (!s) return undefined;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) || s.startsWith("//") ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.origin;
  } catch {
    return undefined;
  }
}

export function getBundleDownloadUrl(bundleId: string): string {
  const path = `/api/download/bundles/${encodeURIComponent(bundleId)}/file`;
  const origin = resolveApiOrigin(env.PUBLIC_API_URL);
  if (origin) {
    return new URL(path, `${origin}/`).href;
  }
  return path;
}
