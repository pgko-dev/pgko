import type { ChartTransport } from "@pgko.dev/ugc-render/playback";

declare global {
  interface Window {
    previewTransport?: ChartTransport;
    previewMusic: { time: number; offset: number; duration: number }[];
    previewHits: { time: number; endedAt?: number }[];
    previewFrameGaps: number[];
    previewSignals: { input: number; time: number; contextTime: number }[];
    verifyPreviewTiles: () => { zoom: number; distance: number; changed: number; pixels: number }[];
    previewTileDifference?: { actual: string; expected: string };
  }
}
