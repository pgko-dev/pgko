import * as Sentry from "@sentry/react";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode, useEffect } from "react";
import { CookiesProvider } from "react-cookie";
import ReactDOM from "react-dom/client";

import { Toaster } from "@/components/ui/sonner";

import { ErrorComponent } from "./components/error-component.tsx";
import { NotFound } from "./components/not-found.tsx";
import { AuthProvider, useAuth } from "./hooks/auth.tsx";
import * as TanStackQueryProvider from "./integrations/tanstack/query.ts";
import { ThemeProvider } from "./integrations/theme-provider.tsx";
import { initSentry, setSentryUser } from "./lib/sentry.ts";
import { routeTree } from "./routeTree.gen.ts";
import "./index.css";
import "./lib/i18n.ts";

const TanStackQueryProviderContext = TanStackQueryProvider.getContext();

const router = createRouter({
  routeTree,
  context: {
    ...TanStackQueryProviderContext,
    auth: undefined!,
  },
  defaultPreload: "intent",
  defaultPreloadDelay: 150,
  scrollRestoration: true,
  scrollRestorationBehavior: "instant",
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
  defaultNotFoundComponent: NotFound,
  defaultErrorComponent: ErrorComponent,
  defaultViewTransition: {
    types: (info) => (document.visibilityState === "visible" && info.pathChanged ? [] : false),
  },
});

initSentry(router);

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function InnerApp() {
  const auth = useAuth();

  useEffect(() => {
    setSentryUser(auth.user);
  }, [auth.user]);

  return <RouterProvider router={router} context={{ ...TanStackQueryProviderContext, auth }} />;
}

const rootElement = document.getElementById("root");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement, {
    onRecoverableError: Sentry.reactErrorHandler(),
    onUncaughtError: Sentry.reactErrorHandler(),
  });
  root.render(
    <StrictMode>
      <TanStackQueryProvider.Provider {...TanStackQueryProviderContext}>
        <ThemeProvider defaultTheme="dark" storageKey="site-ui-theme">
          <CookiesProvider>
            <AuthProvider>
              <InnerApp />
              <Toaster position="bottom-center" richColors />
            </AuthProvider>
          </CookiesProvider>
        </ThemeProvider>
      </TanStackQueryProvider.Provider>
    </StrictMode>,
  );
}
