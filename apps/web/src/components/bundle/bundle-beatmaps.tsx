import { useMediaQuery } from "@mantine/hooks";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { SongSummary } from "@pgko.dev/schema";

import { PreviewPlaceholder } from "@/components/preview/placeholder";
import Preview from "@/components/preview/preview";
import { usePreviewAudio } from "@/hooks/use-preview-audio";
import { PreviewLoader } from "@/lib/preview/loader";
import { cn } from "@/lib/utils";

import { BundleBeatmapList } from "./bundle-beatmap-list";
import { BundleBeatmapToolbar } from "./bundle-beatmap-toolbar";

export function BundleBeatmaps({
  songs,
  bundleId,
  revision,
  onRevisionChange,
}: Readonly<{
  songs: readonly SongSummary[];
  bundleId: string;
  revision: number;
  onRevisionChange: () => void;
}>) {
  const { t } = useTranslation();
  const { audioRef, playingId, setPlayingId, playPreview, stopPreview } = usePreviewAudio();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pauseSignal, setPauseSignal] = useState(0);
  const desktop = useMediaQuery("(min-width: 1024px)", undefined, {
    getInitialValueInEffect: false,
  });
  const showList = desktop && !collapsed;
  const scrollPosition = useRef(0);
  const loader = useMemo(() => new PreviewLoader(), []);
  const selectedIndex = songs.findIndex((song) => song.id === selectedId);
  const selected = songs[selectedIndex];
  const closePreview = useCallback(() => setSelectedId(null), []);
  const revisionChanged = useCallback(() => {
    setSelectedId(null);
    onRevisionChange();
  }, [onRevisionChange]);

  const select = (song: SongSummary) => {
    stopPreview();
    setSelectedId(song.id);
    setPickerOpen(false);
  };
  const list = (
    <BundleBeatmapList
      songs={songs}
      selectedId={selected?.id}
      playingId={playingId}
      query={query}
      onQueryChange={(value) => {
        scrollPosition.current = 0;
        setQuery(value);
      }}
      onSelect={select}
      onPlayAudio={(song) => {
        setPauseSignal((value) => value + 1);
        playPreview(song);
      }}
      scrollPosition={scrollPosition}
    />
  );

  return (
    <section
      className="flex min-h-0 flex-1 flex-col gap-3"
      aria-label={t("ui.bundlePage.beatmapBrowser")}
    >
      <BundleBeatmapToolbar
        desktop={desktop}
        showList={showList}
        onToggleList={() => setCollapsed(!collapsed)}
        selected={selected}
        selectedIndex={selectedIndex}
        count={songs.length}
        pickerOpen={pickerOpen}
        onPickerOpenChange={setPickerOpen}
        onNavigate={(direction) => select(songs[selectedIndex + direction])}
      >
        {list}
      </BundleBeatmapToolbar>
      <div
        className={cn("grid min-h-0 flex-1 gap-3", showList && "grid-cols-[20rem_minmax(0,1fr)]")}
      >
        {showList ? (
          <aside
            className="min-h-0 overflow-hidden border"
            aria-label={t("ui.bundlePage.selectBeatmap")}
          >
            {list}
          </aside>
        ) : null}
        {selected ? (
          <Preview
            key={selected.id}
            bundleId={bundleId}
            revision={revision}
            song={selected}
            pauseSignal={pauseSignal}
            onClose={closePreview}
            onPlaybackStart={stopPreview}
            onRevisionChange={revisionChanged}
            loader={loader}
            fitContainer
          />
        ) : (
          <PreviewPlaceholder
            message={t(songs.length ? "ui.bundlePage.selectBeatmap" : "ui.bundlePage.noBeatmaps")}
            fitContainer
          />
        )}
      </div>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} hidden>
        <track kind="captions" />
      </audio>
    </section>
  );
}
