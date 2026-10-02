import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import i18n from "i18next";
import { toast } from "sonner";

import { useAuth } from "@/hooks/auth";
import { handleApiError } from "@/lib/parse-error";
import { MUTATION_KEYS } from "@/lib/query-keys.ts";

export const useDeleteAccount = () => {
  const navigate = useNavigate();
  const { deleteAccount } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [MUTATION_KEYS.deleteAccount],
    mutationFn: deleteAccount,
    onSuccess: async () => {
      queryClient.clear();
      toast.info(i18n.t("ui.toast.accountDeleted"));
      await navigate({ to: "/login", search: { redirect: undefined } });
    },
    onError: handleApiError,
  });
};
