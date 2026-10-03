import { CircleAlert, Music2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function PreviewPlaceholder({
  message,
  state = "empty",
  onClose,
  onRetry,
  fitContainer,
  children,
}: Readonly<{
  message: string;
  state?: "empty" | "loading" | "error";
  onClose?: () => void;
  onRetry?: () => void;
  fitContainer?: boolean;
  children?: ReactNode;
}>) {
  const { t } = useTranslation();

  return (
    <section
      aria-label={t("ui.preview.title")}
      className={cn(
        "relative flex min-h-80 flex-col items-center justify-center gap-3 border bg-card p-4 text-muted-foreground",
        fitContainer && "md:h-full md:min-h-0 md:overflow-y-auto",
      )}
    >
      {onClose ? (
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-3 right-3 size-11 sm:size-7 pointer-coarse:size-11"
          aria-label={t("ui.preview.close")}
          onClick={onClose}
        >
          <X />
        </Button>
      ) : null}
      {state === "loading" ? (
        <Spinner className="size-8 motion-reduce:animate-none" aria-hidden />
      ) : state === "error" ? (
        <CircleAlert className="size-8 text-destructive" aria-hidden />
      ) : (
        <Music2 className="size-8" aria-hidden />
      )}
      <output
        role={state === "error" ? "alert" : "status"}
        className="max-w-prose text-center text-sm"
      >
        {message}
      </output>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          {t("ui.preview.retry")}
        </Button>
      ) : null}
      {children ? <div className="w-full max-w-xl text-left">{children}</div> : null}
    </section>
  );
}
