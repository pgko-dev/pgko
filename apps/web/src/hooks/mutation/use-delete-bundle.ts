import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { apiClient } from "@/lib/api.ts";
import { clearBundleReturnTo, getBundleReturnTo } from "@/lib/bundle-return";
import { handleApiError } from "@/lib/parse-error";
import { MUTATION_KEYS, QUERY_KEYS } from "@/lib/query-keys.ts";

export function useDeleteBundle(bundleId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationKey: [MUTATION_KEYS.deleteBundle, bundleId],
    mutationFn: async () => {
      await apiClient.delete(`/api/bundles/manage/${bundleId}`);
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: QUERY_KEYS.bundlePrivate(bundleId) });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.bundlePublic(bundleId) });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.bundleListAll,
        refetchType: "none",
      });
      const returnTo = getBundleReturnTo();
      clearBundleReturnTo();
      if (returnTo) {
        await router.navigate({ to: returnTo, resetScroll: false });
      } else {
        await router.navigate({ to: "/users/$jointId", params: { jointId: "me" } });
      }
    },
    onError: handleApiError,
  });
}
