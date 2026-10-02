import { useCallback, useEffect, useRef, useState } from "react";

export function useScrollToTop(threshold = 100) {
  const [visible, setVisible] = useState(() => {
    const { scrollHeight, clientHeight } = document.documentElement;
    return scrollHeight > clientHeight && window.scrollY > threshold;
  });

  const unlockScrollLockRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const update = () => {
      const { scrollHeight, clientHeight } = document.documentElement;
      const next = scrollHeight > clientHeight && window.scrollY > threshold;
      setVisible((prev) => (prev === next ? prev : next));
    };
    window.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    return () => {
      window.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [threshold]);

  useEffect(() => {
    return () => {
      unlockScrollLockRef.current?.();
      document.documentElement.style.removeProperty("pointer-events");
    };
  }, []);

  const scrollToTop = useCallback(() => {
    if (window.scrollY <= 0 || unlockScrollLockRef.current) return;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      unlockScrollLockRef.current = null;
      window.removeEventListener("scrollend", onScrollEnd);
      clearTimeout(fallbackId);
      document.documentElement.style.removeProperty("pointer-events");
    };

    const onScrollEnd = () => {
      finish();
    };

    unlockScrollLockRef.current = finish;
    document.documentElement.style.pointerEvents = "none";

    window.addEventListener("scrollend", onScrollEnd, { passive: true });
    const fallbackId = setTimeout(finish, 4000);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return { visible, scrollToTop };
}
