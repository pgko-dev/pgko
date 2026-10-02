import { useBlocker, useLocation, useNavigate } from "@tanstack/react-router";
import { FileIcon, Loader2, Upload } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { BundleRules } from "@pgko-dev/config";

import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/custom/file-upload";
import { Button } from "@/components/ui/button";
import { useUploadBundle } from "@/hooks/mutation/use-upload-bundle";
import { setBundleReturnTo } from "@/lib/bundle-return";
import { formatBytes } from "@/lib/format-bytes";
import type { MultipartUploadPhase } from "@/lib/multipart-bundle-upload";
import { validateBundleFile } from "@/lib/validate-bundle-upload";

import { NavigationConfirmDialog } from "./-navigation-confirm-dialog";

export function BundleUploadBox() {
  const [files, setFiles] = React.useState<File[]>([]);
  const { t } = useTranslation();
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
      <FileUpload
        disabled={isPending}
        value={files}
        onValueChange={setFiles}
        onFileReject={onFileReject}
        maxSize={BundleRules.file.maxFileBytes}
        accept={BundleRules.file.accept.join(",")}
        maxFiles={1}
        multiple={false}
        className="w-full"
        clearOnChange={true}
        onUpload={onUpload}
      >
        <FileUploadDropzone className="gap-0">
          <div className="flex flex-col items-center">
            <div className="mb-1 flex items-center justify-center rounded-full border p-2.5">
              <Upload className="size-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm font-medium">
                {t("ui.fileUpload.hint.dropHint", { extensions: "ZIP" })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("ui.fileUpload.hint.condition", {
                  size: formatBytes(BundleRules.file.maxFileBytes),
                })}
              </p>
            </div>
            <FileUploadTrigger
              render={
                <Button variant="outline" size="sm" className="mt-2 w-fit">
                  {t("ui.fileUpload.hint.browseFiles")}
                </Button>
              }
            />
          </div>
        </FileUploadDropzone>
        <FileUploadList>
          {files.map((file) => (
            <FileUploadItem key={`${file.name}-${file.size}-${file.lastModified}`} value={file}>
              {/* previewContent is called directly, rather than mounted as a component. */}
              <FileUploadItemPreview
                previewContent={() =>
                  isPending ? <Loader2 className="animate-spin" /> : <FileIcon />
                }
              />
              <FileUploadItemMetadata />
              <FileUploadItemProgress />
            </FileUploadItem>
          ))}
        </FileUploadList>
      </FileUpload>

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
