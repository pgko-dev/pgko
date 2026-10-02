import { Pause, Play, Video } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BundleRules } from "@pgko-dev/config";
import type { SongSummary } from "@pgko-dev/schema";

import { AutoScrollMarquee } from "@/components/auto-scroll-marquee";
import { DifficultyLevelChip } from "@/components/difficulty-level-display";
import { RemoteImage } from "@/components/remote-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SongPanelProps {
  song: SongSummary;
  videoUrl?: string | null;
  onVideoUrlChange?: (url: string) => void;
  onVideoUrlBlur?: () => void;
  videoUrlInvalid?: boolean;
  onPlayPreview: (song: SongSummary) => void;
  isPreviewPlaying: boolean;
}

export function SongPanel({
  song,
  videoUrl,
  onVideoUrlChange,
  onVideoUrlBlur,
  videoUrlInvalid,
  onPlayPreview,
  isPreviewPlaying,
}: Readonly<SongPanelProps>) {
  const { t } = useTranslation();
  const isEditable = typeof onVideoUrlChange === "function";
  const hasReadOnlyVideo = !isEditable && Boolean(videoUrl);

  return (
    <div
      className={cn(
        "group relative flex items-stretch gap-3 rounded-xl bg-card px-2 py-2 shadow-sm ring-1 ring-border/50",
        "[&:has([aria-invalid=true])]:ring-2 [&:has([aria-invalid=true])]:ring-destructive",
        hasReadOnlyVideo &&
          "cursor-pointer bg-primary/[0.035] ring-primary/30 transition-[background-color,box-shadow] hover:bg-primary/[0.07] hover:shadow-md hover:ring-primary/50",
      )}
    >
      {hasReadOnlyVideo ? (
        <a
          href={videoUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 z-10 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          aria-label={t("ui.bundlePage.videoLink")}
        />
      ) : null}
      <div className="relative min-h-16 w-fit shrink-0 self-stretch">
        <div className="relative flex aspect-square h-full min-w-16 overflow-hidden rounded-lg bg-muted ring-1 ring-border/40">
          <RemoteImage
            src={song.jacketUrl}
            alt="jacket"
            className="absolute inset-0"
            fallbackIconClassName="size-5 text-muted-foreground"
          />
          {song.previewUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "absolute inset-0 z-20 flex size-full items-center justify-center rounded-none border-none",
                "bg-black/50 text-white shadow-none transition-opacity",
                "hover:bg-black/50 hover:text-white active:not-aria-[haspopup]:translate-y-0",
                "opacity-0 group-hover:opacity-100",
                isPreviewPlaying && "opacity-100",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onPlayPreview(song);
              }}
              title={t("ui.uploadDetail.song.playPreview")}
              aria-label={t("ui.uploadDetail.song.playPreview")}
            >
              {isPreviewPlaying ? (
                <Pause className="size-5" aria-hidden />
              ) : (
                <Play className="ml-0.5 size-5" aria-hidden />
              )}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className={cn("space-y-0.5", isEditable ? "pb-1.5" : "border-b border-border/60 pb-2.5")}
        >
          <span className="block min-w-0 text-sm leading-snug font-semibold tracking-tight text-foreground">
            <AutoScrollMarquee>{song.title}</AutoScrollMarquee>
          </span>
          <span className="block min-w-0 text-xs leading-snug font-medium text-muted-foreground">
            <AutoScrollMarquee>{song.artist}</AutoScrollMarquee>
          </span>
        </div>

        <div
          className={cn("text-xs text-muted-foreground", isEditable ? "py-1.5" : "pt-2.5 pb-0.5")}
        >
          <div className="flex min-w-0 flex-nowrap items-center gap-x-2">
            <span className="shrink-0">
              <DifficultyLevelChip
                difficulty={song.difficulty}
                level={song.level}
                constant={song.constant}
                weAttribute={song.weAttribute}
              />
            </span>
            <AutoScrollMarquee className="min-w-0 flex-1">{song.designer ?? "-"}</AutoScrollMarquee>
            {hasReadOnlyVideo ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] leading-none font-semibold text-primary ring-1 ring-primary/20 ring-inset">
                <Video className="size-3" aria-hidden />
              </span>
            ) : null}
          </div>
        </div>

        {isEditable ? (
          <div className="min-w-0 pt-1.5 pb-0.5 text-xs">
            <Input
              type={BundleRules.videoUrl.type}
              inputMode={BundleRules.videoUrl.inputMode}
              maxLength={BundleRules.videoUrl.maxLength}
              placeholder={t("ui.uploadDetail.song.videoLinkPlaceholder")}
              value={videoUrl ?? ""}
              onChange={(e) => onVideoUrlChange(e.target.value)}
              onBlur={onVideoUrlBlur}
              aria-invalid={videoUrlInvalid}
              className="wrap-anywhere"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
