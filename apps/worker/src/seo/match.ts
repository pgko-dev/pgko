import type { SeoMatch } from "./types";

const CRAWLER_USER_AGENT_PATTERN =
  /(Discordbot|Twitterbot|facebookexternalhit|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Googlebot)/i;

const BUNDLE_PATH_PATTERN = /^\/bundles\/([^/]+)(?:\/.*)?\/?$/;
const USER_PATH_PATTERN = /^\/users\/([^/]+)(?:\/.*)?\/?$/;

const BUNDLE_STATIC_SEGMENTS = new Set(["upload"]);
const USER_STATIC_SEGMENTS = new Set(["me"]);

function decodePathSegment(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function isCrawlerRequest(request: Request): boolean {
  return CRAWLER_USER_AGENT_PATTERN.test(request.headers.get("User-Agent") ?? "");
}

export function matchSeoRequest(request: Request, url: URL): SeoMatch | null {
  if (!isCrawlerRequest(request)) {
    return null;
  }

  const bundleMatch = BUNDLE_PATH_PATTERN.exec(url.pathname);
  if (bundleMatch?.[1]) {
    const id = decodePathSegment(bundleMatch[1]);
    if (!id || BUNDLE_STATIC_SEGMENTS.has(id)) {
      return null;
    }

    return {
      type: "bundle",
      id,
      canonicalUrl: `${url.origin}/bundles/${encodeURIComponent(id)}`,
    };
  }

  const userMatch = USER_PATH_PATTERN.exec(url.pathname);
  if (userMatch?.[1]) {
    const jointId = decodePathSegment(userMatch[1]);
    if (!jointId || USER_STATIC_SEGMENTS.has(jointId)) {
      return null;
    }

    return {
      type: "user",
      jointId,
      canonicalUrl: `${url.origin}/users/${encodeURIComponent(jointId)}`,
    };
  }

  return null;
}
