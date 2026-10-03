import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import type { PreparedChart } from "@pgko.dev/ugc-render";
import { prepareInWorker } from "@pgko.dev/ugc-render/worker";

import { PreviewDiagnostics } from "../../src/components/preview/diagnostics";
import { PreviewPlayer } from "../../src/components/preview/player";
import { Button } from "../../src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../src/components/ui/card";
import { Input } from "../../src/components/ui/input";
import { Label } from "../../src/components/ui/label";
import { fixture } from "../fixtures/beatmap";
import toneUrl from "../fixtures/tone.opus?url";

import { Harness } from "./harness";
import "./observe-audio";

const scenario = new URLSearchParams(location.search).get("fixture");
const fixtureMusic = new URL(toneUrl, location.href);
fixtureMusic.hostname = location.hostname === "localhost" ? "127.0.0.1" : "localhost";

function fixtureSource(replace: boolean) {
  if (replace) return "@BPM\t0'0\t120\n#3'0:t84";
  if (scenario === "invalid") return "@BPM\t0'0\t0\n#100:s";
  if (scenario === "partial") return `${fixture}\n@FUTURE\t1`;
  if (scenario !== "large") return fixture;
  const large = Array.from({ length: 256 }, (_, bar) =>
    Array.from(
      { length: 16 },
      (_, beat) => `#${bar}'${beat * 120}:t${(beat % 8).toString(36)}4`,
    ).join("\n"),
  ).join("\n");
  return `${fixture}\n${large}`;
}

type Session = {
  prepared: PreparedChart;
  title: string;
  musicUrl?: string;
};

function PreviewLab() {
  const [session, setSession] = useState<Session>();
  const [beatmapFile, setBeatmapFile] = useState<File>();
  const [musicFile, setMusicFile] = useState<File>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [pauseSignal, setPauseSignal] = useState(0);
  const [starts, setStarts] = useState(0);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const url = session?.musicUrl;
    return () => {
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [session?.musicUrl]);

  const close = () => {
    request.current?.abort();
    setSession(undefined);
    setLoading(false);
    setError(undefined);
  };

  const load = async (source: File | string, music?: File | string) => {
    close();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    try {
      if (source instanceof File && source.size > 16 * 1024 * 1024) {
        throw new Error("Beatmaps must be 16 MiB or smaller.");
      }
      const bytes =
        typeof source === "string"
          ? new TextEncoder().encode(source).buffer
          : await source.arrayBuffer();
      controller.signal.throwIfAborted();
      const prepared = await prepareInWorker(bytes, {
        signal: controller.signal,
        createWorker: () =>
          new Worker(new URL("./parser.worker.ts", import.meta.url), { type: "module" }),
      });
      controller.signal.throwIfAborted();
      const title =
        source instanceof File
          ? prepared.chart?.metadata.title || source.name
          : "Authored UGC fixture";
      const musicUrl =
        prepared.chart && music instanceof File ? URL.createObjectURL(music) : undefined;
      setSession({ prepared, title, musicUrl: typeof music === "string" ? music : musicUrl });
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(reason instanceof Error ? reason.message : "Could not open the beatmap.");
      }
    } finally {
      // react-doctor-disable-next-line react-doctor/no-loading-flag-reset-outside-finally -- close() clears canceled loads; an obsolete request must not clear the next load.
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const loadFixture = (replace = false) =>
    load(fixtureSource(replace), scenario === "silent" ? undefined : fixtureMusic.href);

  return (
    <Harness>
      <Card>
        <CardHeader>
          <CardTitle>Local files</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (beatmapFile) void load(beatmapFile, musicFile);
            }}
            onReset={() => {
              close();
              setBeatmapFile(undefined);
              setMusicFile(undefined);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="local-beatmap">Beatmap (.ugc)</Label>
              <Input
                id="local-beatmap"
                type="file"
                accept=".ugc"
                onChange={(event) => {
                  close();
                  setBeatmapFile(event.target.files?.[0]);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="local-music">Music (optional)</Label>
              <Input
                id="local-music"
                type="file"
                accept="audio/*,.opus,.ogg,.wav,.mp3,.flac,.m4a"
                onChange={(event) => {
                  close();
                  setMusicFile(event.target.files?.[0]);
                }}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={!beatmapFile || loading}>
                Load local files
              </Button>
              <Button type="reset" variant="outline">
                Clear files
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => void loadFixture()}>
          Open preview
        </Button>
        <Button variant="outline" onClick={() => void loadFixture(true)}>
          Replace beatmap
        </Button>
        <Button variant="outline" onClick={() => setPauseSignal((value) => value + 1)}>
          Host pause
        </Button>
        <span className="text-sm text-muted-foreground">
          Playback starts: <output aria-label="Playback starts">{starts}</output>
        </span>
      </div>
      {loading ? (
        <output className="block text-sm text-muted-foreground">Loading beatmap…</output>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {session?.prepared.chart ? (
        <PreviewPlayer
          prepared={session.prepared}
          title={session.title}
          musicUrl={session.musicUrl}
          pauseSignal={pauseSignal}
          onPlaybackStart={() => setStarts((value) => value + 1)}
          onClose={close}
        />
      ) : session ? (
        <PreviewDiagnostics diagnostics={session.prepared.diagnostics} />
      ) : null}
    </Harness>
  );
}

createRoot(document.getElementById("root")!).render(<PreviewLab />);
