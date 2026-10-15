import * as v from "valibot";

const bundleBeatmapSearchSchema = v.object({
  // Missing selects the first beatmap; null explicitly closes the preview.
  bId: v.fallback(v.optional(v.nullable(v.pipe(v.string(), v.nonEmpty()))), undefined),
});

export type BundleBeatmapSearch = v.InferOutput<typeof bundleBeatmapSearchSchema>;

export function validateBundleBeatmapSearch(search: Record<string, unknown>) {
  return v.parse(bundleBeatmapSearchSchema, search);
}

export function resolveBundleBeatmapId(
  songs: readonly { id: string }[],
  beatmapId: BundleBeatmapSearch["bId"],
): string | null {
  if (beatmapId === null) return null;

  return songs.find((song) => song.id === beatmapId)?.id ?? songs[0]?.id ?? null;
}
