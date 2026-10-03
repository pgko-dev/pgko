import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import { EnvironmentWatermark } from "@/components/environment-watermark.tsx";
import { Navbar } from "@/components/navbar/index.tsx";
import { PageTransitionProgress } from "@/components/page-transition-progress.tsx";
import { isProduction } from "@/env.ts";
import type { AuthState } from "@/hooks/auth.tsx";

import { Site } from "../components/site.tsx";

export interface MyRouterContext {
  queryClient: QueryClient;
  auth: AuthState;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RouteComponent,
});

const Devtools = isProduction
  ? () => null
  : (await import("../integrations/tanstack/devtools.tsx")).default;

function RouteComponent() {
  return (
    <>
      <Site>
        <Navbar />
        <PageTransitionProgress />
        <EnvironmentWatermark />
        <Site.Main>
          <Outlet />
        </Site.Main>
      </Site>
      <Devtools />
    </>
  );
}
