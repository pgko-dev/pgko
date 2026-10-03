import { useMutation } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import * as v from "valibot";

import { BundleRandomResponseSchema } from "@pgko.dev/schema";

import { apiClient } from "@/lib/api.ts";
import { setBundleReturnTo } from "@/lib/bundle-return";
import { handleApiError } from "@/lib/parse-error";
import { MUTATION_KEYS } from "@/lib/query-keys.ts";

export function useRandomBundle() {
  const navigate = useNavigate();
  const location = useLocation();

  // react-doctor-disable-next-line react-doctor/query-mutation-missing-invalidation
  return useMutation({
    mutationKey: [MUTATION_KEYS.randomBundle],
    mutationFn: async (exclude?: string) => {
      const response = await apiClient.get("/api/bundles/random", {
        params: exclude ? { exclude } : undefined,
      });
      return v.parse(BundleRandomResponseSchema, response.data);
    },
    onSuccess: (data) => {
      setBundleReturnTo(location.pathname);
      void navigate({ to: "/bundles/$bundleId", params: { bundleId: data.bundleId } });
    },
    onError: handleApiError,
  });
}
