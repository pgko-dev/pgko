import { ChartPainter, PortraitTiles } from "@pgko.dev/ugc-render/canvas";

export type PaintSample = { at: number; milliseconds: number };

declare global {
  interface Window {
    previewPaints: PaintSample[];
    previewRenderWork: PaintSample[];
  }
}

window.previewPaints = [];
window.previewRenderWork = [];
let paintingTiles = false;
// oxlint-disable-next-line typescript/unbound-method -- The wrapper restores the tile cache receiver.
const compose = PortraitTiles.prototype.paint;
PortraitTiles.prototype.paint = function (...args) {
  const started = performance.now();
  paintingTiles = true;
  try {
    return compose.apply(this, args);
  } finally {
    paintingTiles = false;
    window.previewRenderWork.push({
      at: performance.now(),
      milliseconds: performance.now() - started,
    });
  }
};
// oxlint-disable-next-line typescript/unbound-method -- The wrapper restores the painter receiver.
const paint = ChartPainter.prototype.paint;
ChartPainter.prototype.paint = function (...args) {
  const started = performance.now();
  try {
    return paint.apply(this, args);
  } finally {
    const sample = { at: performance.now(), milliseconds: performance.now() - started };
    window.previewPaints.push(sample);
    if (!paintingTiles) window.previewRenderWork.push(sample);
  }
};
