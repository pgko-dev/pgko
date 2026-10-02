import { Link, useLocation } from "@tanstack/react-router";
import {
  CalendarArrowUp,
  CalendarCheck2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Dot,
  Download,
  Link2,
  Music2,
  Pause,
  Play,
  Users,
  Video,
} from "lucide-react";
import { LazyMotion, domAnimation } from "motion/react";
import * as m from "motion/react-m";
import {
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import { isDraftLikeBundleStatus, sortSongs } from "@pgko-dev/common";
import type { BundleListItem, BundleListSong } from "@pgko-dev/schema";

import { AutoScrollMarquee } from "@/components/auto-scroll-marquee";
import { UploaderWithCollaboratorsRow } from "@/components/bundle/uploader-with-collaborators";
import { DifficultyBadge, DIFFICULTY_LEVEL_PILL_WIDTH } from "@/components/difficulty-badge";
import { RemoteImage } from "@/components/remote-image";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/auth";
import { useBundleDownload } from "@/hooks/use-bundle-download";
import { useIsMobile } from "@/hooks/use-mobile";
import { setBundleReturnTo } from "@/lib/bundle-return";
import { getBundleVideoUrl } from "@/lib/bundle-video";
import { cn } from "@/lib/utils";

import { COVER_SIZE, COVER_SIZE_MOBILE, MOBILE_ACTION_BAR_HEIGHT } from "./bundle-card-constants";

const POPOVER_ROW_HEIGHT = 28;
const POPOVER_VISIBLE_ROWS = 5;
const POPOVER_ANIMATION_DURATION = 0.15;

const GLASS_BG = "var(--glass-bg)";

function formatTimeLeft(expiresAt: Date): string {
  const now = Date.now();
  const ms = expiresAt.getTime() - now;
  if (ms <= 0) return "0m";
  const totalM = Math.floor(ms / 60_000);
  const h = Math.floor(totalM / 60);
  const m = totalM % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Difficulty helpers ────────────────────────────────────────────────────────

function MiniDifficultyBadge({ song }: Readonly<{ song: BundleListSong }>) {
  const isWorldsEnd = song.difficulty === 4;

  return (
    <DifficultyBadge difficulty={song.difficulty} size="mini">
      {isWorldsEnd ? (song.weAttribute ?? " ") : `${song.level}`}
    </DifficultyBadge>
  );
}

// ─── Shared visual primitives ──────────────────────────────────────────────────

const BundleCoverImage = memo(function BundleCoverImage({
  coverUrl,
  size = COVER_SIZE,
}: Readonly<{ coverUrl?: string | null; size?: number }>) {
  return (
    <RemoteImage
      src={coverUrl}
      alt=""
      className="relative shrink-0"
      style={{ width: size, height: size }}
      fallbackIconClassName="size-10 text-muted-foreground"
    />
  );
});

function CardDownloadButton({
  bundleId,
  strokeWidth = 2.5,
}: Readonly<{
  bundleId: string;
  strokeWidth?: number;
}>) {
  const { t } = useTranslation();
  const { downloadUrl } = useBundleDownload(bundleId);

  const className = cn(
    "flex size-8 shrink-0 items-center justify-center rounded-full transition-[color,transform] duration-200 ease-out",
    "text-muted-foreground hover:bg-muted hover:text-foreground",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none",
    "disabled:pointer-events-none disabled:opacity-60",
  );

  return (
    <a
      href={downloadUrl}
      onClick={(e) => e.stopPropagation()}
      className={className}
      title={t("ui.bundleList.download")}
      aria-label={t("ui.bundleList.download")}
    >
      <Download className="size-5" aria-hidden strokeWidth={strokeWidth} />
    </a>
  );
}

function CardVideoButton({
  videoUrl,
  strokeWidth = 2.5,
}: Readonly<{ videoUrl: string; strokeWidth?: number }>) {
  const { t } = useTranslation();
  return (
    <a
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full transition-[color,transform] duration-200 ease-out",
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none",
      )}
      title={t("ui.bundlePage.videoLink")}
      aria-label={t("ui.bundlePage.videoLink")}
    >
      <Video className="size-5" aria-hidden strokeWidth={strokeWidth} />
    </a>
  );
}

