import { useEffect, useRef, type ComponentProps } from "react";

import { ScrollAreaRoot } from "@/components/ui/scroll-area";

const SCROLL_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
]);

export function PreviewScrollArea({
  playing,
  ...props
}: ComponentProps<typeof ScrollAreaRoot> & { readonly playing: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;

    const element = root.current!;
    const preventScroll = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    element.addEventListener("wheel", preventScroll, { passive: false, capture: true });
    element.addEventListener("touchmove", preventScroll, { passive: false, capture: true });

    return () => {
      element.removeEventListener("wheel", preventScroll, true);
      element.removeEventListener("touchmove", preventScroll, true);
    };
  }, [playing]);

  return (
    <ScrollAreaRoot
      {...props}
      ref={root}
      data-playing={playing}
      onPointerDownCapture={(event) => {
        if (!playing) return;
        if ((event.target as Element).closest('[data-slot="scroll-area-scrollbar"]')) {
          event.preventDefault();
          event.stopPropagation();
        } else if (event.button === 1) {
          event.preventDefault();
        }
      }}
      onKeyDownCapture={(event) => {
        if (!playing || !SCROLL_KEYS.has(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
      }}
    />
  );
}
