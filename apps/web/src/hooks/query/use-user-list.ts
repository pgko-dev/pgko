import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import * as v from "valibot";

import type { UserListQuery } from "@pgko.dev/schema";
import { UserListResponseSchema } from "@pgko.dev/schema";

import { apiClient } from "@/lib/api.ts";
import { QUERY_KEYS } from "@/lib/query-keys.ts";

export const useUserList = (filters: Omit<UserListQuery, "cursor">) => {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.userList(filters),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2, // 2 minutes
    queryFn: async ({ pageParam, signal }) => {
      const params: Record<string, string> = {};
      if (filters.q) params.q = filters.q;
      if (filters.sort) params.sort = filters.sort;
      if (filters.order) params.order = filters.order;
      if (filters.limit != null) params.limit = String(filters.limit);
      if (pageParam) params.cursor = pageParam;

      const response = await apiClient.get("/api/user", { params, signal });
      return v.parse(UserListResponseSchema, response.data);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
};
