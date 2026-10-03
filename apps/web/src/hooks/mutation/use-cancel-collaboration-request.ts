import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as v from "valibot";

import { CommonSuccessSchema } from "@pgko.dev/schema";

import { apiClient } from "@/lib/api";
import { handleApiError } from "@/lib/parse-error";
import { MUTATION_KEYS, QUERY_KEYS } from "@/lib/query-keys";

export function useCancelCollaborationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [MUTATION_KEYS.cancelCollaborationRequest],
    mutationFn: async ({ bundleId, toUserId }: { bundleId: string; toUserId: string }) => {
      const response = await apiClient.delete(`/api/bundles/${bundleId}/collab/cancel`, {
        data: { toUserId },
      });
      return v.parse(CommonSuccessSchema, response.data);
    },
    onSuccess: (_data, { bundleId }) => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.bundleCollaborationRequests(bundleId),
        }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bundlePrivate(bundleId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bundlePublic(bundleId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bundleListAll, exact: false }),
      ]);
    },
    onError: handleApiError,
  });
}
