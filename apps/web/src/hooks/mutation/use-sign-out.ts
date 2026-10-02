import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { useAuth } from "@/hooks/auth";
import { handleApiError } from "@/lib/parse-error";
import { MUTATION_KEYS } from "@/lib/query-keys.ts";

export function useSignOut() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [MUTATION_KEYS.signOut],
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key !== "bundle-public" && key !== "bundle-list";
        },
      });
      await queryClient.invalidateQueries();
      await navigate({ to: "/" });
    },
    onError: handleApiError,
  });
}
