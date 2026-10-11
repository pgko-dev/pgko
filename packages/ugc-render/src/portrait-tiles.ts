import { NOTE_PADDING, type PreviewColumn } from "./layout.js";
import { portraitColumn, type PortraitLayout } from "./portrait.js";
import { ChartPainter, type ChartRenderOptions } from "./renderer.js";

const TILE_HEIGHT = 512;
const MAX_BYTES = 64 * 1024 * 1024;

/** Viewport-local canvases keep long charts bounded without repainting notes on every frame. */
export class PortraitTiles {
  private readonly tiles = new Map<number, HTMLCanvasElement>();
  private ratio = 0;
  private paints = 0;
  private readonly padding: number;

  constructor(
    private readonly painter: ChartPainter,
    private readonly view: PortraitLayout,
    private readonly options: ChartRenderOptions,
    private readonly pixelRatio = globalThis.devicePixelRatio || 1,
  ) {
    this.padding = Math.ceil(Math.max(64, (NOTE_PADDING + 56) * view.scale));
  }

  private release(index: number) {
    const tile = this.tiles.get(index);
    if (!tile) return;
    tile.width = 0;
    tile.height = 0;
    this.tiles.delete(index);
  }

  dispose() {
    for (const index of this.tiles.keys()) this.release(index);
  }

  paint(surface: HTMLCanvasElement, scrollTop: number) {
    const { view, padding } = this;
    const overscan = Math.ceil(view.height / TILE_HEIGHT);
    const maximumTiles = overscan * 3 + 2;
    const tileHeight = TILE_HEIGHT + padding * 2;
    const ratio = Math.min(
      this.pixelRatio,
      2,
      Math.sqrt((MAX_BYTES * 0.98) / (view.width * (view.height + maximumTiles * tileHeight) * 4)),
    );
    if (ratio !== this.ratio) {
      this.dispose();
      this.ratio = ratio;
    }
    const width = Math.max(1, Math.floor(view.width * ratio));
    const height = Math.max(1, Math.floor(view.height * ratio));
    if (surface.width !== width) surface.width = width;
    if (surface.height !== height) surface.height = height;
    const visible = portraitColumn(view, scrollTop);
    const origin = (visible.bottomY + visible.startTick * visible.pixelsPerTick) * view.scale;
    const first = Math.floor(-origin / TILE_HEIGHT);
    const last = Math.floor((view.height - origin - 1e-6) / TILE_HEIGHT);
    for (const index of this.tiles.keys()) {
      if (index < first - overscan || index > last + overscan) this.release(index);
    }

    // Visible tiles are always painted first; padding is cropped during composition.
    const indices = [
      ...Array.from({ length: last - first + 1 }, (_, offset) => first + offset),
      ...Array.from({ length: overscan }, (_, offset) => first - offset - 1),
      ...Array.from({ length: overscan }, (_, offset) => last + offset + 1),
    ];
    for (const index of indices) {
      if (this.tiles.has(index)) continue;
      const tile = document.createElement("canvas");
      tile.width = width;
      tile.height = Math.ceil(tileHeight * ratio);
      const context = tile.getContext("2d")!;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = "#000000";
      context.fillRect(0, 0, view.width, tileHeight);
      const top = index * TILE_HEIGHT - padding;
      const startTick = Math.max(0, -(top + tileHeight) / view.pixelsPerTick);
      const endTick = Math.min(view.layout.endTick, -top / view.pixelsPerTick);
      if (endTick >= startTick) {
        const column: PreviewColumn = {
          index: 0,
          startTick,
          packedEndTick: endTick,
          lookAheadEndTick: endTick,
          pixelsPerTick: view.pixelsPerTick / view.scale,
          bottomY: (-startTick * view.pixelsPerTick - top) / view.scale,
        };
        context.translate(view.offsetX, 0);
        context.scale(view.scale, view.scale);
        this.painter.paint(context, column, view.scale, { ...this.options, labelSize: 12 });
        this.paints++;
      }
      this.tiles.set(index, tile);
    }

    const context = surface.getContext("2d")!;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = "#000000";
    context.fillRect(0, 0, view.width, view.height);
    for (let index = first; index <= last; index++) {
      context.drawImage(
        this.tiles.get(index)!,
        0,
        padding * ratio,
        width,
        TILE_HEIGHT * ratio,
        0,
        index * TILE_HEIGHT + origin,
        width / ratio,
        TILE_HEIGHT,
      );
    }
    const bytes = [...this.tiles.values()].reduce(
      (total, tile) => total + tile.width * tile.height * 4,
      0,
    );
    surface.dataset.cacheBytes = String(bytes);
    surface.dataset.tilePaints = String(this.paints);
    surface.dataset.visibleTiles = String(last - first + 1);
    return visible;
  }
}
