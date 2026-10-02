/**
 * Returns true when `path` is a same-origin relative URL that is safe to
 * redirect to after login.  Rejects protocol-relative URLs (`//evil.com`),
 * absolute URLs with a scheme (`https://…`), and any other value that could
 * navigate the user off-site.
 */
export function isSafeRedirectPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}