const CAROUSEL_NAV_BUTTON_CLASS = cn(
  "flex size-8 shrink-0 items-center justify-center rounded-full transition-[color,transform] duration-200 ease-out",
  "text-muted-foreground hover:bg-muted hover:text-foreground",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none",
);

function CarouselNavButton({
  direction,
  onClick,
  ariaLabel,
  strokeWidth = 2,
  disabled = false,
}: Readonly<{
  direction: "left" | "right";
  onClick: () => void;
  ariaLabel: string;
  strokeWidth?: number;
  disabled?: boolean;
}>) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      className={cn(
        CAROUSEL_NAV_BUTTON_CLASS,
        "disabled:pointer-events-none disabled:cursor-default disabled:opacity-30",
      )}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Icon className="size-5" aria-hidden strokeWidth={strokeWidth} />
    </button>
  );
}

// ─── Card metadata section ─────────────────────────────────────────────────────

function OwnerVisibilityBadge({
  visibility,
}: Readonly<{ visibility: BundleListItem["visibility"] }>) {
  const { t } = useTranslation();
  if (visibility === "public") return null;

  const isUnlisted = visibility === "unlisted";
  const Icon = isUnlisted ? Link2 : Users;
  const label = isUnlisted
    ? t("ui.bundleList.visibilityBadge.unlisted")
    : t("ui.bundleList.visibilityBadge.profileOnly");

  return (
    <Badge
      variant="outline"
      className="h-auto w-fit shrink-0 gap-1 px-1.5 py-0.5 text-[10px] leading-tight font-semibold"
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      {label}
    </Badge>
  );
}

const BundleCardMeta = memo(function BundleCardMeta({
  bundle,
  displayDate,
  noLinkUserId,
  showVersion = false,
  showDownloadCount = false,
  isOwner = false,
  songs,
}: Readonly<{
  bundle: BundleListItem;
  displayDate: Date | null;
  noLinkUserId?: string;
  showVersion?: boolean;
  showDownloadCount?: boolean;
  isOwner?: boolean;
  songs: BundleListSong[];
}>) {
  const { t } = useTranslation();

  const expiryTimeLeft = useMemo(
    () => (bundle.expiresAt ? formatTimeLeft(new Date(bundle.expiresAt)) : null),
    [bundle.expiresAt],
  );

  return (
    <div className="relative z-20 flex min-h-0 min-w-0 flex-1">
      <div
        className="no-scrollbar flex min-h-0 min-w-0 flex-1 flex-col justify-between overflow-y-auto px-3 py-2 md:py-3"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Region 1 – title & artist */}
        <div className="flex min-w-0 shrink-0 flex-col gap-0">
          <div className="flex min-w-0 items-center gap-1.5">
            {isOwner && <OwnerVisibilityBadge visibility={bundle.visibility} />}
            <h3 className="min-w-0 flex-1 text-lg leading-tight font-semibold">
              <AutoScrollMarquee>{bundle.title}</AutoScrollMarquee>
            </h3>
          </div>
          <div className="text-md text-muted-foreground">
            <AutoScrollMarquee>{bundle.artist}</AutoScrollMarquee>
          </div>
        </div>

        {/* Region 2 – draft expiry */}
        <div className="min-w-0 shrink-0">
          {isDraftLikeBundleStatus(bundle.status) && bundle.expiresAt && (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium">
              <Clock className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">
                {t("ui.bundleList.expiresIn", {
                  time: expiryTimeLeft,
                })}
              </span>
            </div>
          )}
        </div>

        {/* Region 3 – uploader */}
        <div className="min-w-0 shrink-0">
          <UploaderWithCollaboratorsRow
            layout="card"
            uploadedBy={bundle.uploadedBy}
            collaborators={bundle.collaborators ?? []}
            noLinkUserId={noLinkUserId}
          />
        </div>

        {/* Region 4 – release / reupload date */}
        <div className="min-w-0 shrink-0 text-[13px] text-muted-foreground">
          {displayDate && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5">
                {showVersion ? (
                  <CalendarArrowUp className="size-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <CalendarCheck2 className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <time dateTime={displayDate.toISOString()}>{displayDate.toLocaleDateString()}</time>
              </span>
              {showVersion && bundle.revision != null ? (
                <span className="inline-flex shrink-0 -translate-y-px">
                  <Badge
                    variant="outline"
                    className="h-auto px-1.5 py-0 text-[10px] leading-tight font-semibold"
                  >
                    v{bundle.revision}
                  </Badge>
                </span>
              ) : null}
            </div>
          )}
        </div>

        {/* Region 6 – stats */}
        <div className="flex shrink-0 items-center gap-3 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Music2 className="size-3.5 shrink-0 text-muted-foreground" />
            {bundle.songs.length}
          </span>
          {showDownloadCount && (
            <span className="inline-flex items-center gap-1.5">
              <Download className="size-3.5 shrink-0 text-muted-foreground" />
              {bundle.downloadCount}
            </span>
          )}
        </div>

        {/* Region 5 – level panel */}
        {songs.length > 0 && (
          <section aria-label="Levels" className="mt-1 max-w-full min-w-0">
            <AutoScrollMarquee disableTruncate align="start" className="font-semibold">
              <span className="inline-flex items-center gap-1">
                {songs.map((song) => {
                  const difficulty = song.difficulty ?? 0;
                  const isWorldsEnd = difficulty === 4;
                  let label: string | null;
                  if (isWorldsEnd) {
                    label = song.level && song.level.trim() !== "" ? `${song.level}★` : "★";
                  } else {
                    label = song.level;
                  }

                  return (
                    <DifficultyBadge key={song.id} difficulty={difficulty} size="chip">
                      {label}
                    </DifficultyBadge>
                  );
                })}
              </span>
            </AutoScrollMarquee>
          </section>
        )}
      </div>
    </div>
  );
});

