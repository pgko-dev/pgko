import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as v from "valibot";

import { CommonSuccessSchema } from "@pgko-dev/schema";

import { apiClient } from "@/lib/api";
import { handleApiError } from "@/lib/parse-error";
import { MUTATION_KEYS, QUERY_KEYS } from "@/lib/query-keys";

export function useLeaveCollaboration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [MUTATION_KEYS.leaveCollaboration],
    mutationFn: async (bundleId: string) => {
      const response = await apiClient.post(`/api/bundles/${bundleId}/collab/leave`);
      return v.parse(CommonSuccessSchema, response.data);
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bundleListAll, exact: false });
    },
    onError: handleApiError,
  });
}
