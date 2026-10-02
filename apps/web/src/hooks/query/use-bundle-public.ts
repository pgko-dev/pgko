import { queryOptions, useQuery } from "@tanstack/react-query";
import * as v from "valibot";

import { BundlePublicDetailSchema } from "@pgko-dev/schema";

import { apiClient } from "@/lib/api.ts";
import { QUERY_KEYS } from "@/lib/query-keys.ts";

export const bundlePublicQueryOptions = (bundleId?: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.bundlePublic(bundleId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryFn: async () => {
      const response = await apiClient.get(`/api/bundles/${bundleId}`);
      return v.parse(BundlePublicDetailSchema, response.data);
    },
    enabled: !!bundleId,
  });

export const useBundlePublic = (bundleId?: string) => {
  return useQuery(bundlePublicQueryOptions(bundleId));
};
