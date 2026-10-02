import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import * as v from "valibot";

import type { BundleListQuery, BundleListResponse } from "@pgko-dev/schema";
import { BundleListResponseSchema } from "@pgko-dev/schema";

import { apiClient } from "@/lib/api.ts";
import { QUERY_KEYS } from "@/lib/query-keys.ts";

export const useBundleList = (filters: BundleListQuery, options?: { enabled?: boolean }) => {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.bundleList(filters),
    placeholderData: (
      previousData: InfiniteData<BundleListResponse, string | undefined> | undefined,
      previousQuery,
    ) => {
      const previousFilters = previousQuery?.queryKey[1] as BundleListQuery | undefined;
      const sameScope =
        previousFilters?.userId === filters.userId &&
        previousFilters?.limit === filters.limit &&
        previousFilters?.draftsOnly === filters.draftsOnly &&
        previousFilters?.collaborationsOnly === filters.collaborationsOnly &&
        previousFilters?.collaborationStatus === filters.collaborationStatus;
      return sameScope ? previousData : undefined;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: options?.enabled !== false,
    queryFn: async ({ pageParam, signal }) => {
      const params: Record<string, string> = {};
      if (filters.q) params.q = filters.q;
      if (filters.userId) params.userId = filters.userId;
      if (filters.sort) params.sort = filters.sort;
      if (filters.order) params.order = filters.order;
      if (pageParam) params.cursor = pageParam;
      if (filters.draftsOnly === true) params.draftsOnly = "true";
      if (filters.collaborationsOnly === true) params.collaborationsOnly = "true";
      if (filters.limit != null) params.limit = String(filters.limit);
      if (filters.collaborationStatus) params.collaborationStatus = filters.collaborationStatus;

      const response = await apiClient.get("/api/bundles", { params, signal });
      return v.parse(BundleListResponseSchema, response.data);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
};
