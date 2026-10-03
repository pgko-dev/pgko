import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as v from "valibot";

import { BundleGetResponseSchema } from "@pgko.dev/schema";

import { apiClient } from "@/lib/api.ts";
import { handleApiError } from "@/lib/parse-error";
import { MUTATION_KEYS, QUERY_KEYS } from "@/lib/query-keys.ts";

export function useUploadCover(bundleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [MUTATION_KEYS.uploadCover, bundleId],
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("cover", file);
      const response = await apiClient.put(`/api/bundles/manage/${bundleId}/cover`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return v.parse(BundleGetResponseSchema, response.data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.bundlePrivate(bundleId), data);
    },
    onError: handleApiError,
  });
}

export function useDeleteCover(bundleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [MUTATION_KEYS.deleteCover, bundleId],
    mutationFn: async () => {
      const response = await apiClient.delete(`/api/bundles/manage/${bundleId}/cover`);
      return v.parse(BundleGetResponseSchema, response.data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.bundlePrivate(bundleId), data);
    },
    onError: handleApiError,
  });
}
