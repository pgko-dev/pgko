import { Link, useRouter } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarArrowUp,
  CalendarCheck2,
  Download,
  FileChartColumn,
  FileEdit,
  FileText,
  Music2,
} from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { BundlePublicDetail, SongSummary } from "@pgko-dev/schema";

import { AutoScrollMarquee } from "@/components/auto-scroll-marquee";
import { UploaderWithCollaboratorsRow } from "@/components/bundle/uploader-with-collaborators";
import { RemoteImage } from "@/components/remote-image";
import { Site } from "@/components/site";
import { SongPanel } from "@/components/song-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/auth";
import { useBundleDownload } from "@/hooks/use-bundle-download";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePreviewAudio } from "@/hooks/use-preview-audio";
import { clearBundleReturnTo, getBundleReturnTo } from "@/lib/bundle-return";
import { coverThemeToCssColor } from "@/lib/cover-theme";
import { cn } from "@/lib/utils";

const COVER_SIZE = 250;

function BundleDetailHeaderLayout({
  cover,
  children,
  contentMinHeight,
  contentClassName,
}: Readonly<{
  cover: ReactNode;
  children: ReactNode;
  contentMinHeight?: number;
  contentClassName?: string;
}>) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
      {cover}
      <div
        className={cn("flex min-h-0 flex-1 flex-col gap-2", contentClassName)}
        style={{ minHeight: contentMinHeight }}
      >
        {children}
      </div>
    </header>
  );
}

function BundleDescriptionCard({
  title,
  children,
}: Readonly<{ title: ReactNode; children: ReactNode }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function BundleSongsLayout({
  title,
  children,
  footer,
}: Readonly<{ title: ReactNode; children: ReactNode; footer?: ReactNode }>) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">{title}</h3>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{children}</div>
      {footer}
    </div>
  );
}

export function BundleDetailSkeleton() {
  const { t } = useTranslation();
  return (
    <Site.Page title={t("ui.bundlePage.title")} documentTitle={t("ui.loading")}>
      <div className="flex flex-col gap-6" aria-hidden>
        <BundleDetailHeaderLayout
          contentClassName="sm:min-h-[250px]"
          cover={
            <Skeleton
              className="shrink-0 rounded-lg"
              style={{ width: COVER_SIZE, height: COVER_SIZE }}
            />
          }
        >
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-44" />
          <div className="mt-2 flex gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="mt-auto flex gap-2 pt-2">
            <Skeleton className="h-10 w-28 rounded-md" />
            <Skeleton className="h-10 w-24 rounded-md" />
          </div>
        </BundleDetailHeaderLayout>
        <BundleDescriptionCard title={<Skeleton className="h-4 w-32" />}>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </BundleDescriptionCard>
        <BundleSongsLayout title={<Skeleton className="h-6 w-48" />}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </BundleSongsLayout>
      </div>
    </Site.Page>
  );
}

