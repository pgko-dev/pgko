import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { SongSummary } from "@pgko-dev/schema";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";
import { loadWithTimeout } from "@/lib/preview/load-timeout";
import {
  musicUrlFor,
  PreviewLoader,
  PreviewLoadError,
  type LoadedBeatmap,
} from "@/lib/preview/loader";

import { PreviewDiagnostics } from "./diagnostics";
import { PreviewPlaceholder } from "./placeholder";
import type { PreviewPlayer } from "./player";

type Props = {
  bundleId: string;
  revision: number;
  song: SongSummary;
  pauseSignal: number;
  onClose: () => void;
  onPlaybackStart: () => void;
  onRevisionChange: () => void;
  loader?: PreviewLoader;
  fitContainer?: boolean;
};

/** pgko owns manifests, selection identity, URL renewal and coordination with audio preview. */
export default function Preview({
  bundleId,
  revision,
  song,
  pauseSignal,
  onClose,
  onPlaybackStart,
  onRevisionChange,
  loader: providedLoader,
  fitContainer,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const ownedLoader = useMemo(() => new PreviewLoader(), []);
  const loader = providedLoader ?? ownedLoader;
  const [attempt, setAttempt] = useState(0);
  const identity = `${bundleId}:${revision}:${song.id}:${attempt}`;
  const [result, setResult] = useState<{
    identity: string;
    loaded?: LoadedBeatmap;
    Player?: typeof PreviewPlayer;
    error?: PreviewLoadError;
  }>();
  const loaded = result?.identity === identity ? result.loaded : undefined;
  const Player = result?.identity === identity ? result.Player : undefined;
  const error = result?.identity === identity ? result.error : undefined;

  useEffect(() => {
    const controller = new AbortController();
    void loadWithTimeout(controller.signal, async (signal) => {
      const [loaded, { PreviewPlayer }] = await Promise.all([
        loader.load(bundleId, song.id, revision, signal),
        import("./player"),
      ]);
      return { loaded, Player: PreviewPlayer };
    })
      .then(({ loaded, Player }) => {
        if (!controller.signal.aborted) setResult({ identity, loaded, Player });
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const timedOut = reason instanceof DOMException && reason.name === "TimeoutError";
        const fallbackCode = timedOut ? "timeout" : "network";
        const error =
          reason instanceof PreviewLoadError ? reason : new PreviewLoadError(fallbackCode);
        if (error.code === "revision") onRevisionChange();
        else setResult({ identity, error });
      });
    return () => controller.abort();
  }, [loader, bundleId, song.id, revision, onRevisionChange, identity]);

  const refreshMusic = useCallback(
    async (signal: AbortSignal) => {
      if (!loaded) return;
      try {
        const manifest = await loader.manifest(bundleId, revision, signal);
        const entry = manifest.charts.find((beatmap) => beatmap.id === song.id);
        return entry ? musicUrlFor(entry, loaded.chart.metadata.bgm) : undefined;
      } catch (error) {
        if (!signal.aborted && error instanceof PreviewLoadError && error.code === "revision")
          onRevisionChange();
        throw error;
      }
    },
    [loader, bundleId, revision, song.id, loaded, onRevisionChange],
  );

  if (loaded && Player)
    return (
      <Player
        key={identity}
        prepared={loaded}
        title={song.title}
        artist={song.artist ?? undefined}
        designer={song.designer ?? undefined}
        musicUrl={loaded.musicUrl}
        refreshMusic={refreshMusic}
        pauseSignal={pauseSignal}
        onClose={onClose}
        onPlaybackStart={onPlaybackStart}
        fitContainer={fitContainer}
      />
    );

  if (!error)
    return <PreviewPlaceholder message={t("ui.preview.loading")} loading onClose={onClose} />;

  return (
    <section
      aria-label={t("ui.preview.title")}
      className={fitContainer ? "min-h-0 md:h-full" : undefined}
    >
      <Card className={fitContainer ? "md:h-full md:overflow-y-auto" : undefined}>
        <CardHeader>
          <h3 className="font-semibold">
            {song.title} · {t("ui.preview.title")}
          </h3>
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label={t("ui.preview.close")}
            >
              <X />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <output className="block py-4 text-sm text-muted-foreground">
            {t(`ui.preview.errors.${error.code}`)}
          </output>
          <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
            {t("ui.preview.retry")}
          </Button>
          {error.diagnostics.length ? <PreviewDiagnostics diagnostics={error.diagnostics} /> : null}
        </CardContent>
      </Card>
    </section>
  );
}
