import { createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { useState } from "react";
import { createRoot } from "react-dom/client";

import { BundleDetailContent } from "../../src/components/bundle/bundle-detail";
import { Site } from "../../src/components/site";
import { Button } from "../../src/components/ui/button";
import { AuthProvider } from "../../src/hooks/auth";
import { ThemeProvider } from "../../src/integrations/theme-provider";
import { validateBundleBeatmapSearch } from "../../src/lib/bundle-beatmap-search";
import { bundle, bundleId, songs } from "../fixtures/bundle";

import "./harness";
import "./observe-audio";

function Fixture() {
  const [revision, setRevision] = useState(1);
  return (
    <ThemeProvider defaultTheme="dark" storageKey="preview-test-theme">
      <AuthProvider>
        <Site>
          <header className="flex h-16 items-center justify-between border-b px-6">
            <span className="font-bold">pgko.dev</span>
            <Button variant="outline" onClick={() => setRevision((value) => value + 1)}>
              Change revision
            </Button>
          </header>
          <Site.Main>
            <BundleDetailContent data={{ ...bundle, revision }} bundleId={bundleId} songs={songs} />
          </Site.Main>
        </Site>
      </AuthProvider>
    </ThemeProvider>
  );
}

const rootRoute = createRootRoute();
const detailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/e2e/browser/bundle-page.html",
  component: Fixture,
  validateSearch: validateBundleBeatmapSearch,
});
const router = createRouter({
  routeTree: rootRoute.addChildren([detailRoute]),
});
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
