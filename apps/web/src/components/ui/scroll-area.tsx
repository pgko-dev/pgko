import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";

import { cn } from "@/lib/utils";

function ScrollArea({ className, children, ...props }: Readonly<ScrollAreaPrimitive.Root.Props>) {
  return (
    <ScrollAreaRoot className={className} {...props}>
      <ScrollAreaViewport>{children}</ScrollAreaViewport>
      <ScrollBar />
      <ScrollAreaCorner />
    </ScrollAreaRoot>
  );
}

function ScrollAreaRoot({ className, ...props }: Readonly<ScrollAreaPrimitive.Root.Props>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    />
  );
}

function ScrollAreaViewport({
  className,
  ...props
}: Readonly<React.ComponentProps<typeof ScrollAreaPrimitive.Viewport>>) {
  return (
    <ScrollAreaPrimitive.Viewport
      data-slot="scroll-area-viewport"
      className={cn(
        "size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
        className,
      )}
      {...props}
    />
  );
}

const ScrollAreaCorner = ScrollAreaPrimitive.Corner;

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: Readonly<ScrollAreaPrimitive.Scrollbar.Props>) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/scrollbar flex touch-none p-0.5 select-none data-horizontal:h-(--scrollbar-size) data-horizontal:flex-col data-vertical:h-full data-vertical:w-(--scrollbar-size)",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 bg-(--scrollbar-thumb) transition-colors duration-150 group-hover/scrollbar:bg-(--scrollbar-thumb-hover) motion-reduce:transition-none forced-colors:bg-[CanvasText]"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollAreaRoot, ScrollAreaViewport, ScrollAreaCorner, ScrollBar };
