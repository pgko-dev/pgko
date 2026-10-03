import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as v from "valibot";

import type { BundleGetResponse, BundleUpdateMetadataBody } from "@pgko-dev/schema";
import { BundleGetResponseSchema } from "@pgko-dev/schema";

import { apiClient } from "@/lib/api.ts";
import { handleApiError } from "@/lib/parse-error";
import { MUTATION_KEYS, QUERY_KEYS } from "@/lib/query-keys.ts";

type UpdateBundleMetadataVariables = BundleUpdateMetadataBody & {
  suppressToast?: boolean;
};

export function useUpdateBundleMetadata(bundleId: string) {
  const queryClient = useQueryClient();

  return useMutation<BundleGetResponse, unknown, UpdateBundleMetadataVariables>({
    mutationKey: [MUTATION_KEYS.updateBundleMetadata, bundleId],
    mutationFn: async (variables) => {
      const { suppressToast: _suppressToast, ...body } = variables;
      const response = await apiClient.patch(`/api/bundles/manage/${bundleId}/metadata`, body);
      return v.parse(BundleGetResponseSchema, response.data);
    },
    onSuccess: (data, _variables) => {
      queryClient.setQueryData(QUERY_KEYS.bundlePrivate(bundleId), data);
    },
    onError: (_err) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bundlePrivate(bundleId) });
      handleApiError(_err);
    },
  });
}
