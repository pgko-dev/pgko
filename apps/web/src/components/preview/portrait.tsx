import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CANVAS_HEIGHT,
  FIELD_LEFT,
  FIELD_WIDTH,
  createPortraitLayout,
  hitTestTick,
  portraitColumn,
  portraitScrollTop,
  tickY,
} from "ugc-render";
import { ChartPainter } from "ugc-render/canvas";

import { ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { PreviewScrollArea } from "./scroll-area";
import type { PreviewViewportProps } from "./viewport";

export function PortraitViewport({
  chart,
  zoom,
  expanded,
  tick,
  playing,
  onSeek,
  label,
  options,
}: PreviewViewportProps) {
  const scroll = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    top: number;
    moved: boolean;
    pointer: number;
  } | null>(null);
  const [size, setSize] = useState({ width: 320, height: CANVAS_HEIGHT * 0.5 });
  const [top, setTop] = useState(0);
  const view = useMemo(
    () => createPortraitLayout(chart, zoom, size.width, size.height),
    [chart, zoom, size],
  );
  const previousView = useRef<typeof view | null>(null);
  const painter = useMemo(() => new ChartPainter(chart, view.layout), [chart, view]);
  const column = useMemo(() => portraitColumn(view, top), [view, top]);

  useLayoutEffect(() => {
    const element = scroll.current!;
    const update = () => {
      const width = Math.max(1, element.clientWidth);
      const height = Math.max(1, element.clientHeight);
      setSize((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const previous = previousView.current;
    previousView.current = view;
    if (!playing && previous === view) return;

    const element = scroll.current!;
    // Preserve the visible time when a paused view is resized or zoomed.
    const anchorTick =
      playing || !previous
        ? tick
        : (1 - Math.max(0, Math.min(top / previous.scrollRange, 1))) * previous.layout.endTick;
    element.scrollTo({ top: portraitScrollTop(view, anchorTick), behavior: "instant" });
    setTop(element.scrollTop);
  }, [view, tick, playing, top]);

  useLayoutEffect(() => {
    const element = canvas.current!;
    const ratio = Math.min(
      globalThis.devicePixelRatio || 1,
      2,
      Math.sqrt((64 * 1024 * 1024) / (view.width * view.height * 4)),
    );
    const width = Math.floor(view.width * ratio);
    const height = Math.floor(view.height * ratio);
    if (element.width !== width) element.width = width;
    if (element.height !== height) element.height = height;
    const context = element.getContext("2d")!;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = "#000000";
    context.fillRect(0, 0, view.width, view.height);
    context.translate(view.offsetX, 0);
    context.scale(view.scale, view.scale);
    painter.paint(context, column, view.scale, { ...options, labelSize: 12 });
  }, [painter, view, column, options]);

  useEffect(() => {
    const element = canvas.current!;
    return () => {
      element.width = 0;
      element.height = 0;
    };
  }, []);

  return (
    <PreviewScrollArea
      playing={playing}
      className={cn("min-w-0 overflow-hidden rounded-lg bg-black", expanded && "min-h-40 flex-1")}
      style={{ height: expanded ? undefined : CANVAS_HEIGHT * 0.5 }}
    >
      <ScrollAreaViewport
        ref={scroll}
        role="region"
        tabIndex={0}
        aria-label={label}
        data-portrait="true"
        className="absolute inset-0 [touch-action:pan-y] overscroll-contain"
        style={playing ? { overflow: "hidden", touchAction: "none" } : undefined}
        onScroll={(event) => setTop(event.currentTarget.scrollTop)}
        onKeyDown={(event) => {
          if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            const element = event.currentTarget;
            const step = event.key.startsWith("Page") ? size.height * 0.8 : 48;
            const delta = ["ArrowUp", "PageUp"].includes(event.key) ? -step : step;
            let target = element.scrollTop + delta;
            if (event.key === "Home") target = view.scrollRange;
            else if (event.key === "End") target = 0;
            element.scrollTo({ top: target, behavior: "instant" });
          }
        }}
        onPointerDown={(event) => {
          if (playing) return;
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            top: event.currentTarget.scrollTop,
            moved: false,
            pointer: event.pointerId,
          };
          if (event.pointerType === "mouse") event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (playing) return;
          const current = drag.current;
          if (current?.pointer !== event.pointerId) return;
          if (Math.hypot(event.clientX - current.x, event.clientY - current.y) <= 6) return;
          current.moved = true;
          if (event.pointerType === "mouse")
            event.currentTarget.scrollTop = current.top + current.y - event.clientY;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onPointerUp={(event) => {
          const current = drag.current;
          drag.current = null;
          if (playing || !current || current.moved) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - bounds.left - view.offsetX) / view.scale;
          const y = (event.clientY - bounds.top) / view.scale;
          const target = hitTestTick(portraitColumn(view, event.currentTarget.scrollTop), x, y);
          if (target !== null) onSeek(target);
        }}
      >
        <div style={{ height: view.scrollRange + size.height, position: "relative" }}>
          <div className="sticky top-0 overflow-hidden" style={{ height: size.height }}>
            <canvas
              ref={canvas}
              aria-hidden="true"
              tabIndex={-1}
              data-column="0"
              style={{ display: "block", width: size.width, height: size.height }}
            />
            {tick >= 0 && tick <= view.layout.endTick ? (
              <div
                data-slot="preview-cursor"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  pointerEvents: "none",
                  height: 1,
                  background: "#ff0000",
                  left: view.offsetX + FIELD_LEFT * view.scale,
                  top: tickY(column, tick) * view.scale - 0.5,
                  width: FIELD_WIDTH * view.scale,
                }}
              />
            ) : null}
          </div>
        </div>
      </ScrollAreaViewport>
      <ScrollBar aria-disabled={playing} />
    </PreviewScrollArea>
  );
}
