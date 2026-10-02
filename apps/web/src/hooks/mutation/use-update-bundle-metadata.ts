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

type UpdateBundleMetadataContext = {
  previous: BundleGetResponse | undefined;
};

export function useUpdateBundleMetadata(bundleId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    BundleGetResponse,
    unknown,
    UpdateBundleMetadataVariables,
    UpdateBundleMetadataContext
  >({
    mutationKey: [MUTATION_KEYS.updateBundleMetadata, bundleId],
    mutationFn: async (variables) => {
      const { suppressToast: _suppressToast, ...body } = variables;
      const response = await apiClient.put(`/api/bundles/manage/${bundleId}/metadata`, body);
      return v.parse(BundleGetResponseSchema, response.data);
    },
    onMutate: async (variables) => {
      const { suppressToast: _suppressToast, ...body } = variables;
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.bundlePrivate(bundleId) });
      const previous = queryClient.getQueryData<BundleGetResponse | undefined>(
        QUERY_KEYS.bundlePrivate(bundleId),
      );
      queryClient.setQueryData<BundleGetResponse>(QUERY_KEYS.bundlePrivate(bundleId), (old) =>
        old ? { ...old, ...body } : old,
      );
      return { previous };
    },
    onSuccess: (data, _variables) => {
      queryClient.setQueryData(QUERY_KEYS.bundlePrivate(bundleId), data);
    },
    onError: (_err, _body, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.bundlePrivate(bundleId), context.previous);
      }
      handleApiError(_err);
    },
  });
}
