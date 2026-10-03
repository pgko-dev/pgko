import { queryOptions, useQuery } from "@tanstack/react-query";
import * as v from "valibot";

import { BundleStatsSchema } from "@pgko.dev/schema";

import { apiClient } from "@/lib/api.ts";
import { QUERY_KEYS } from "@/lib/query-keys.ts";

export const bundleStatsQueryOptions = (bundleId?: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.bundleStats(bundleId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryFn: async () => {
      const response = await apiClient.get(`/api/bundles/manage/${bundleId}/stats`);
      return v.parse(BundleStatsSchema, response.data);
    },
    enabled: !!bundleId,
  });

export const useBundleStats = (bundleId?: string) => {
  return useQuery(bundleStatsQueryOptions(bundleId));
};