// ─── Song list───────

function SongListItem({
  song,
  playingSongId,
  onPlayPreview,
}: Readonly<{
  song: BundleListSong;
  playingSongId?: string | null;
  onPlayPreview?: (song: BundleListSong) => void;
}>) {
  const { t } = useTranslation();
  const isPlaying = playingSongId === song.id;
  const canPlay = Boolean(song.previewUrl && onPlayPreview);
  const hasVideo = Boolean(song.videoUrl);

  return (
    <li
      className="group/song flex min-h-0 w-full min-w-0 flex-shrink-0 items-center gap-1.5 rounded px-1 py-0.5 text-[11px]"
      style={{ minHeight: POPOVER_ROW_HEIGHT }}
    >
      <div className="flex items-center gap-0.5">
        {canPlay ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPlayPreview?.(song);
            }}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-150",
              "text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none",
              isPlaying
                ? "bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 dark:text-amber-400"
                : "hover:bg-muted",
            )}
            title={t("ui.bundleList.playPreview")}
            aria-label={t("ui.bundleList.playPreview")}
          >
            {isPlaying ? (
              <Pause className="size-4 shrink-0" aria-hidden strokeWidth={2} />
            ) : (
              <Play className="size-4 shrink-0" aria-hidden strokeWidth={2} />
            )}
          </button>
        ) : (
          <span
            className="flex w-6 shrink-0 items-center justify-center text-muted-foreground"
            aria-hidden
          >
            <Dot className="size-4" />
          </span>
        )}
        {hasVideo ? (
          <a
            href={song.videoUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-150",
              "text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none",
              "hover:bg-muted",
            )}
            title={t("ui.bundlePage.videoLink")}
            aria-label={t("ui.bundlePage.videoLink")}
          >
            <Video className="size-4 shrink-0" aria-hidden strokeWidth={2} />
          </a>
        ) : (
          <span
            className="flex w-6 shrink-0 items-center justify-center text-muted-foreground"
            aria-hidden
          >
            <Dot className="size-4" />
          </span>
        )}
      </div>
      <MiniDifficultyBadge song={song} />
      <span
        className={cn(
          DIFFICULTY_LEVEL_PILL_WIDTH,
          "shrink-0 overflow-hidden text-center text-muted-foreground tabular-nums",
        )}
      >
        <AutoScrollMarquee className="w-full">
          {song.difficulty === 4 ? `${song.level}★` : song.constant.toFixed(1)}
        </AutoScrollMarquee>
      </span>
      <AutoScrollMarquee className="min-w-0 flex-1 font-medium">{song.title}</AutoScrollMarquee>
    </li>
  );
}

