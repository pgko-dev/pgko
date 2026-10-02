import { useDebouncedCallback } from "@mantine/hooks";
import { useEffect, useRef, useState } from "react";
import FastMarquee from "react-fast-marquee";

import { cn } from "@/lib/utils";

const Marquee = (
  "default" in FastMarquee ? (FastMarquee as any).default : FastMarquee
) as typeof FastMarquee;

const RESIZE_DEBOUNCE_MS = 150;

export function AutoScrollMarquee({
  children,
  className,
  align = "start",
  disableTruncate = false,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center";
  disableTruncate?: boolean;
}>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [shouldMarquee, setShouldMarquee] = useState(false);

  const checkOverflow = () => {
    if (containerRef.current && measureRef.current) {
      setShouldMarquee(measureRef.current.scrollWidth > containerRef.current.clientWidth);
    }
  };

  const debouncedCheckOverflow = useDebouncedCallback(checkOverflow, RESIZE_DEBOUNCE_MS);

  useEffect(() => {
    checkOverflow();
    window.addEventListener("resize", debouncedCheckOverflow);
    return () => window.removeEventListener("resize", debouncedCheckOverflow);
  }, [children, debouncedCheckOverflow]);

  return (
    <div
      ref={containerRef}
      className={cn("relative flex w-full min-w-0 items-center overflow-hidden", className)}
    >
      <div
        ref={measureRef}
        className="pointer-events-none absolute whitespace-nowrap opacity-0"
        aria-hidden
        style={{ left: -9999 }}
      >
        {children}
      </div>
      {shouldMarquee ? (
        <Marquee
          pauseOnHover={true}
          gradient={false}
          speed={30}
          className="flex h-full w-full min-w-0 items-center overflow-y-hidden"
        >
          <div className="pr-8 whitespace-nowrap">{children}</div>
        </Marquee>
      ) : (
        <div
          className={cn(
            "w-full min-w-0",
            !disableTruncate && "truncate",
            align === "center" && "flex h-full items-center justify-center text-center",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
