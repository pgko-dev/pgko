import { createPortraitLayout, portraitColumn, prepareChart } from "@pgko.dev/ugc-render";
import { ChartPainter, PortraitTiles } from "@pgko.dev/ugc-render/canvas";

import { fixture } from "../fixtures/beatmap";
import type {} from "../fixtures/preview-state";

window.verifyPreviewTiles = () => {
  const prepared = prepareChart(new TextEncoder().encode(fixture));
  if (!prepared.chart) throw new Error("Invalid fixture");
  const results: { zoom: number; distance: number; changed: number; pixels: number }[] = [];
  for (const zoom of [0.5, 1, 2]) {
    for (const [width, height] of [
      [390, 568],
      [620, 750],
    ]) {
      for (const showControlPoints of [false, true]) {
        const view = createPortraitLayout(prepared.chart, zoom, width, height);
        const painter = new ChartPainter(prepared.chart, view.layout);
        const options = { showControlPoints, showDirectionText: true, labelSize: 12 };
        const tiles = new PortraitTiles(painter, view, options);
        const tiled = document.createElement("canvas");
        for (const distance of [0, 511, 512, 513, 1024, Math.floor(view.scrollRange)]) {
          // Repeated readbacks can switch a reference canvas to software rendering,
          // changing edge antialiasing independently of the tile geometry.
          const reference = document.createElement("canvas");
          const top = Math.max(0, view.scrollRange - distance);
          tiles.paint(tiled, top);
          reference.width = tiled.width;
          reference.height = tiled.height;
          const ratio = Math.min(devicePixelRatio || 1, 2);
          const context = reference.getContext("2d")!;
          context.setTransform(ratio, 0, 0, ratio, 0, 0);
          context.fillStyle = "#000000";
          context.fillRect(0, 0, width, height);
          context.translate(view.offsetX, 0);
          context.scale(view.scale, view.scale);
          painter.paint(context, portraitColumn(view, top), view.scale, options);
          const expected = context.getImageData(0, 0, reference.width, reference.height).data;
          const actual = tiled.getContext("2d")!.getImageData(0, 0, tiled.width, tiled.height).data;
          let changed = 0;
          for (let pixel = 0; pixel < actual.length; pixel += 4) {
            if (
              [0, 1, 2].some(
                (channel) => Math.abs(actual[pixel + channel] - expected[pixel + channel]) > 8,
              )
            )
              changed++;
          }
          results.push({ zoom, distance, changed, pixels: expected.length / 4 });
          if (changed / (expected.length / 4) >= 0.002 && !window.previewTileDifference) {
            window.previewTileDifference = {
              actual: tiled.toDataURL(),
              expected: reference.toDataURL(),
            };
          }
          reference.width = reference.height = 0;
        }
        tiles.dispose();
        tiled.width = tiled.height = 0;
      }
    }
  }
  return results;
};
