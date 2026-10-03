import { createFileRoute, notFound } from "@tanstack/react-router";
import type { AxiosError } from "axios";
import { useMemo } from "react";

import { sortSongs } from "@pgko.dev/common";

import { BundleDetailContent, BundleDetailSkeleton } from "@/components/bundle";
import { bundlePublicQueryOptions, useBundlePublic } from "@/hooks/query/use-bundle-public";

export const Route = createFileRoute("/bundles/$bundleId/")({
  beforeLoad: async ({ params: { bundleId }, context }) => {
    try {
      await context.queryClient.query({
        ...bundlePublicQueryOptions(bundleId),
        staleTime: "static",
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      if ([404, 410].includes(axiosError?.response?.status ?? 0)) {
        throw notFound();
      }
      throw error;
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { bundleId } = Route.useParams();
  const { data, isPending } = useBundlePublic(bundleId);
  const songs = useMemo(() => sortSongs(data?.songs ?? []), [data?.songs]);

  if (isPending || !data) {
    return <BundleDetailSkeleton />;
  }

  return <BundleDetailContent data={data} bundleId={bundleId} songs={songs} />;
}
