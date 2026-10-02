import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/auth";
import { handleApiError } from "@/lib/parse-error";
import { MUTATION_KEYS } from "@/lib/query-keys.ts";

export function useUpdateProfile() {
  const { updateProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    mutationKey: [MUTATION_KEYS.updateProfile],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
    onError: handleApiError,
  });
}