function SongListWithScroll({
  songs,
  songsCount,
  playingSongId,
  onPlayPreview,
  listViewportRef,
  scrollState,
  onScroll,
  onScrollUp,
  onScrollDown,
  maxHeight,
}: Readonly<{
  songs: BundleListSong[];
  songsCount: number;
  playingSongId?: string | null;
  onPlayPreview?: (song: BundleListSong) => void;
  listViewportRef: React.RefObject<HTMLUListElement | null>;
  scrollState: { canUp: boolean; canDown: boolean };
  onScroll: () => void;
  onScrollUp: () => void;
  onScrollDown: () => void;
  maxHeight?: number;
}>) {
  const { t } = useTranslation();

  return (
    <div className="flex w-full min-w-0 items-stretch gap-0.5">
      <ul
        ref={listViewportRef}
        aria-label={t("ui.bundleList.totalBeatmaps", { count: songsCount })}
        className={cn(
          "m-0 no-scrollbar min-h-0 flex-1 list-none overflow-x-hidden overflow-y-auto p-0",
          "flex flex-col gap-0.5 pr-0.5",
        )}
        style={{
          ...(maxHeight === undefined ? {} : { maxHeight }),
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
        onScroll={onScroll}
      >
        {songs.map((song) => (
          <SongListItem
            key={song.id}
            song={song}
            playingSongId={playingSongId}
            onPlayPreview={onPlayPreview}
          />
        ))}
      </ul>

      {songs.length > POPOVER_VISIBLE_ROWS && (
        <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 self-stretch border-l border-foreground/10 pl-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onScrollUp();
            }}
            disabled={!scrollState.canUp}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded transition-colors duration-150",
              "text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none",
              "disabled:pointer-events-none disabled:opacity-30",
            )}
            aria-label={t("ui.bundleList.scrollUp")}
            title={t("ui.bundleList.scrollUp")}
          >
            <ChevronUp className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onScrollDown();
            }}
            disabled={!scrollState.canDown}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded transition-colors duration-150",
              "text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none",
              "disabled:pointer-events-none disabled:opacity-30",
            )}
            aria-label={t("ui.bundleList.scrollDown")}
            title={t("ui.bundleList.scrollDown")}
          >
            <ChevronDown className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── BundleCard hook

