import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type MultipartUploadPhase, uploadMultipartBundle } from "@/lib/multipart-bundle-upload";
import { handleApiError } from "@/lib/parse-error";
import { MUTATION_KEYS, QUERY_KEYS } from "@/lib/query-keys.ts";

type UploadBundleVariables = {
  file: File;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
  onPhaseChange?: (phase: MultipartUploadPhase) => void;
};

export const useUploadBundle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [MUTATION_KEYS.uploadBundle],
    mutationFn: ({ file, signal, onProgress, onPhaseChange }: UploadBundleVariables) =>
      uploadMultipartBundle({
        file,
        kind: "upload",
        signal,
        onProgress,
        onPhaseChange,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.bundlePrivate(data.id), data);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bundleListAll });
    },
    onError: handleApiError,
  });
};
