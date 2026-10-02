import { useMutation } from "@tanstack/react-query";
import * as v from "valibot";

import { UserSlugAvailableResponseSchema } from "@pgko-dev/schema";

import { apiClient } from "@/lib/api.ts";
import { MUTATION_KEYS } from "@/lib/query-keys.ts";

export type SlugStatus = "idle" | "checking" | "available" | "taken" | "unchanged" | "error";

export function useSlugCheck(originalSlug: string) {
  // react-doctor-disable-next-line react-doctor/query-mutation-missing-invalidation
  return useMutation({
    mutationKey: MUTATION_KEYS.slugAvailability(originalSlug),
    mutationFn: async (rawSlug: string): Promise<SlugStatus> => {
      const slug = rawSlug.trim();

      if (!slug) return "error";
      if (slug === originalSlug) return "unchanged";

      try {
        const response = await apiClient.get(`/api/user/${encodeURIComponent(slug)}/available`);
        const data = v.parse(UserSlugAvailableResponseSchema, response.data);
        return data.available ? "available" : "taken";
      } catch (error) {
        console.error(error);
        return "error";
      }
    },
  });
}