function useBundleCardPopover(
  isMobile: boolean,
  hasSongs: boolean,
  _coverUrl: string | null | undefined,
) {
  const listViewportRef = useRef<HTMLUListElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHoverRegionActive, setIsHoverRegionActive] = useState(false);
  const [isPopoverHover, setIsPopoverHover] = useState(false);
  const [popoverHeight, setPopoverHeight] = useState(0);
  const [scrollState, setScrollState] = useState({ canUp: false, canDown: false });

  const pointerRef = useRef<{
    clientX: number;
    clientY: number;
    wrapper: HTMLDivElement;
  } | null>(null);
  const hoverRafRef = useRef<number | null>(null);

  const cancelHoverRaf = useCallback(() => {
    if (hoverRafRef.current != null) {
      cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = null;
    }
  }, []);

  const applyHoverPointer = useCallback(() => {
    if (isMobile) return;
    const point = pointerRef.current;
    if (!point) return;

    const cardEl = cardRef.current;
    if (!cardEl) return;

    const cardRect = cardEl.getBoundingClientRect();
    const popoverRect = popoverRef.current?.getBoundingClientRect();
    const wrapperRect = point.wrapper.getBoundingClientRect();
    const { clientX, clientY } = point;

    const isInsidePopover =
      popoverRect != null &&
      clientX >= popoverRect.left &&
      clientX <= popoverRect.right &&
      clientY >= popoverRect.top &&
      clientY <= popoverRect.bottom;

    if (isInsidePopover) {
      setIsHoverRegionActive(false);
      setIsPopoverHover(true);
      return;
    }

    const isInsideWrapper =
      clientX >= wrapperRect.left &&
      clientX <= wrapperRect.right &&
      clientY >= wrapperRect.top &&
      clientY <= wrapperRect.bottom;

    if (!isInsideWrapper) {
      setIsHoverRegionActive(false);
      setIsPopoverHover(false);
      return;
    }

    const isInsideCard =
      clientX >= cardRect.left &&
      clientX <= cardRect.right &&
      clientY >= cardRect.top &&
      clientY <= cardRect.bottom;

    if (!isInsideCard && clientY > cardRect.bottom) {
      setIsHoverRegionActive(false);
      setIsPopoverHover(true);
      return;
    }

    setIsPopoverHover(false);
    if (!isInsideCard) {
      setIsHoverRegionActive(false);
      return;
    }

    const triggerThresholdY = cardRect.top + cardRect.height * 0.8;
    setIsHoverRegionActive(clientY >= triggerThresholdY);
  }, [isMobile]);

  const scheduleHoverPointer = useCallback(() => {
    if (hoverRafRef.current != null) return;
    hoverRafRef.current = requestAnimationFrame(() => {
      hoverRafRef.current = null;
      applyHoverPointer();
    });
  }, [applyHoverPointer]);

  useEffect(() => () => cancelHoverRaf(), [cancelHoverRaf]);

  const showHoverPopover = !isMobile && hasSongs && (isHoverRegionActive || isPopoverHover);

  useLayoutEffect(() => {
    if (isMobile || !hasSongs || !popoverRef.current) return;
    const el = popoverRef.current;
    const update = () => setPopoverHeight(el.getBoundingClientRect().height);
    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    return () => observer.disconnect();
  }, [hasSongs, isMobile]);

  const updateScrollState = useCallback(() => {
    const el = listViewportRef.current;
    if (!el) return;
    setScrollState({
      canUp: el.scrollTop > 0,
      canDown: el.scrollTop < el.scrollHeight - el.clientHeight - 1,
    });
  }, []);

  useLayoutEffect(() => {
    const el = listViewportRef.current;
    if (el && (hasSongs || showHoverPopover)) {
      el.scrollTop = 0;
      const raf = requestAnimationFrame(() => updateScrollState());
      return () => cancelAnimationFrame(raf);
    }
  }, [hasSongs, showHoverPopover, updateScrollState]);

  const scrollList = useCallback((direction: "up" | "down") => {
    const el = listViewportRef.current;
    if (!el) return;
    el.scrollBy({
      top: direction === "up" ? -POPOVER_ROW_HEIGHT : POPOVER_ROW_HEIGHT,
      behavior: "smooth",
    });
  }, []);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (isMobile) return;
      pointerRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        wrapper: event.currentTarget,
      };
      scheduleHoverPointer();
    },
    [isMobile, scheduleHoverPointer],
  );

  const handleMouseLeave = useCallback(() => {
    cancelHoverRaf();
    pointerRef.current = null;
    if (isMobile) return;
    setIsHoverRegionActive(false);
    setIsPopoverHover(false);
  }, [isMobile, cancelHoverRaf]);

  return {
    listViewportRef,
    popoverRef,
    cardRef,
    showHoverPopover,
    popoverHeight,
    scrollState,
    updateScrollState,
    scrollList,
    handleMouseMove,
    handleMouseLeave,
  };
}

