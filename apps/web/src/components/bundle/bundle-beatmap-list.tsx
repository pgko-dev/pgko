import { Headphones, Pause, Search, Video, X } from "lucide-react";
import { useLayoutEffect, useRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";

import type { SongSummary } from "@pgko-dev/schema";

import { DifficultyLevelChip } from "@/components/difficulty-level-display";
import { RemoteImage } from "@/components/remote-image";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { ScrollAreaRoot, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Props = {
  songs: readonly SongSummary[];
  selectedId?: string;
  playingId: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (song: SongSummary) => void;
  onPlayAudio: (song: SongSummary) => void;
  scrollPosition: RefObject<number>;
};

const actionButtonClassName =
  "size-11 hover:bg-foreground/10 sm:size-6 dark:hover:bg-foreground/10 pointer-coarse:size-11";

export function BundleBeatmapList({
  songs,
  selectedId,
  playingId,
  query,
  onQueryChange,
  onSelect,
  onPlayAudio,
  scrollPosition,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const viewport = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const search = query.trim().normalize("NFKC").toLocaleLowerCase();
  const matches = songs.filter((song) =>
    [song.title, song.artist, song.designer, song.level, song.constant]
      .join(" ")
      .normalize("NFKC")
      .toLocaleLowerCase()
      .includes(search),
  );

  useLayoutEffect(() => {
    if (viewport.current) viewport.current.scrollTop = scrollPosition.current;
  }, [query, scrollPosition]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-card text-card-foreground">
      <div className="relative m-3 shrink-0">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchInput}
          role="searchbox"
          enterKeyHint="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          aria-label={t("ui.bundlePage.searchBeatmaps")}
          className="h-11 pr-11 pl-8 sm:h-8 sm:pr-8 pointer-coarse:h-11 pointer-coarse:pr-11"
        />
        {query ? (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 size-11 text-muted-foreground sm:size-8 pointer-coarse:size-11"
            aria-label={t("ui.bundleList.clearSearch")}
            onClick={() => {
              onQueryChange("");
              searchInput.current?.focus();
            }}
          >
            <X />
          </Button>
        ) : null}
      </div>
      <ScrollAreaRoot className="min-h-0 flex-1">
        <ScrollAreaViewport
          ref={viewport}
          role="region"
          aria-label={t("ui.bundlePage.songsSectionTitle", { count: songs.length })}
          className="absolute inset-0 overscroll-contain"
          onScroll={(event) => {
            scrollPosition.current = event.currentTarget.scrollTop;
          }}
        >
          <ul className="divide-y divide-border">
            {matches.map((song) => (
              <li
                key={song.id}
                className={cn(
                  "flex items-center gap-1 border-l-2 border-transparent pr-2 transition-colors hover:has-[>button:hover]:bg-muted dark:hover:has-[>button:hover]:bg-muted/50",
                  selectedId === song.id && "border-l-primary bg-accent",
                )}
              >
                <Button
                  variant="ghost"
                  className="h-auto min-w-0 flex-1 justify-start gap-2.5 rounded-none px-2 py-3 text-left text-foreground hover:bg-transparent dark:hover:bg-transparent"
                  aria-label={`${t("ui.preview.open")}: ${song.title} · ${song.level} · ${song.designer ?? ""}`}
                  aria-pressed={selectedId === song.id}
                  title={[song.title, song.artist, song.designer].filter(Boolean).join(" · ")}
                  onClick={() => onSelect(song)}
                >
                  <RemoteImage
                    src={song.jacketUrl}
                    alt=""
                    className="size-10 shrink-0 bg-muted"
                    fallbackIconClassName="size-4 text-muted-foreground"
                  />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block truncate text-sm font-semibold">{song.title}</span>
                    {song.artist ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {song.artist}
                      </span>
                    ) : null}
                    <span className="flex min-w-0 items-center gap-2 text-xs">
                      <span className="shrink-0">
                        <DifficultyLevelChip {...song} />
                      </span>
                      <span className="truncate text-muted-foreground">{song.designer}</span>
                    </span>
                  </span>
                </Button>
                <div className="flex shrink-0 flex-col gap-1 py-1">
                  {song.previewUrl ? (
                    <Button
                      variant={playingId === song.id ? "secondary" : "ghost"}
                      size="icon-xs"
                      className={actionButtonClassName}
                      aria-label={`${t("ui.uploadDetail.song.playPreview")}: ${song.title}`}
                      aria-pressed={playingId === song.id}
                      title={t("ui.uploadDetail.song.playPreview")}
                      onClick={() => onPlayAudio(song)}
                    >
                      {playingId === song.id ? (
                        <Pause className="size-4 sm:size-3 pointer-coarse:size-4" />
                      ) : (
                        <Headphones className="size-4 sm:size-3 pointer-coarse:size-4" />
                      )}
                    </Button>
                  ) : null}
                  {song.videoUrl ? (
                    <a
                      href={song.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon-xs" }),
                        actionButtonClassName,
                      )}
                      aria-label={`${t("ui.bundlePage.videoLink")}: ${song.title}`}
                      title={t("ui.bundlePage.videoLink")}
                    >
                      <Video className="size-4 sm:size-3 pointer-coarse:size-4" />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {!matches.length ? (
            <output className="block p-4 text-sm text-muted-foreground">
              {t("ui.bundlePage.noMatchingBeatmaps")}
            </output>
          ) : null}
        </ScrollAreaViewport>
        <ScrollBar />
      </ScrollAreaRoot>
      <div className="shrink-0 border-t px-3 py-2 text-xs text-muted-foreground" aria-live="polite">
        {t("ui.bundlePage.beatmapCount", { count: matches.length, total: songs.length })}
      </div>
    </div>
  );
}
