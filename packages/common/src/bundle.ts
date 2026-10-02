export function isDraftLikeBundleStatus(status: string | undefined): boolean {
  return status === "draft" || status === "reupload";
}

/**
 * Sanitize a string for use as a download filename (strip invalid chars, normalize spaces).
 * Returns fallback if result would be empty.
 */
export function toSafeDownloadFilename(title: string, fallback: string): string {
  const sanitized = title
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const truncated = Array.from(sanitized).slice(0, 200).join("");
  return truncated || fallback;
}
