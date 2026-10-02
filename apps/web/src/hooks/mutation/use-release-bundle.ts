import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18n from "i18next";
import { useRef } from "react";
import { toast } from "sonner";
import * as v from "valibot";

import { CommonSuccessSchema } from "@pgko-dev/schema";

import { apiClient } from "@/lib/api.ts";
import { handleApiError } from "@/lib/parse-error";
import { MUTATION_KEYS, QUERY_KEYS } from "@/lib/query-keys.ts";

export function useReleaseBundle(bundleId: string) {
  const queryClient = useQueryClient();
  const toastIdRef = useRef<string | number | undefined>(undefined);

  return useMutation({
    mutationKey: [MUTATION_KEYS.releaseBundle, bundleId],
    mutationFn: async () => {
      const response = await apiClient.put(`/api/bundles/manage/${bundleId}/release`, {});
      return v.parse(CommonSuccessSchema, response.data);
    },
    onMutate: (_variables) => {
      toastIdRef.current = toast.info(i18n.t("ui.uploadDetail.status.releasing"), {
        duration: Infinity,
        dismissible: false,
      });
    },
    onSuccess: () => {
      if (toastIdRef.current !== undefined) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = undefined;
      }
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bundlePrivate(bundleId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bundlePublic(bundleId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bundleListAll }),
      ]);
    },
    onError: (error) => {
      if (toastIdRef.current !== undefined) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = undefined;
      }
      handleApiError(error);
    },
  });
}
