import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";

import { useAuth } from "@/hooks/auth";
import { handleApiError } from "@/lib/parse-error";
import { MUTATION_KEYS } from "@/lib/query-keys";

export function useSignIn() {
  const authSearch = useSearch({ from: "/_auth" });
  const navigate = useNavigate();
  const { login } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [MUTATION_KEYS.signIn],
    mutationFn: login,
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      await navigate({ to: authSearch.redirect ?? "/" });
    },
    onError: handleApiError,
  });
}
