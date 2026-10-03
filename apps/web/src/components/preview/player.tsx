import { Maximize, Minimize, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { PreparedChart } from "@pgko.dev/ugc-render";
import { createTiming } from "@pgko.dev/ugc-render";
import type { ChartRenderOptions } from "@pgko.dev/ugc-render/canvas";
import { ChartTransport, type TransportSnapshot } from "@pgko.dev/ugc-render/playback";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { PreviewControls } from "./controls.js";
import { PreviewDiagnostics } from "./diagnostics.js";
import { PreviewViewport } from "./viewport.js";

type Props = {
  prepared: Extract<PreparedChart, { chart: object }>;
  title: string;
  artist?: string;
  designer?: string;
  musicUrl?: string;
  refreshMusic?: (signal: AbortSignal) => Promise<string | undefined>;
  pauseSignal: number;
  onPlaybackStart: () => void;
  onClose: () => void;
  fitContainer?: boolean;
};

export function PreviewPlayer({
  prepared,
  title,
  artist = prepared.chart.metadata.artist,
  designer = prepared.chart.metadata.designer,
  musicUrl,
  refreshMusic,
  pauseSignal,
  onPlaybackStart,
  onClose,
  fitContainer = false,
}: Readonly<Props>) {
  const { t } = useTranslation(undefined, { keyPrefix: "ui.preview" });
  const panel = useRef<HTMLElement>(null);
  const transport = useRef<ChartTransport | null>(null);
  const timing = useMemo(
    () => createTiming(prepared.chart, prepared.layout.endTick),
    [prepared.chart, prepared.layout.endTick],
  );
  const { hits } = prepared;
  const displayTitle = [title, artist]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" - ");
  const subtitle = designer.trim();
  const [snapshot, setSnapshot] = useState<TransportSnapshot>({
    position: 0,
    duration: timing.chartEnd,
    state: "paused",
    musicUnavailable: !musicUrl,
    needsContinuation: false,
    soundUnavailable: false,
  });
  const [position, setPosition] = useState(0);
  const [zoom, setZoom] = useState(0.5);
  const isMobile = useIsMobile();
  const fitted = fitContainer && !isMobile;
  const [portraitOverride, setPortraitOverride] = useState<boolean>();
  const portrait = portraitOverride ?? isMobile;
  const [renderOptions, setRenderOptions] = useState<ChartRenderOptions>({});
  const [expanded, setExpanded] = useState(false);
  const [playError, setPlayError] = useState(false);
  const seekTick = useCallback(
    (tick: number) => transport.current?.seek(timing.tickToSeconds(tick)),
    [timing],
  );

  useEffect(() => {
    const requests = new AbortController();
    let active = true;
    const engine = new ChartTransport({
      timing,
      hits,
      musicUrl,
      tapUrl: "/assets/tap.wav",
      onChange: (state) => {
        if (!active) return;
        setSnapshot(state);
        if (state.state !== "playing") setPosition(state.position);
      },
      onError: () => {
        if (active) setPlayError(true);
      },
      refreshMusic: refreshMusic ? () => refreshMusic(requests.signal) : undefined,
    });
    transport.current = engine;
    setSnapshot(engine.snapshot());
    const onVisibility = () => {
      if (document.hidden) engine.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      requests.abort();
      document.removeEventListener("visibilitychange", onVisibility);
      engine.dispose();
      transport.current = null;
    };
  }, [timing, hits, musicUrl, refreshMusic]);

  useEffect(() => {
    transport.current?.pause();
  }, [pauseSignal]);
  useEffect(() => {
    if (snapshot.state !== "playing") return;
    let frame: number;
    const update = () => {
      setPosition(transport.current?.position ?? 0);
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [snapshot.state]);

  useEffect(() => {
    const element = panel.current;
    const changed = () => {
      if (!document.fullscreenElement) setExpanded(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) setExpanded(false);
    };
    document.addEventListener("fullscreenchange", changed);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("fullscreenchange", changed);
      document.removeEventListener("keydown", escape);
      if (document.fullscreenElement === element) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  const toggle = () => {
    setPlayError(false);
    const engine = transport.current;
    if (!engine) return;
    if (engine.snapshot().state !== "paused") engine.pause();
    else {
      onPlaybackStart();
      void engine.play();
    }
  };
  const navigateBar = (direction: -1 | 1) => {
    const tick = timing.secondsToTick(transport.current?.position ?? position);
    const target =
      direction === 1
        ? prepared.layout.bars.find((bar) => bar.startTick > tick + 1)
        : prepared.layout.bars.findLast((bar) => bar.startTick < tick - 1);
    seekTick(target?.startTick ?? (direction === 1 ? prepared.layout.endTick : 0));
  };

  return (
    <section
      ref={panel}
      className={cn(
        fitted && "flex h-full min-h-0 flex-col",
        expanded && "fixed inset-0 z-50 flex flex-col overflow-auto bg-background",
      )}
      aria-label={t("title")}
      onKeyDown={(event) => {
        if (
          (event.target as HTMLElement).closest(
            "input,select,button,a,summary,textarea,[contenteditable],[role=option],[role=listbox]",
          )
        )
          return;
        if (event.code === "Space") {
          event.preventDefault();
          toggle();
        }
        if (event.key === "[") {
          event.preventDefault();
          navigateBar(-1);
        }
        if (event.key === "]") {
          event.preventDefault();
          navigateBar(1);
        }
      }}
    >
      <Card
        className={cn(
          "gap-3",
          fitted && "min-h-0 flex-1",
          expanded && "flex-1 overflow-visible rounded-none",
        )}
      >
        <CardHeader className="shrink-0">
          <h3 className="min-w-0 truncate font-semibold" title={displayTitle}>
            {displayTitle}
          </h3>
          {subtitle ? <CardDescription className="break-words">{subtitle}</CardDescription> : null}
          <CardAction className={cn("flex gap-1", !subtitle && "row-span-1")}>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t("expand")}
              aria-pressed={expanded}
              onClick={() => {
                setExpanded(!expanded);
                if (expanded && document.fullscreenElement)
                  void document.exitFullscreen().catch(() => {});
                else if (!expanded) void panel.current?.requestFullscreen?.().catch(() => {});
              }}
            >
              {expanded ? <Minimize /> : <Maximize />}
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={t("close")} onClick={onClose}>
              <X />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent
          className={cn(
            "flex flex-col gap-3 *:shrink-0",
            fitted && "min-h-0 flex-1",
            expanded && "flex-1",
          )}
        >
          <PreviewDiagnostics diagnostics={prepared.diagnostics} />
          {snapshot.needsContinuation ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onPlaybackStart();
                transport.current?.continueWithoutMusic();
              }}
            >
              {t("continueWithoutMusic")}
            </Button>
          ) : null}
          {playError ? (
            <p role="alert" className="text-sm text-destructive">
              {t("playError")}
            </p>
          ) : null}
          <PreviewViewport
            chart={prepared.chart}
            zoom={zoom}
            expanded={expanded || fitted}
            portrait={portrait}
            tick={timing.secondsToTick(position)}
            playing={snapshot.state === "playing"}
            onSeek={seekTick}
            label={t("beatmapRegion")}
            options={renderOptions}
          />
          <PreviewControls
            transport={transport}
            snapshot={snapshot}
            position={position}
            zoom={zoom}
            onZoomChange={setZoom}
            portrait={portrait}
            onPortraitChange={setPortraitOverride}
            options={renderOptions}
            onOptionsChange={setRenderOptions}
            onToggle={toggle}
            onNavigateBar={navigateBar}
            container={panel}
            expanded={expanded}
          />
        </CardContent>
      </Card>
    </section>
  );
}
