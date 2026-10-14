import { useDebouncedValue } from "@mantine/hooks";
import { useInfiniteQuery } from "@tanstack/react-query";
import * as v from "valibot";

import { BundleTagSuggestionsResponseSchema } from "@pgko.dev/schema";

import { apiClient } from "@/lib/api";
import { QUERY_KEYS } from "@/lib/query-keys";

export function useBundleTagSuggestions(input: string) {
  const term = input.trim().toLowerCase();
  const [query] = useDebouncedValue(term, 200);
  const result = useInfiniteQuery({
    queryKey: QUERY_KEYS.bundleTagSuggestions(query),
    initialPageParam: undefined as string | undefined,
    staleTime: 30_000,
    queryFn: async ({ pageParam, signal }) => {
      const response = await apiClient.get("/api/bundles/tag-suggestions", {
        params: { q: query, limit: 20, cursor: pageParam },
        signal,
      });
      return v.parse(BundleTagSuggestionsResponseSchema, response.data);
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });

  return {
    fetchNextPage: result.fetchNextPage,
    refetch: result.refetch,
    hasNextPage: result.hasNextPage,
    isFetching: result.isFetching,
    isError: result.isError,
    isFetchNextPageError: result.isFetchNextPageError,
    waiting: query !== term,
    items:
      query === term ? [...new Set(result.data?.pages.flatMap((page) => page.items) ?? [])] : [],
  };
}
