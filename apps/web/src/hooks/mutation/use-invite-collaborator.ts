import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as v from "valibot";

import { InviteCollaboratorResponseSchema } from "@pgko.dev/schema";

import { apiClient } from "@/lib/api";
import { handleApiError } from "@/lib/parse-error";
import { MUTATION_KEYS, QUERY_KEYS } from "@/lib/query-keys";

export function useInviteCollaborator(bundleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [MUTATION_KEYS.inviteCollaborator, bundleId],
    mutationFn: async (jointId: string) => {
      const response = await apiClient.post(`/api/bundles/manage/${bundleId}/collaborators`, {
        jointId: jointId.trim(),
      });
      return v.parse(InviteCollaboratorResponseSchema, response.data);
    },
    onSuccess: () => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.bundleCollaborationRequests(bundleId),
        }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bundlePrivate(bundleId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bundlePublic(bundleId) }),
      ]);
    },
    onError: handleApiError,
  });
}
