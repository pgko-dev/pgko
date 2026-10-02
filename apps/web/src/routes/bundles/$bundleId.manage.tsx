import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import type { AxiosError } from "axios";

import type { BundleDetail } from "@pgko-dev/schema";

import { ManageContent } from "@/components/manage/manage-content";
import { bundlePrivateQueryOptions } from "@/hooks/query/use-bundle-private";
import { bundleStatsQueryOptions } from "@/hooks/query/use-bundle-stats";
import { ensureAuthenticated } from "@/lib/ensure-auth";

import { BundleManageProvider } from "../../components/manage/use-bundle-manage";

export const Route = createFileRoute("/bundles/$bundleId/manage")({
  beforeLoad: async ({ params: { bundleId }, context, location }) => {
    await ensureAuthenticated(context, location);

    let bundle: BundleDetail | undefined;
    try {
      const bundlePromise = context.queryClient.query({
        ...bundlePrivateQueryOptions(bundleId),
        staleTime: "static",
      });
      context.queryClient.query(bundleStatsQueryOptions(bundleId)).catch(() => undefined);
      bundle = await bundlePromise;
    } catch (error) {
      const axiosError = error as AxiosError;
      if ([404, 410].includes(axiosError?.response?.status ?? 0)) {
        throw notFound();
      }
      throw redirect({ to: "/bundles/$bundleId", params: { bundleId } });
    }

    if (bundle?.status !== "released") {
      throw redirect({ to: "/bundles/$bundleId/draft", params: { bundleId } });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { bundleId } = Route.useParams();
  return (
    <BundleManageProvider bundleId={bundleId}>
      <ManageContent />
    </BundleManageProvider>
  );
}
