import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { createRoot } from "react-dom/client";

import { BundleList } from "../../src/components/bundle/bundle-list";

import { Harness } from "./harness";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const router = createRouter({
  routeTree: createRootRoute({
    component: () => (
      <QueryClientProvider client={client}>
        <Harness>
          <BundleList />
        </Harness>
      </QueryClientProvider>
    ),
  }),
  history: createMemoryHistory({ initialEntries: ["/"] }),
});

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
