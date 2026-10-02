import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type MultipartUploadPhase, uploadMultipartBundle } from "@/lib/multipart-bundle-upload";
import { handleApiError } from "@/lib/parse-error";
import { MUTATION_KEYS, QUERY_KEYS } from "@/lib/query-keys.ts";

type ReuploadVariables = {
  file: File;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
  onPhaseChange?: (phase: MultipartUploadPhase) => void;
};

export function useReuploadBundle(bundleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [MUTATION_KEYS.reuploadBundle, bundleId],
    mutationFn: ({ file, signal, onProgress, onPhaseChange }: ReuploadVariables) =>
      uploadMultipartBundle({
        file,
        kind: "reupload",
        currentBundleId: bundleId,
        signal,
        onProgress,
        onPhaseChange,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.bundlePrivate(data.id), data);
    },
    onError: handleApiError,
  });
}
