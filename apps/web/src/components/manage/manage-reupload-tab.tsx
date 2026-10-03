import { useBlocker } from "@tanstack/react-router";
import { Check, DoorOpen, Loader2, Music2, X } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { sortSongs } from "@pgko.dev/common";
import type { BundleDetail } from "@pgko.dev/schema";

import { BundleArchiveUpload } from "@/components/bundle/bundle-archive-upload";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SongPanel } from "@/components/song-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MultipartUploadPhase } from "@/lib/multipart-bundle-upload";
import { validateBundleFile } from "@/lib/validate-bundle-upload";

import { BundleMetadataSection, FailedProcessResultsCard } from "./manage-metadata-tab";
import { useBundleManageContext } from "./use-bundle-manage";

export function ManageReuploadTab() {
  const { t } = useTranslation();
  const manage = useBundleManageContext();
  const {
    data,
    reuploadBundle,
    isReuploading,
    tempReplacement,
    setTempReplacement,
    confirmReplace,
    cancelReplace,
    isReplacing,
    handlePlayPreview,
    previewPlayingId,
    previewAudioRef,
    stopPreview,
  } = manage;
  const bundleId = data?.id ?? "";
  const [files, setFiles] = React.useState<File[]>([]);
  const uploadControllerRef = React.useRef<AbortController | null>(null);
  const [uploadPhase, setUploadPhase] = React.useState<MultipartUploadPhase | null>(null);

  const isTransferring = isReuploading && uploadPhase === "uploading";
  const isReuploadFlowActive = isTransferring || isReplacing || !!tempReplacement;

  const {
    status: navigationStatus,
    proceed: navigationProceed,
    reset: navigationReset,
  } = useBlocker({
    shouldBlockFn: () => isReuploadFlowActive,
    enableBeforeUnload: isReuploadFlowActive,
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

  const handleUploadSuccess = React.useCallback(
    (result: BundleDetail) => {
      setTempReplacement({ tempBundleId: result.id, tempBundle: result });
    },
    [setTempReplacement],
  );

  const onUpload = React.useCallback(
    async (
      filesToUpload: File[],
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
      if (!filesToUpload.length) return;
      const file = filesToUpload[0];

      const validation = validateBundleFile(file);
      if (!validation.valid) {
        onError(file, new Error(validation.messageKey));
        return;
      }

      const controller = new AbortController();
      uploadControllerRef.current = controller;
      try {
        const result = await reuploadBundle({
          file,
          signal: controller.signal,
          onProgress: (p) => onProgress(file, p),
          onPhaseChange: setUploadPhase,
        });
        onSuccess(file);
        setFiles([]);
        handleUploadSuccess(result);
      } catch (err) {
        onError(file, err as Error);
      } finally {
        uploadControllerRef.current = null;
        setUploadPhase(null);
      }
    },
    [reuploadBundle, handleUploadSuccess],
  );

  if (!bundleId) return null;

  if (tempReplacement) {
    const tempSongs = sortSongs(tempReplacement.tempBundle.songs ?? []);
    const tempFailedResults = (tempReplacement.tempBundle.results ?? []).filter(
      (r) => !r.ret.success,
    );

    return (
      <div className="mt-4 space-y-4">
        <Alert variant="default">
          <AlertTitle>{t("ui.uploadDetail.reupload.previewTitle")}</AlertTitle>
          <AlertDescription>
            <p>{t("ui.uploadDetail.reupload.previewDescription")}</p>
          </AlertDescription>
        </Alert>

        <FailedProcessResultsCard results={tempFailedResults} />

        <BundleMetadataSection />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music2 className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              {t("ui.bundlePage.songsSectionTitle", { count: tempSongs.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tempSongs.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {tempSongs.map((song) => (
                    <SongPanel
                      key={song.id}
                      song={song}
                      onPlayPreview={handlePlayPreview}
                      isPreviewPlaying={previewPlayingId === song.id}
                    />
                  ))}
                </div>
                <audio ref={previewAudioRef} onEnded={stopPreview} hidden>
                  <track kind="captions" />
                </audio>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("ui.uploadDetail.reupload.noSongs")}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="button" onClick={() => confirmReplace()} disabled={isReplacing}>
            {isReplacing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            <span className="ml-2">
              {isReplacing
                ? t("ui.uploadDetail.reupload.confirming")
                : t("ui.uploadDetail.reupload.confirm")}
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => cancelReplace()}
            disabled={isReplacing}
          >
            <X className="size-4" />
            <span className="ml-2">{t("ui.uploadDetail.reupload.cancel")}</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 space-y-4">
        <Card>
          <CardContent className="space-y-4">
            <BundleArchiveUpload
              files={files}
              isUploading={isReuploading}
              onValueChange={setFiles}
              onFileReject={onFileReject}
              onUpload={onUpload}
            />
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={navigationStatus === "blocked"}
        onOpenChange={(open) => {
          if (!open) {
            navigationReset?.();
          }
        }}
        description={t("ui.uploadDetail.actions.leaveConfirm")}
        tone="destructive"
        cancelLabel={t("ui.uploadDetail.actions.cancel")}
        confirmContent={
          <>
            <DoorOpen className="size-4" aria-hidden />
            <span className="ml-2">{t("ui.uploadDetail.actions.leave")}</span>
          </>
        }
        onConfirm={() => {
          if (isTransferring) uploadControllerRef.current?.abort();
          navigationProceed?.();
        }}
      />
    </>
  );
}
