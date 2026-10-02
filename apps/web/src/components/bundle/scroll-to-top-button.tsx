import { ChevronUp } from "lucide-react";
import { memo } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScrollToTopButtonProps {
  onClick: () => void;
  ariaLabel: string;
  className?: string;
  visible?: boolean;
}

export const ScrollToTopButton = memo(function ScrollToTopButton({
  onClick,
  ariaLabel,
  className,
  visible = true,
}: ScrollToTopButtonProps) {
  return createPortal(
    <Button
      variant="secondary"
      size="icon"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "fixed right-6 bottom-6 z-[100] size-12 cursor-pointer rounded-full transition-all duration-200 ease-out",
        "border border-foreground/20 bg-foreground text-background shadow-[0_2px_16px_rgba(0,0,0,0.4)] hover:scale-105 hover:bg-foreground/85",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        className,
      )}
      aria-hidden={!visible}
    >
      <ChevronUp className="size-6" strokeWidth={2.5} aria-hidden />
    </Button>,
    document.body,
  );
});