function BundleCardSongPopover({
  hasSongs,
  showHoverPopover,
  popoverHeight,
  popoverRef,
  songListProps,
}: Readonly<{
  hasSongs: boolean;
  showHoverPopover: boolean;
  popoverHeight: number;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  songListProps: React.ComponentProps<typeof SongListWithScroll>;
}>) {
  const popoverTransition = useMemo(
    () => ({
      type: "tween" as const,
      duration: POPOVER_ANIMATION_DURATION,
      ease: "easeOut" as const,
    }),
    [],
  );

  if (!hasSongs) return null;

  return (
    <m.div
      aria-hidden={!showHoverPopover}
      inert={showHoverPopover ? undefined : true}
      className={cn(
        "pointer-events-none absolute top-full -right-0.5 -left-0.5 z-30 origin-top overflow-hidden rounded-b-xl",
        "border-x-2 border-t border-b-2 border-foreground/8 border-t-foreground/5 text-card-foreground backdrop-blur-xl",
        "group-hover/bundle:border-x-foreground/15 group-hover/bundle:border-b-foreground/15 dark:border-x-foreground/10 dark:border-b-foreground/10 dark:group-hover/bundle:border-x-foreground/20 dark:group-hover/bundle:border-b-foreground/20",
        showHoverPopover && "pointer-events-auto",
      )}
      style={{ height: popoverHeight, background: GLASS_BG }}
      initial={false}
      animate={{
        clipPath: showHoverPopover ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)",
        opacity: showHoverPopover ? 1 : 0,
      }}
      transition={popoverTransition}
    >
      <div ref={popoverRef} className="min-h-0 p-1">
        <SongListWithScroll
          {...songListProps}
          maxHeight={POPOVER_ROW_HEIGHT * POPOVER_VISIBLE_ROWS}
        />
      </div>
    </m.div>
  );
}

// ─── BundleCard──────

