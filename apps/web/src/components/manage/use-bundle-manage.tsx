import { useBlocker, useNavigate } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import type { ReactNode } from "react";
import { createContext, useCallback, use, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { sortSongs } from "@pgko-dev/common";
import type { BundleDetail, BundleUpdateMetadataBody, BundleVisibility } from "@pgko-dev/schema";
import {
  tBundleArtistSchema,
  tBundleDescriptionSchema,
  tBundleTagsSchema,
  tBundleTitleSchema,
  tBundleVideoUrlSchema,
} from "@pgko-dev/schema";

import { useDeleteBundle } from "@/hooks/mutation/use-delete-bundle";
import { useReleaseBundle } from "@/hooks/mutation/use-release-bundle";
import { useReplaceBundle } from "@/hooks/mutation/use-replace-bundle";
import { useReuploadBundle } from "@/hooks/mutation/use-reupload-bundle";
import { useUpdateBundleMetadata } from "@/hooks/mutation/use-update-bundle-metadata";
import { useDeleteCover, useUploadCover } from "@/hooks/mutation/use-upload-cover";
import { useBundlePrivate } from "@/hooks/query/use-bundle-private";
import { usePreviewAudio } from "@/hooks/use-preview-audio";
import { useContentForm } from "@/integrations/form/content-form.ts";

type BundleMetadataFormValues = {
  title: string;
  artist: string;
  description: string;
  tags: string[];
  videoUrl: string;
  visibility: BundleVisibility;
  videoUrlBySongId: Record<string, string>;
};

/** Value provided by BundleManageProvider. Use via useBundleManageContext() in children. */
export type BundleManageValue = ReturnType<typeof useBundleManage>;

const BundleManageContext = createContext<BundleManageValue | null>(null);

export function BundleManageProvider({
  bundleId,
  children,
}: Readonly<{ bundleId: string; children: ReactNode }>) {
  const value = useBundleManage(bundleId);
  return <BundleManageContext value={value}>{children}</BundleManageContext>;
}

/** Use bundle manage state and actions. Must be used within BundleManageProvider. */
export function useBundleManageContext(): BundleManageValue {
  const ctx = use(BundleManageContext);
  if (!ctx) {
    throw new Error("useBundleManageContext must be used within BundleManageProvider");
  }
  return ctx;
}

function useBundleManage(bundleId: string) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isPending: isLoading } = useBundlePrivate(bundleId);
  const { mutateAsync: saveMetadata, isPending: isSaving } = useUpdateBundleMetadata(bundleId);
  const { mutateAsync: releaseBundle, isPending: isReleasing } = useReleaseBundle(bundleId);
  const { mutate: deleteBundle, isPending: isDeleting } = useDeleteBundle(bundleId);
  const { mutateAsync: reuploadBundle, isPending: isReuploading } = useReuploadBundle(bundleId);
  const { mutateAsync: replaceBundle, isPending: isReplacing } = useReplaceBundle(bundleId);
  const { mutate: uploadCover, isPending: isUploadingCover } = useUploadCover(bundleId);
  const [tempReplacement, setTempReplacement] = useState<{
    tempBundleId: string;
    tempBundle: BundleDetail;
  } | null>(null);
  const { mutate: removeCover, isPending: isRemovingCover } = useDeleteCover(bundleId);

  const initial = useMemo<BundleMetadataFormValues>(
    () => ({
      title: data?.title ?? "",
      artist: data?.artist ?? "",
      description: data?.description ?? "",
      tags: (data?.tags ?? []) as string[],
      videoUrl: data?.videoUrl ?? "",
      visibility: data?.visibility ?? "public",
      videoUrlBySongId: (data?.songs ?? []).reduce<Record<string, string>>((acc, s) => {
        acc[s.id] = s.videoUrl ?? "";
        return acc;
      }, {}),
    }),
    [data],
  );

  const schemas = useMemo(
    () => ({
      title: tBundleTitleSchema(t),
      artist: tBundleArtistSchema(t),
      description: tBundleDescriptionSchema(t),
      tags: tBundleTagsSchema(t),
      videoUrl: tBundleVideoUrlSchema(t),
    }),
    [t],
  );

  const isReleased = data?.status === "released";

  const buildBaseMetadataPayload = useCallback(
    (value: BundleMetadataFormValues): BundleUpdateMetadataBody => {
      if (!data) throw new Error("Managed bundle detail must be loaded before editing");
      const videoUrlMappings: Record<string, string> = {};
      for (const [songId, url] of Object.entries(value.videoUrlBySongId)) {
        videoUrlMappings[songId] = url.trim();
      }

      const representativeVideoUrl = value.videoUrl.trim();

      return {
        expectedResourceVersion: data.resourceVersion,
        title: value.title.trim() || undefined,
        artist: value.artist.trim() || undefined,
        description: value.description.trim(),
        tags: value.tags,
        videoUrl: representativeVideoUrl || undefined,
        visibility: data?.visibilityLocked ? undefined : value.visibility,
        videoUrlMappings: Object.keys(videoUrlMappings).length ? videoUrlMappings : undefined,
      };
    },
    [data],
  );

  const form = useContentForm({
    defaultValues: initial,
    onSubmit: async ({ value }) => {
      const metadataPayload = buildBaseMetadataPayload(value);
      if (isReleased) {
        await saveMetadata(metadataPayload);
        form.reset(value);
        return;
      }

      if (!isDefaultValue) {
        await saveMetadata({ ...metadataPayload, suppressToast: true });
        form.reset(value);
      }
      await releaseBundle();
      allowNavigationRef.current = true;
      await navigate({ to: "/bundles/$bundleId/manage", params: { bundleId } });
    },
    onSubmitInvalid: (api) => {
      console.error(api.formApi.getAllErrors());
    },
  });

  useEffect(() => {
    form.reset(initial);
  }, [initial, form]);

  const isDefaultValue = useSelector(form.store, (state) => state.isDefaultValue);
  const formTitle = useSelector(form.store, (state) => state.values.title);
  const formArtist = useSelector(form.store, (state) => state.values.artist);
  const videoUrlBySongId = useSelector(form.store, (state) => state.values.videoUrlBySongId);
  const formValues = useSelector(form.store, (state) => state.values);

  const allowNavigationRef = useRef(false);

  const {
    status: navigationBlockerStatus,
    proceed: rawNavigationBlockerProceed,
    reset: rawNavigationBlockerReset,
  } = useBlocker({
    shouldBlockFn: () => {
      if (allowNavigationRef.current) {
        allowNavigationRef.current = false;
        return false;
      }
      if (!isDefaultValue) return true;
      if (!isReleased) return true;
      return false;
    },
    enableBeforeUnload: !isDefaultValue || !isReleased,
    withResolver: true,
  });

  const navigationBlockerProceed = rawNavigationBlockerProceed ?? (() => {});
  const navigationBlockerReset = rawNavigationBlockerReset ?? (() => {});

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogMode, setDeleteDialogMode] = useState<"delete" | "discard">("delete");

  const openDeleteDialog = useCallback((mode: "delete" | "discard") => {
    setDeleteDialogMode(mode);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setDeleteDialogOpen(false);
    allowNavigationRef.current = true;
    deleteBundle();
  }, [deleteBundle]);

  const handleDelete = useCallback(() => openDeleteDialog("delete"), [openDeleteDialog]);
  const handleDiscard = useCallback(() => openDeleteDialog("discard"), [openDeleteDialog]);

  const confirmReplace = useCallback(async () => {
    if (!tempReplacement) return;
    const metadataPayload = buildBaseMetadataPayload(formValues as BundleMetadataFormValues);
    await replaceBundle({ tempBundleId: tempReplacement.tempBundleId, ...metadataPayload });
    setTempReplacement(null);
  }, [buildBaseMetadataPayload, formValues, replaceBundle, tempReplacement]);

  const cancelReplace = useCallback(() => {
    setTempReplacement(null);
  }, []);

  const handleCoverRemove = useCallback(() => {
    removeCover();
  }, [removeCover]);

  const {
    audioRef: previewAudioRef,
    playingId: previewPlayingId,
    setPlayingId: setPreviewPlayingId,
    playPreview: handlePlayPreview,
    stopPreview,
  } = usePreviewAudio();

  const songs = useMemo(() => sortSongs(data?.songs ?? []), [data?.songs]);
  const failedProcessResults = useMemo(
    () => (data?.results ?? []).filter((r) => !r.ret.success),
    [data?.results],
  );

  const displayTitle =
    data && ((typeof formTitle === "string" && formTitle.trim()) || data.title || "");
  const displayArtist =
    data && ((typeof formArtist === "string" && formArtist.trim()) || (data.artist ?? ""));

  return {
    bundleId,
    data,
    isLoading,
    form,
    schemas,
    isSaving,
    isReleasing,
    isDeleting,
    isReuploading,
    reuploadBundle,
    tempReplacement,
    setTempReplacement,
    confirmReplace,
    cancelReplace,
    isReplacing,
    isUploadingCover,
    isRemovingCover,
    isDefaultValue,
    isReleased,
    songs,
    failedProcessResults,
    displayTitle: displayTitle ?? "",
    displayArtist: displayArtist ?? "",
    uploadCover,
    handleCoverRemove,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteDialogMode,
    handleDeleteConfirm,
    handleDelete,
    handleDiscard,
    previewAudioRef,
    previewPlayingId,
    setPreviewPlayingId,
    handlePlayPreview,
    stopPreview,
    videoUrlBySongId,
    navigationBlockerStatus,
    navigationBlockerProceed,
    navigationBlockerReset,
  };
}
