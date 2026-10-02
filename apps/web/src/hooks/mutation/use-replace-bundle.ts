import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18n from "i18next";
import { useRef } from "react";
import { toast } from "sonner";
import * as v from "valibot";

import type { ReplaceBundleBody } from "@pgko-dev/schema";
import { CommonSuccessSchema } from "@pgko-dev/schema";

import { apiClient } from "@/lib/api.ts";
import { handleApiError } from "@/lib/parse-error";
import { MUTATION_KEYS, QUERY_KEYS } from "@/lib/query-keys.ts";

type ReplaceVariables = ReplaceBundleBody;

export function useReplaceBundle(currentBundleId: string) {
  const queryClient = useQueryClient();
  const toastIdRef = useRef<string | number | undefined>(undefined);

  return useMutation({
    mutationKey: [MUTATION_KEYS.replaceBundle, currentBundleId],
    mutationFn: async (variables: ReplaceVariables) => {
      const response = await apiClient.put(
        `/api/bundles/manage/${currentBundleId}/replace`,
        variables,
      );
      return v.parse(CommonSuccessSchema, response.data);
    },
    onMutate: (_variables: ReplaceVariables) => {
      toastIdRef.current = toast.info(i18n.t("ui.uploadDetail.status.replacing"), {
        duration: Infinity,
        dismissible: false,
      });
    },
    onSuccess: (_, { tempBundleId }) => {
      if (toastIdRef.current !== undefined) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = undefined;
      }
      queryClient.removeQueries({ queryKey: QUERY_KEYS.bundlePrivate(tempBundleId) });
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bundlePrivate(currentBundleId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bundlePublic(currentBundleId) }),
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
