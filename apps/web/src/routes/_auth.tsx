import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { isSafeRedirectPath } from "@/lib/safe-redirect";

export const Route = createFileRoute("/_auth")({
  validateSearch: (search) => {
    const raw = typeof search.redirect === "string" ? search.redirect : undefined;
    return { redirect: raw && isSafeRedirectPath(raw) ? raw : undefined };
  },
  beforeLoad: async ({ context, search }) => {
    const isAuthenticated = await context.auth.isAuthenticated();
    if (isAuthenticated) {
      throw redirect({ to: search.redirect ?? "/" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex items-center justify-center px-0 sm:px-4">
      <Outlet />
    </div>
  );
}
