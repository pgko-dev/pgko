import {
  AudioLines,
  Music2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useId, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { PREVIEW_ZOOMS } from "ugc-render";
import type { ChartRenderOptions } from "ugc-render/canvas";
import type { ChartTransport, TransportSnapshot } from "ugc-render/playback";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
const playbackLabels = { paused: "play", playing: "pause", buffering: "buffering" } as const;

type SettingsProps = {
  transport: RefObject<ChartTransport | null>;
  snapshot: TransportSnapshot;
  options: ChartRenderOptions;
  onOptionsChange: (options: ChartRenderOptions) => void;
  container: RefObject<HTMLElement | null>;
  expanded: boolean;
  portrait: boolean;
  onPortraitChange: (value: boolean) => void;
};

export function PreviewControls({
  transport,
  snapshot,
  position,
  zoom,
  onZoomChange,
  options,
  onOptionsChange,
  onToggle,
  onNavigateBar,
  container,
  expanded,
  portrait,
  onPortraitChange,
}: Readonly<
  SettingsProps & {
    position: number;
    zoom: number;
    onZoomChange: (value: number) => void;
    onToggle: () => void;
    onNavigateBar: (direction: -1 | 1) => void;
  }
>) {
  const { t } = useTranslation(undefined, { keyPrefix: "ui.preview" });
  const previousZoom = PREVIEW_ZOOMS.findLast((value) => value < zoom);
  const nextZoom = PREVIEW_ZOOMS.find((value) => value > zoom);

  return (
    <div data-slot="preview-controls" className="rounded-xl border bg-muted/30 px-3 pt-0.5 pb-3">
      <div className="flex items-center gap-3">
        <Slider
          min={0}
          max={snapshot.duration}
          step={0.01}
          value={position}
          aria-label={t("seek")}
          aria-valuetext={formatTime(position)}
          onValueChange={(value) => transport.current?.seek(value)}
        />
        <span className="shrink-0 text-xs tabular-nums">
          {formatTime(position)}
          <span className="text-muted-foreground"> / {formatTime(snapshot.duration)}</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={t("restart")}
            title={t("restart")}
            onClick={() => transport.current?.seek(0)}
          >
            <RotateCcw />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={t("previousBar")}
            title={t("previousBar")}
            onClick={() => onNavigateBar(-1)}
          >
            <SkipBack />
          </Button>
          <Button
            className="min-w-9 px-2 sm:min-w-24 sm:px-4"
            size="lg"
            onClick={onToggle}
            disabled={snapshot.needsContinuation}
            aria-label={t(snapshot.state === "paused" ? "play" : "pause")}
          >
            {snapshot.state === "paused" ? <Play /> : <Pause />}
            <span className="hidden sm:inline">{t(playbackLabels[snapshot.state])}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={t("nextBar")}
            title={t("nextBar")}
            onClick={() => onNavigateBar(1)}
          >
            <SkipForward />
          </Button>
          <PreviewSettings
            transport={transport}
            snapshot={snapshot}
            options={options}
            onOptionsChange={onOptionsChange}
            container={container}
            expanded={expanded}
            portrait={portrait}
            onPortraitChange={onPortraitChange}
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={t("zoomOut")}
            title={t("zoomOut")}
            disabled={previousZoom === undefined}
            onClick={() => {
              if (previousZoom !== undefined) onZoomChange(previousZoom);
            }}
          >
            <ZoomOut />
          </Button>
          <output aria-label={t("zoom")} className="min-w-11 text-center text-xs tabular-nums">
            {zoom * 100}%
          </output>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={t("zoomIn")}
            title={t("zoomIn")}
            disabled={nextZoom === undefined}
            onClick={() => {
              if (nextZoom !== undefined) onZoomChange(nextZoom);
            }}
          >
            <ZoomIn />
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreviewSettings({
  transport,
  snapshot,
  options,
  onOptionsChange,
  container,
  expanded,
  portrait,
  onPortraitChange,
}: Readonly<SettingsProps>) {
  const { t } = useTranslation(undefined, { keyPrefix: "ui.preview" });
  const [musicVolume, setMusicVolume] = useState(0.85);
  const [hitVolume, setHitVolume] = useState(0.5);
  const id = useId();

  return (
    <Popover key={expanded ? "expanded" : "inline"}>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon-lg" />}
        aria-label={t("settings")}
        title={t("settings")}
      >
        <SlidersHorizontal />
      </PopoverTrigger>
      <PopoverContent container={container} side="top" align="end" className="gap-4 p-4">
        <PopoverTitle>{t("settings")}</PopoverTitle>
        <div>
          <div className="flex items-center justify-between">
            <Label id={`${id}-music`}>
              <Music2 className="size-4 text-muted-foreground" />
              {t("musicVolume")}
            </Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {Math.round(musicVolume * 100)}%
            </span>
          </div>
          <Slider
            aria-labelledby={`${id}-music`}
            disabled={snapshot.musicUnavailable}
            min={0}
            max={1}
            step={0.05}
            value={musicVolume}
            onValueChange={(value) => {
              setMusicVolume(value);
              transport.current?.setVolumes(value, hitVolume);
            }}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label id={`${id}-hits`}>
              <AudioLines className="size-4 text-muted-foreground" />
              {t("hitVolume")}
            </Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {Math.round(hitVolume * 100)}%
            </span>
          </div>
          <Slider
            aria-labelledby={`${id}-hits`}
            disabled={snapshot.soundUnavailable}
            min={0}
            max={1}
            step={0.05}
            value={hitVolume}
            onValueChange={(value) => {
              setHitVolume(value);
              transport.current?.setVolumes(musicVolume, value);
            }}
          />
        </div>
        <Label htmlFor={`${id}-portrait`} className="border-t pt-4">
          <Checkbox id={`${id}-portrait`} checked={portrait} onCheckedChange={onPortraitChange} />
          {t("portrait")}
        </Label>
        <Label htmlFor={`${id}-controls`}>
          <Checkbox
            id={`${id}-controls`}
            checked={options.showControlPoints ?? false}
            onCheckedChange={(checked) => onOptionsChange({ showControlPoints: checked })}
          />
          {t("showControlPoints")}
        </Label>
        <a
          className="border-t pt-4 text-xs text-muted-foreground underline hover:text-foreground"
          href="/assets/NOTICE.txt"
          target="_blank"
          rel="noreferrer"
        >
          {t("credits")}
        </a>
      </PopoverContent>
    </Popover>
  );
}