export function BundleDetailContent({
  data,
  bundleId,
  songs,
}: Readonly<{
  data: BundlePublicDetail;
  bundleId: string;
  songs: SongSummary[];
}>) {
  const { t } = useTranslation();
  const router = useRouter();
  const { audioRef, playingId, setPlayingId, playPreview } = usePreviewAudio();

  const handleBackClick = () => {
    const returnTo = getBundleReturnTo();
    if (returnTo) {
      clearBundleReturnTo();
      return router.navigate({ to: returnTo, resetScroll: false });
    }

    return router.navigate({ to: "/" });
  };

  const displayTitle = data.title || t("ui.bundlePage.title");

  return (
    <Site.Page documentTitle={displayTitle}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 w-fit"
            onClick={handleBackClick}
          >
            <ArrowLeft className="size-4" />
            {t("ui.uploadDetail.actions.back")}
          </Button>
          <BundleDetailHeader data={data} bundleId={bundleId} displayTitle={displayTitle} />
        </div>

        {data.encodingIssues ? (
          <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="size-4 shrink-0" />
            {t("ui.bundlePage.encodingWarning")}
          </div>
        ) : null}

        {data.description ? (
          <BundleDescriptionCard
            title={
              <>
                <FileText className="size-4 text-muted-foreground" />
                {t("ui.bundlePage.description")}
              </>
            }
          >
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{data.description}</p>
          </BundleDescriptionCard>
        ) : null}

        {data.tags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {data.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}

        {songs.length > 0 ? (
          <BundleDetailSongs
            songs={songs}
            playingId={playingId}
            onPlayPreview={playPreview}
            audioRef={audioRef}
            onEnded={() => setPlayingId(null)}
          />
        ) : null}
      </div>
    </Site.Page>
  );
}

function BundleDetailHeader({
  data,
  bundleId,
  displayTitle,
}: Readonly<{
  data: BundlePublicDetail;
  bundleId: string;
  displayTitle: string;
}>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const coverGlowColor = coverThemeToCssColor(data.coverThemeColor);
  const coverBoxShadow = coverGlowColor
    ? `0 0 0 2px ${coverGlowColor}, 0 0 20px ${coverGlowColor}`
    : "0 0 0 2px rgba(255,255,255,0.35), 0 0 20px rgba(255,255,255,0.55)";
  const releasedAt = useMemo(
    () => (data.releasedAt ? new Date(data.releasedAt) : null),
    [data.releasedAt],
  );

  return (
    <BundleDetailHeaderLayout
      contentMinHeight={isMobile ? undefined : COVER_SIZE}
      cover={
        <div
          className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted"
          style={{
            width: COVER_SIZE,
            height: COVER_SIZE,
            boxShadow: coverBoxShadow,
          }}
        >
          <RemoteImage
            src={data.coverUrl}
            alt=""
            className="absolute inset-0 rounded-lg"
            fallbackIconClassName="size-12 text-muted-foreground"
          />
        </div>
      }
    >
      <div className="flex min-w-0 flex-col gap-0">
        <h2 className="mb-0 min-w-0 overflow-hidden text-2xl font-semibold tracking-tight">
          <AutoScrollMarquee className="text-2xl font-semibold tracking-tight">
            {displayTitle}
          </AutoScrollMarquee>
        </h2>

        {data.artist ? (
          <div className="mt-0 min-w-0 overflow-hidden text-muted-foreground">
            <AutoScrollMarquee className="text-muted-foreground">{data.artist}</AutoScrollMarquee>
          </div>
        ) : null}
      </div>

      {data.uploadedBy ? (
        <UploaderWithCollaboratorsRow
          layout="page"
          uploadedBy={data.uploadedBy}
          collaborators={data.collaborators ?? []}
        />
      ) : null}

      {releasedAt ? (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarCheck2 className="size-4 shrink-0" aria-hidden />
          <time dateTime={releasedAt.toISOString()}>
            {t("ui.bundlePage.releasedAt", {
              date: releasedAt.toLocaleDateString(),
            })}
          </time>
        </div>
      ) : null}

      {data.reuploadedAt ? (
        <ReuploadedAtRow reuploadedAt={data.reuploadedAt} revision={data.revision} />
      ) : null}

      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Download className="size-4 shrink-0" aria-hidden />
        {t("ui.bundlePage.downloadCount", { count: data.downloadCount })}
      </div>

      <div className={cn("flex items-center gap-2", isMobile ? "mt-4" : "mt-auto")}>
        <BundleDetailDownloadButton bundleId={bundleId} />
        <BundleDetailEditButton
          bundleId={bundleId}
          uploaderJointId={
            data.uploadedBy ? (data.uploadedBy.slug ?? data.uploadedBy.id) : undefined
          }
          collaboratorIds={data.collaborators?.map((c) => c.id)}
        />
      </div>
    </BundleDetailHeaderLayout>
  );
}

function BundleDetailDownloadButton({ bundleId }: Readonly<{ bundleId: string }>) {
  const { t } = useTranslation();
  const { downloadUrl } = useBundleDownload(bundleId);

  return (
    <a href={downloadUrl} className={buttonVariants()} aria-label={t("ui.bundlePage.download")}>
      <Download className="size-4" />
    </a>
  );
}

function ReuploadedAtRow({
  reuploadedAt,
  revision,
}: Readonly<{ reuploadedAt: Date; revision?: number | null }>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <CalendarArrowUp className="size-4 shrink-0" aria-hidden />
        <time dateTime={reuploadedAt.toISOString()}>
          {t("ui.bundlePage.reuploadedAt", {
            date: reuploadedAt.toLocaleDateString(),
          })}
        </time>
      </span>
      <Badge className="h-auto px-1.5 py-0 text-[10px] leading-tight font-semibold">
        v{revision}
      </Badge>
    </div>
  );
}

function BundleDetailSongs({
  songs,
  playingId,
  onPlayPreview,
  audioRef,
  onEnded,
}: Readonly<{
  songs: SongSummary[];
  playingId: string | null;
  onPlayPreview: (song: SongSummary) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onEnded: () => void;
}>) {
  const { t } = useTranslation();

  return (
    <BundleSongsLayout
      title={
        <>
          <Music2 className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          {t("ui.bundlePage.songsSectionTitle", { count: songs.length })}
        </>
      }
      footer={
        <audio ref={audioRef} onEnded={onEnded} className="hidden" aria-hidden>
          <track kind="captions" />
        </audio>
      }
    >
      {songs.map((song) => (
        <SongPanel
          key={song.id}
          song={song}
          videoUrl={song.videoUrl}
          onPlayPreview={onPlayPreview}
          isPreviewPlaying={playingId === song.id}
        />
      ))}
    </BundleSongsLayout>
  );
}

function BundleDetailEditButton({
  bundleId,
  uploaderJointId,
  collaboratorIds,
}: Readonly<{
  bundleId: string;
  uploaderJointId?: string;
  collaboratorIds?: string[];
}>) {
  const { t } = useTranslation();
  const { user } = useAuth();

  if (!user) return null;
  const isOwner = uploaderJointId && (user.slug === uploaderJointId || user.id === uploaderJointId);
  const isCollaborator = collaboratorIds?.includes(user.id);
  if (!isOwner && !isCollaborator) return null;

  const Icon = isCollaborator ? FileChartColumn : FileEdit;
  const tooltipKey = isCollaborator ? "ui.bundlePage.viewStats" : "ui.bundlePage.edit";

  return (
    <Link
      to="/bundles/$bundleId/manage"
      params={{ bundleId }}
      className={buttonVariants({ variant: "outline" })}
      aria-label={t(tooltipKey)}
    >
      <Icon className="size-4" />
    </Link>
  );
}