export const BundleCard = memo(
  function BundleCard({
    bundle,
    onPlayPreview,
    playingSongId = null,
    noLinkUserId,
    linkToManage = false,
    showDownloadCount = false,
    dateSort = "releasedAt",
    renderExtraActions,
  }: Readonly<{
    bundle: BundleListItem;
    onPlayPreview?: (song: BundleListSong) => void;
    playingSongId?: string | null;
    noLinkUserId?: string;
    linkToManage?: boolean;
    showDownloadCount?: boolean;
    dateSort?: "reuploadedAt" | "releasedAt";
    renderExtraActions?: (bundle: BundleListItem, isMobile: boolean) => ReactNode;
  }>) {
    const location = useLocation();
    const { t } = useTranslation();
    const { user } = useAuth();
    const isOwner = user?.id === bundle.uploadedBy.id;
    const isMobile = useIsMobile();
    const setReturnToBeforeBundleNav = useCallback(() => {
      setBundleReturnTo(location.pathname);
    }, [location.pathname]);
    const displayDate = useMemo(() => {
      if (dateSort === "reuploadedAt") {
        const dateStr = bundle.reuploadedAt ?? bundle.releasedAt;
        return dateStr ? new Date(dateStr) : null;
      }
      return bundle.releasedAt ? new Date(bundle.releasedAt) : null;
    }, [dateSort, bundle.reuploadedAt, bundle.releasedAt]);
    const sortedSongs = useMemo(() => sortSongs([...bundle.songs]), [bundle.songs]);
    const hasSongs = sortedSongs.length > 0;
    const effectiveVideoUrl = getBundleVideoUrl(bundle.videoUrl, sortedSongs);
    const coverSize = isMobile ? COVER_SIZE_MOBILE : COVER_SIZE;
    const iconStrokeWidth = 2;
    const carouselRef = useRef<HTMLDivElement>(null);
    const [carouselScrollState, setCarouselScrollState] = useState({
      canLeft: false,
      canRight: false,
    });

    const updateCarouselScrollState = useCallback(() => {
      const el = carouselRef.current;
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const canLeft = scrollLeft > 1;
      const canRight = scrollLeft < scrollWidth - clientWidth - 1;
      setCarouselScrollState((prev) =>
        prev.canLeft !== canLeft || prev.canRight !== canRight ? { canLeft, canRight } : prev,
      );
    }, []);

    useEffect(() => {
      if (!isMobile) return;
      const el = carouselRef.current;
      if (!el) return;
      updateCarouselScrollState();
      const ro = new ResizeObserver(updateCarouselScrollState);
      ro.observe(el);
      return () => ro.disconnect();
    }, [isMobile, updateCarouselScrollState]);

    const scrollCarousel = useCallback((direction: "left" | "right") => {
      const el = carouselRef.current;
      if (!el) return;
      const delta = direction === "left" ? -el.clientWidth : el.clientWidth;
      el.scrollBy({ left: delta, behavior: "smooth" });
    }, []);

    const {
      listViewportRef,
      popoverRef,
      cardRef,
      showHoverPopover,
      popoverHeight,
      scrollState,
      updateScrollState,
      scrollList,
      handleMouseMove,
      handleMouseLeave,
    } = useBundleCardPopover(isMobile, hasSongs, bundle.coverUrl);

    const onScrollUp = useCallback(() => scrollList("up"), [scrollList]);
    const onScrollDown = useCallback(() => scrollList("down"), [scrollList]);

    const sharedSongListProps = useMemo(
      () => ({
        songs: sortedSongs,
        songsCount: bundle.songs.length,
        playingSongId,
        onPlayPreview,
        listViewportRef,
        scrollState,
        onScroll: updateScrollState,
        onScrollUp,
        onScrollDown,
      }),
      [
        sortedSongs,
        bundle.songs.length,
        playingSongId,
        onPlayPreview,
        listViewportRef,
        scrollState,
        updateScrollState,
        onScrollUp,
        onScrollDown,
      ],
    );

    const metaProps = useMemo(
      () => ({
        bundle,
        displayDate,
        noLinkUserId,
        showDownloadCount,
        showVersion: dateSort === "reuploadedAt",
        isOwner,
        songs: sortedSongs,
      }),
      [bundle, displayDate, noLinkUserId, dateSort, showDownloadCount, isOwner, sortedSongs],
    );

    return (
      <LazyMotion features={domAnimation} strict>
        <m.div
          role="group"
          className={cn(
            "group/bundle relative rounded-xl border-2 border-foreground/8 transition-[box-shadow,border-color] duration-200 hover:border-foreground/15 hover:shadow-[0_0_16px_rgba(0,0,0,0.1)] dark:border-foreground/10 dark:hover:border-foreground/20 dark:hover:shadow-[0_0_16px_rgba(0,0,0,0.3)]",
            showHoverPopover && "z-41 rounded-b-none",
          )}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {isMobile ? (
            <div
              ref={carouselRef}
              onScroll={updateCarouselScrollState}
              className="no-scrollbar flex min-w-0 snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-xl backdrop-blur-lg"
              style={{ scrollbarWidth: "none", height: coverSize, background: GLASS_BG }}
            >
              <div
                className="relative min-w-0 shrink-0 basis-full snap-start snap-always overflow-hidden"
                style={{ height: coverSize }}
              >
                <div className="relative flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-xl text-card-foreground">
                  <Link
                    to={linkToManage ? "/bundles/$bundleId/manage" : "/bundles/$bundleId"}
                    params={{ bundleId: bundle.id }}
                    onClick={setReturnToBeforeBundleNav}
                    aria-label={bundle.title}
                    className="absolute inset-0 z-0"
                  />
                  <div className="pointer-events-none relative z-10 flex h-full min-h-0 w-full min-w-0">
                    <BundleCoverImage coverUrl={bundle.coverUrl} size={coverSize} />
                    <BundleCardMeta {...metaProps} />
                  </div>
                </div>
              </div>
              <div className="relative flex min-w-0 shrink-0 basis-full snap-start snap-always flex-col rounded-r-xl border-l border-foreground/5 text-card-foreground">
                <div className="relative z-10 flex min-h-0 min-w-0 flex-1 items-stretch gap-0.5 p-1">
                  <SongListWithScroll {...sharedSongListProps} />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div
                ref={cardRef}
                className={cn(
                  "relative flex min-h-0 overflow-hidden rounded-xl text-card-foreground backdrop-blur-lg transition-shadow duration-200",
                  showHoverPopover && "rounded-b-none",
                )}
                style={{ height: coverSize, background: GLASS_BG }}
              >
                <Link
                  to={linkToManage ? "/bundles/$bundleId/manage" : "/bundles/$bundleId"}
                  params={{ bundleId: bundle.id }}
                  onClick={setReturnToBeforeBundleNav}
                  aria-label={bundle.title}
                  className="absolute inset-0 z-0"
                />
                <div className="pointer-events-none relative z-10 flex h-full min-h-0 w-full min-w-0">
                  <BundleCoverImage coverUrl={bundle.coverUrl} size={coverSize} />
                  <BundleCardMeta {...metaProps} />
                </div>
              </div>
              <div
                className={cn(
                  "pointer-events-none absolute top-0 right-0 bottom-0 z-25 w-36",
                  "opacity-0 transition-opacity duration-200 ease-out group-hover/bundle:opacity-100",
                )}
                style={{
                  boxShadow: "inset -48px 0 32px 8px var(--glass-bg)",
                }}
                aria-hidden
              />
              <div
                className={cn(
                  "absolute inset-y-0 right-4 z-30 flex h-full flex-col items-center justify-evenly overflow-hidden max-md:hidden",
                  "translate-x-4 opacity-0 group-hover/bundle:translate-x-0 group-hover/bundle:opacity-100",
                  "transition-all duration-200 ease-out",
                )}
              >
                {renderExtraActions?.(bundle, false)}
                <CardDownloadButton bundleId={bundle.id} strokeWidth={iconStrokeWidth} />
                {effectiveVideoUrl && (
                  <CardVideoButton videoUrl={effectiveVideoUrl} strokeWidth={iconStrokeWidth} />
                )}
              </div>

              <BundleCardSongPopover
                hasSongs={hasSongs}
                showHoverPopover={showHoverPopover}
                popoverHeight={popoverHeight}
                popoverRef={popoverRef}
                songListProps={sharedSongListProps}
              />
            </div>
          )}
          {isMobile && (
            <div
              className="flex items-center justify-evenly rounded-b-xl border-t border-foreground/5 px-6 backdrop-blur-sm"
              style={{ height: MOBILE_ACTION_BAR_HEIGHT, background: GLASS_BG }}
            >
              <CarouselNavButton
                direction="left"
                onClick={() => scrollCarousel("left")}
                ariaLabel={t("ui.bundleList.carouselPrev")}
                strokeWidth={iconStrokeWidth}
                disabled={!carouselScrollState.canLeft}
              />
              {renderExtraActions?.(bundle, true)}
              {effectiveVideoUrl && (
                <CardVideoButton videoUrl={effectiveVideoUrl} strokeWidth={iconStrokeWidth} />
              )}
              <CardDownloadButton bundleId={bundle.id} strokeWidth={iconStrokeWidth} />
              <CarouselNavButton
                direction="right"
                onClick={() => scrollCarousel("right")}
                ariaLabel={t("ui.bundleList.carouselNext")}
                strokeWidth={iconStrokeWidth}
                disabled={!carouselScrollState.canRight}
              />
            </div>
          )}
        </m.div>
      </LazyMotion>
    );
  },
  (prev, next) => {
    return (
      prev.bundle.id === next.bundle.id &&
      prev.playingSongId === next.playingSongId &&
      prev.noLinkUserId === next.noLinkUserId &&
      prev.linkToManage === next.linkToManage &&
      prev.showDownloadCount === next.showDownloadCount &&
      prev.dateSort === next.dateSort &&
      prev.renderExtraActions === next.renderExtraActions
    );
  },
);
