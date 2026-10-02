import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

const SHOW_DELAY_MS = 120;
const MIN_VISIBLE_MS = 300;
const COMPLETE_DURATION_MS = 180;

export function PageTransitionProgress() {
  const { t } = useTranslation();
  const isLoading = useRouterState({ select: (state) => state.isLoading });
  const [isVisible, setIsVisible] = useState(false);
  const visibleAt = useRef(0);

  useEffect(() => {
    if (isLoading) {
      const showTimer = window.setTimeout(() => {
        visibleAt.current = Date.now();
        setIsVisible(true);
      }, SHOW_DELAY_MS);

      return () => window.clearTimeout(showTimer);
    }

    if (!isVisible) return;

    const visibleFor = Date.now() - visibleAt.current;
    const hideTimer = window.setTimeout(
      () => setIsVisible(false),
      Math.max(0, MIN_VISIBLE_MS - visibleFor) + COMPLETE_DURATION_MS,
    );

    return () => window.clearTimeout(hideTimer);
  }, [isLoading, isVisible]);

  return (
    <>
      <progress
        aria-label={t("ui.loading")}
        aria-hidden={!isVisible}
        className="sr-only"
        max={1}
        value={isLoading ? undefined : 1}
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed top-16 right-0 left-0 z-40 h-0.5 overflow-hidden transition-opacity duration-300 ease-out",
          isVisible ? "opacity-100" : "opacity-0",
        )}
      >
        <div
          className={cn(
            "h-full origin-left bg-secondary shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_65%,transparent)]",
            isVisible && isLoading && "animate-page-transition-progress",
            isVisible && !isLoading && "scale-x-100 transition-transform duration-200 ease-out",
          )}
        />
      </div>
    </>
  );
}
