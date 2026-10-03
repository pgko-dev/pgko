import type { ChartDiagnostic, ChartLayout, PreparedChart, UgcChart } from "ugc-render";
import * as v from "valibot";

import { BundleFilesResponseSchema, type BundleFilesResponse } from "@pgko-dev/schema";

import { apiClient } from "@/lib/api";

import { parseInWorker } from "./worker-client";

export class PreviewLoadError extends Error {
  readonly code: "pending" | "unavailable" | "invalid" | "revision" | "network" | "timeout";
  readonly diagnostics: ChartDiagnostic[];
  constructor(code: PreviewLoadError["code"], diagnostics: ChartDiagnostic[] = []) {
    super(code);
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

export type LoadedBeatmap = {
  chart: UgcChart;
  layout: ChartLayout;
  hits: number[];
  diagnostics: ChartDiagnostic[];
  musicUrl?: string;
  revision: number;
};
type ManifestBeatmap = BundleFilesResponse["charts"][number];
export const musicUrlFor = (file: ManifestBeatmap, bgm: string) => {
  const mapping = Object.hasOwn(file.fileMappings, bgm) ? file.fileMappings[bgm] : undefined;
  return mapping?.status === "ready" ? mapping.url : undefined;
};

async function readBeatmap(response: Response): Promise<ArrayBuffer> {
  if (!response.ok) throw new PreviewLoadError("network");
  const maximumBytes = 16 * 1024 * 1024;
  const reader = response.body?.getReader();
  if (!reader) throw new PreviewLoadError("network");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > maximumBytes) throw new PreviewLoadError("invalid");
      chunks.push(next.value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}

/** Song pack cache with a fixed entry limit. Never retains media, workers or canvases. */
export class PreviewLoader {
  private readonly cached = new Map<string, PreparedChart>();
  private scope?: string;

  async manifest(bundleId: string, revision: number, signal: AbortSignal) {
    const scope = `${bundleId}:${revision}`;
    if (this.scope !== scope) {
      this.cached.clear();
      this.scope = scope;
    }
    const response = await apiClient.get(`/api/bundles/${bundleId}/files`, { signal });
    signal.throwIfAborted();
    const manifest = v.parse(BundleFilesResponseSchema, response.data);
    if (manifest.revision !== revision) {
      this.cached.clear();
      throw new PreviewLoadError("revision");
    }
    if (manifest.status === "pending") throw new PreviewLoadError("pending");
    return manifest;
  }

  async load(
    bundleId: string,
    beatmapId: string,
    revision: number,
    signal: AbortSignal,
  ): Promise<LoadedBeatmap> {
    let manifest = await this.manifest(bundleId, revision, signal);
    const key = `${bundleId}:${revision}:${beatmapId}`;
    let parsed = this.cached.get(key);
    let entry = manifest.charts.find((beatmap) => beatmap.id === beatmapId);
    if (entry?.file.status !== "ready") throw new PreviewLoadError("unavailable");

    if (!parsed) {
      let bytes: ArrayBuffer;
      try {
        bytes = await readBeatmap(await fetch(entry.file.url, { signal, credentials: "omit" }));
      } catch (error) {
        if (signal.aborted || (error instanceof PreviewLoadError && error.code === "invalid"))
          throw error;
        manifest = await this.manifest(bundleId, revision, signal);
        entry = manifest.charts.find((beatmap) => beatmap.id === beatmapId);
        if (entry?.file.status !== "ready") throw new PreviewLoadError("unavailable");
        bytes = await readBeatmap(await fetch(entry.file.url, { signal, credentials: "omit" }));
      }
      parsed = await parseBeatmap(bytes, signal);
      this.cached.set(key, parsed);
      if (this.cached.size > 3) this.cached.delete(this.cached.keys().next().value!);
    }
    if (!parsed.chart || !parsed.layout || !parsed.hits)
      throw new PreviewLoadError("invalid", parsed.diagnostics);
    return {
      chart: parsed.chart,
      layout: parsed.layout,
      hits: parsed.hits,
      diagnostics: parsed.diagnostics,
      revision,
      musicUrl: musicUrlFor(entry, parsed.chart.metadata.bgm),
    };
  }
}

async function parseBeatmap(bytes: ArrayBuffer, signal: AbortSignal) {
  try {
    const parsed = await parseInWorker(bytes, signal);
    signal.throwIfAborted();
    return parsed;
  } catch (error) {
    if (signal.aborted) throw error;
    throw new PreviewLoadError("invalid");
  }
}
