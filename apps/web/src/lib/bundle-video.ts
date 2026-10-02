export type SongWithVideoUrl = {
  videoUrl?: string | null;
};

export function getBundleVideoUrl(
  bundleVideoUrl: string | null | undefined,
  songs: SongWithVideoUrl[],
): string | null {
  if (bundleVideoUrl) return bundleVideoUrl;

  const firstWithVideo = songs.find((song) => song.videoUrl);
  return firstWithVideo?.videoUrl ?? null;
}
