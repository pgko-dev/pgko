import { useQuery } from "@tanstack/react-query";
import * as v from "valibot";

import { BundleCollaborationRequestsResponseSchema } from "@pgko-dev/schema";

import { apiClient } from "@/lib/api";
import { QUERY_KEYS } from "@/lib/query-keys";

export function useBundleCollaborationRequests(bundleId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.bundleCollaborationRequests(bundleId),
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/bundles/manage/${bundleId}/collaboration-requests`,
      );
      return v.parse(BundleCollaborationRequestsResponseSchema, response.data);
    },
    enabled: !!bundleId,
    staleTime: 1000 * 60, // 1 minute
  });
}
