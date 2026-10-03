import { useEffect, useMemo, useRef, useState } from "react";
import {
  CANVAS_HEIGHT,
  COLUMN_WIDTH,
  FIELD_LEFT,
  FIELD_WIDTH,
  LOOK_AHEAD,
  NOTE_PADDING,
  columnAtTick,
  createLayout,
  hitTestTick,
  tickY,
} from "ugc-render";
import { ChartPainter } from "ugc-render/canvas";

import {
  ScrollAreaCorner,
  ScrollAreaRoot,
  ScrollAreaViewport,
  ScrollBar,
} from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import type { PreviewViewportProps } from "./viewport";

const MAX_SURFACE_BYTES = 64 * 1024 * 1024;
const OVERVIEW_SCALE = 0.5;
const MIN_CANVAS_HEIGHT = NOTE_PADDING * 2 + LOOK_AHEAD + 1;

export function OverviewViewport({
  chart,
  zoom,
  expanded,
  tick,
  follow,
  onPan,
  onSeek,
  label,
  options,
}: PreviewViewportProps) {
  const scroll = useRef<HTMLDivElement>(null);
  const tiles = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    moved: boolean;
    pointer: number;
  } | null>(null);
  const [window, setWindow] = useState({
    left: 0,
    width: 800,
    height: CANVAS_HEIGHT * OVERVIEW_SCALE,
  });
  const scale = OVERVIEW_SCALE;
  const layout = useMemo(
    () => createLayout(chart, zoom, Math.max(MIN_CANVAS_HEIGHT, window.height / scale)),
    [chart, zoom, window.height, scale],
  );
  const previousLayout = useRef(layout);
  const painter = useMemo(() => new ChartPainter(chart, layout), [chart, layout]);
  const columnWidth = COLUMN_WIDTH * scale;
  const first = Math.max(0, Math.floor(window.left / columnWidth) - 1);
  const last = Math.min(
    layout.columns.length - 1,
    Math.ceil((window.left + window.width) / columnWidth),
  );
  const active = columnAtTick(layout, tick);

  useEffect(() => {
    const element = scroll.current!;
    const update = () =>
      setWindow({
        left: element.scrollLeft,
        width: element.clientWidth,
        height: element.clientHeight || CANVAS_HEIGHT * OVERVIEW_SCALE,
      });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = scroll.current!;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || element.scrollWidth <= element.clientWidth) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1;
      event.preventDefault();
      onPan();
      element.scrollBy({
        left: delta * unit,
        behavior: "instant",
      });
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [onPan]);

  useEffect(() => {
    const host = tiles.current!;
    const count = last - first + 1;
    const ratio = Math.min(
      globalThis.devicePixelRatio || 1,
      2,
      Math.sqrt(
        MAX_SURFACE_BYTES / (count * COLUMN_WIDTH * layout.canvasHeight * scale * scale * 4),
      ),
    );
    const canvases: HTMLCanvasElement[] = [];
    let cancelled = false;
    let next = first;
    let timer: ReturnType<typeof setTimeout>;
    function paintNext() {
      if (cancelled || next > last) return;
      const column = layout.columns[next++];
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(COLUMN_WIDTH * scale * ratio);
      canvas.height = Math.floor(layout.canvasHeight * scale * ratio);
      canvas.style.cssText = `position:absolute;left:${column.index * columnWidth}px;width:${columnWidth}px;height:${layout.canvasHeight * scale}px`;
      canvas.setAttribute("aria-hidden", "true");
      canvas.dataset.column = String(column.index);
      const context = canvas.getContext("2d")!;
      context.scale(scale * ratio, scale * ratio);
      painter.paint(context, column, scale, options);
      host.append(canvas);
      canvases.push(canvas);
      timer = setTimeout(paintNext, 0);
    }
    paintNext();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      for (const canvas of canvases) {
        canvas.remove();
        canvas.width = 0;
        canvas.height = 0;
      }
    };
  }, [painter, layout, first, last, columnWidth, scale, options]);

  useEffect(() => {
    const reflowed = previousLayout.current !== layout;
    previousLayout.current = layout;
    if (!follow && !reflowed) return;
    const element = scroll.current!;
    const left = active.index * columnWidth;
    const fieldLeft = left + FIELD_LEFT * scale;
    const fieldWidth = FIELD_WIDTH * scale;
    let targetLeft = element.scrollLeft;
    if (
      fieldLeft < element.scrollLeft ||
      fieldLeft + Math.min(fieldWidth, element.clientWidth) >
        element.scrollLeft + element.clientWidth
    ) {
      targetLeft = Math.max(
        0,
        left - Math.min(columnWidth, Math.max(0, element.clientWidth - columnWidth)),
      );
    }

    if (targetLeft !== element.scrollLeft) {
      // Follow only this viewport; instant movement also respects reduced motion.
      element.scrollTo({ left: targetLeft, behavior: "instant" });
    }
  }, [active, follow, columnWidth, layout, window.width, scale]);

  return (
    <ScrollAreaRoot
      className={cn("min-w-0 overflow-hidden rounded-lg bg-black", expanded && "min-h-40 flex-1")}
      style={{
        height: expanded ? undefined : CANVAS_HEIGHT * OVERVIEW_SCALE,
      }}
    >
      <ScrollAreaViewport
        ref={scroll}
        role="region"
        tabIndex={0}
        aria-label={label}
        data-portrait="false"
        className="absolute inset-0 [touch-action:pan-x_pan-y] overscroll-contain"
        onScroll={() => {
          const element = scroll.current!;
          setWindow((previous) => ({
            ...previous,
            left: element.scrollLeft,
            width: element.clientWidth,
          }));
        }}
        onKeyDown={(event) => {
          if (
            [
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "PageUp",
              "PageDown",
              "Home",
              "End",
            ].includes(event.key)
          ) {
            onPan();
          }
        }}
        onPointerDown={(event) => {
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            left: scroll.current!.scrollLeft,
            moved: false,
            pointer: event.pointerId,
          };
          if (event.pointerType === "mouse") {
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (current?.pointer !== event.pointerId) return;
          if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 6) {
            current.moved = true;
            onPan();
            if (event.pointerType === "mouse") {
              scroll.current!.scrollLeft = current.left + current.x - event.clientX;
            }
          }
        }}
        onPointerCancel={() => {
          if (drag.current) onPan();
          drag.current = null;
        }}
        onPointerUp={(event) => {
          const current = drag.current;
          drag.current = null;
          if (!current || current.moved) return;
          const bounds = tiles.current!.getBoundingClientRect();
          const x = (event.clientX - bounds.left) / scale;
          const y = (event.clientY - bounds.top) / scale;
          const column = layout.columns[Math.floor(x / COLUMN_WIDTH)];
          if (!column) return;
          const target = hitTestTick(column, x - column.index * COLUMN_WIDTH, y);
          if (target !== null) onSeek(target);
        }}
      >
        <div
          ref={tiles}
          data-slot="preview-columns"
          style={{
            position: "relative",
            width: layout.columns.length * columnWidth,
            height: layout.canvasHeight * scale,
          }}
        >
          {tick >= 0 && tick <= layout.endTick ? (
            <div
              data-slot="preview-cursor"
              aria-hidden="true"
              style={{
                pointerEvents: "none",
                position: "absolute",
                zIndex: 1,
                height: 1,
                background: "#ff0000",
                left: (active.index * COLUMN_WIDTH + FIELD_LEFT) * scale,
                top: tickY(active, tick) * scale - 0.5,
                width: FIELD_WIDTH * scale,
              }}
            />
          ) : null}
        </div>
      </ScrollAreaViewport>
      <ScrollBar orientation="horizontal" onPointerDown={onPan} />
      <ScrollBar onPointerDown={onPan} />
      <ScrollAreaCorner />
    </ScrollAreaRoot>
  );
}
