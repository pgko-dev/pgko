import { queryOptions, useQuery } from "@tanstack/react-query";
import * as v from "valibot";

import { BundleGetResponseSchema } from "@pgko.dev/schema";

import { apiClient } from "@/lib/api.ts";
import { QUERY_KEYS } from "@/lib/query-keys.ts";

export const bundlePrivateQueryOptions = (bundleId?: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.bundlePrivate(bundleId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    queryFn: async () => {
      const response = await apiClient.get(`/api/bundles/manage/${bundleId}`);
      return v.parse(BundleGetResponseSchema, response.data);
    },
    enabled: !!bundleId,
  });

export const useBundlePrivate = (bundleId?: string) => {
  return useQuery(bundlePrivateQueryOptions(bundleId));
};
