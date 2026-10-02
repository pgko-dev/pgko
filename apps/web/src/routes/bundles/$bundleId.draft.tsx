import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import type { AxiosError } from "axios";

import type { BundleDetail } from "@pgko-dev/schema";

import { DraftContent } from "@/components/manage/draft-content";
import { bundlePrivateQueryOptions } from "@/hooks/query/use-bundle-private";
import { ensureAuthenticated } from "@/lib/ensure-auth";

import { BundleManageProvider } from "../../components/manage/use-bundle-manage";

export const Route = createFileRoute("/bundles/$bundleId/draft")({
  beforeLoad: async ({ params: { bundleId }, context, location }) => {
    await ensureAuthenticated(context, location);

    let bundle: BundleDetail | undefined;
    try {
      bundle = await context.queryClient.query({
        ...bundlePrivateQueryOptions(bundleId),
        staleTime: "static",
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      if ([404, 410].includes(axiosError?.response?.status ?? 0)) {
        throw notFound();
      }
      throw error;
    }

    if (bundle?.status === "released") {
      throw redirect({ to: "/bundles/$bundleId/manage", params: { bundleId } });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { bundleId } = Route.useParams();
  return (
    <BundleManageProvider bundleId={bundleId}>
      <DraftContent />
    </BundleManageProvider>
  );
}
