import type { BundlePublicDetail, SongSummary } from "@pgko.dev/schema";

export const bundleId = "00000000-0000-4000-8000-000000000001";
export const songs: SongSummary[] = Array.from({ length: 24 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 2).padStart(12, "0")}`,
  ugcPath: `fixture-${index + 1}.ugc`,
  songId: `fixture-${index + 1}`,
  title: `Beatmap ${String(index + 1).padStart(2, "0")}`,
  artist: index % 2 ? "Second artist" : "First artist",
  difficulty: 3,
  level: "13+",
  constant: 13.5,
  weAttribute: null,
  bpm: 120,
  designer: index % 2 ? "Second designer" : "First designer",
  assetReferences: null,
  previewUrl: "/excerpt.wav",
  videoUrl: "https://example.test/video",
}));

export const bundle: BundlePublicDetail = {
  id: bundleId,
  filesUrl: `/api/bundles/${bundleId}/files`,
  title: "Synthetic collection",
  artist: "Various artists",
  description: "Authored fixtures for the bundle page integration tests.",
  releasedAt: new Date("2026-01-01T00:00:00Z"),
  reuploadedAt: null,
  revision: 1,
  tags: ["Synthetic"],
  songs,
  uploadedBy: { id: "fixture-author", name: "Fixture author", slug: "fixture-author" },
  collaborators: [],
  downloadCount: 0,
  visibility: "public",
};
