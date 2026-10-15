import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { BundleDetailContent } from "../../src/components/bundle/bundle-detail";
import { BundleList } from "../../src/components/bundle/bundle-list";
import { AuthProvider } from "../../src/hooks/auth";
import { validateBundleBeatmapSearch } from "../../src/lib/bundle-beatmap-search";
import { validateProfileBundleSearch } from "../../src/lib/bundle-list-search";
import { bundle, bundleId } from "../fixtures/bundle";

import { Harness } from "./harness";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const rootRoute = createRootRoute({
  component: () => (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Harness>
          <Outlet />
        </Harness>
      </AuthProvider>
    </QueryClientProvider>
  ),
});
const listRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/e2e/browser/bundle-filters.html",
  validateSearch: validateProfileBundleSearch,
  component: ListFixture,
});

function ListFixture() {
  return <BundleList draftsOnly={listRoute.useSearch().mode === "draft"} />;
}
const detailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/bundles/$bundleId",
  validateSearch: validateBundleBeatmapSearch,
  component: () => <BundleDetailContent data={bundle} bundleId={bundleId} songs={[]} />,
});
const router = createRouter({
  routeTree: rootRoute.addChildren([listRoute, detailRoute]),
  scrollRestoration: true,
  scrollRestorationBehavior: "instant",
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
