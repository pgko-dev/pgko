import { type ParsedLocation, redirect } from "@tanstack/react-router";

import type { AuthState, AuthUser } from "@/hooks/auth";
import { isSafeRedirectPath } from "@/lib/safe-redirect";

/**
 * Ensures the request is authenticated. If not, redirects to login.
 * Returns the current user so callers can reuse it and avoid duplicate /api/auth/me requests.
 */
export async function ensureAuthenticated(
  context: {
    auth: AuthState;
  },
  location: ParsedLocation<any>,
): Promise<AuthUser> {
  const user = await context.auth.getUserOrRefresh();
  if (!user) {
    const target = location.href;
    throw redirect({
      to: "/login",
      search: {
        redirect: isSafeRedirectPath(target) ? target : undefined,
      },
    });
  }
  return user;
}
