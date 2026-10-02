import { useBlocker, useLocation, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";

import { BundleArchiveUpload } from "@/components/bundle/bundle-archive-upload";
import { useUploadBundle } from "@/hooks/mutation/use-upload-bundle";
import { setBundleReturnTo } from "@/lib/bundle-return";
import type { MultipartUploadPhase } from "@/lib/multipart-bundle-upload";
import { validateBundleFile } from "@/lib/validate-bundle-upload";

import { NavigationConfirmDialog } from "./-navigation-confirm-dialog";

export function BundleUploadBox() {
  const [files, setFiles] = React.useState<File[]>([]);
  const { mutateAsync, isPending } = useUploadBundle();
  const location = useLocation();
  const navigate = useNavigate();
  const allowNavigationRef = React.useRef(false);
  const routeMountedRef = React.useRef(false);
  const uploadControllerRef = React.useRef<AbortController | null>(null);
  const [uploadPhase, setUploadPhase] = React.useState<MultipartUploadPhase | null>(null);
  const isTransferring = isPending && uploadPhase === "uploading";

  React.useEffect(() => {
    routeMountedRef.current = true;
    return () => {
      routeMountedRef.current = false;
    };
  }, []);

  const {
    status: navigationStatus,
    proceed: navigationProceed,
    reset: navigationReset,
  } = useBlocker({
    shouldBlockFn: () => {
      if (allowNavigationRef.current) {
        allowNavigationRef.current = false;
        return false;
      }
      return isTransferring;
    },
    enableBeforeUnload: isTransferring,
    withResolver: true,
  });

  const onFileReject = React.useCallback((files: File[], message: string) => {
    if (files.length > 1 || files.length === 0) {
      toast.error(message);
      return;
    }

    const file = files[0];
    const displayName = file.name.length > 40 ? `${file.name.slice(0, 40)}...` : file.name;
    toast.error(displayName, {
      description: message,
    });
  }, []);

  const onUpload = React.useCallback(
    async (
      files: File[],
      {
        onProgress,
        onSuccess,
        onError,
      }: {
        onProgress: (file: File, p: number) => void;
        onSuccess: (file: File) => void;
        onError: (file: File, err: Error) => void;
      },
    ) => {
      if (!files.length) return;
      const file = files[0];

      const result = validateBundleFile(file);
      if (!result.valid) {
        onError(file, new Error(result.messageKey));
        return;
      }

      const controller = new AbortController();
      uploadControllerRef.current = controller;

      try {
        const data = await mutateAsync({
          file,
          signal: controller.signal,
          onProgress: (p) => onProgress(file, p),
          onPhaseChange: setUploadPhase,
        });
        if (!routeMountedRef.current) return;
        onSuccess(file);
        setBundleReturnTo(location.pathname);
        allowNavigationRef.current = true;
        await navigate({ to: "/bundles/$bundleId/draft", params: { bundleId: data.id } });
      } catch (err) {
        if (routeMountedRef.current) onError(file, err as Error);
      } finally {
        uploadControllerRef.current = null;
        if (routeMountedRef.current) setUploadPhase(null);
      }
    },
    [mutateAsync, location.pathname, navigate],
  );

  return (
    <>
      <BundleArchiveUpload
        files={files}
        isUploading={isPending}
        onValueChange={setFiles}
        onFileReject={onFileReject}
        onUpload={onUpload}
      />

      <NavigationConfirmDialog
        open={navigationStatus === "blocked"}
        onConfirm={() => {
          uploadControllerRef.current?.abort();
          navigationProceed?.();
        }}
        onCancel={navigationReset}
      />
    </>
  );
}
