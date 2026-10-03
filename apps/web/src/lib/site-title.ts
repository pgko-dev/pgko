import { SITE_NAME } from "@pgko.dev/config";

export function sitePageTitle(pageSegment: string): string {
  const s = pageSegment.trim();
  if (!s) return SITE_NAME;
  if (s === SITE_NAME) return SITE_NAME;
  return `${s} · ${SITE_NAME}`;
}
