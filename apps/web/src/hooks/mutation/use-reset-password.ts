import { useMutation } from "@tanstack/react-query";
import * as v from "valibot";

import { CommonSuccessSchema } from "@pgko-dev/schema";

import { apiClient } from "@/lib/api.ts";
import { handleApiError } from "@/lib/parse-error";
import { MUTATION_KEYS } from "@/lib/query-keys.ts";

export function useResetPassword() {
  // react-doctor-disable-next-line react-doctor/query-mutation-missing-invalidation
  return useMutation({
    mutationKey: [MUTATION_KEYS.resetPassword],
    mutationFn: async ({
      email,
      otp,
      password,
    }: {
      email: string;
      otp: string;
      password: string;
    }) => {
      const response = await apiClient.put("/api/auth/reset/password", {
        email,
        otp,
        password,
      });
      return v.parse(CommonSuccessSchema, response.data);
    },
    onError: handleApiError,
  });
}
