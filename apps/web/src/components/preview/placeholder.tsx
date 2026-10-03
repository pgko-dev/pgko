import { Music2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function PreviewPlaceholder({
  message,
  loading = false,
  onClose,
}: Readonly<{
  message: string;
  loading?: boolean;
  onClose?: () => void;
}>) {
  const { t } = useTranslation();

  return (
    <section
      aria-label={t("ui.preview.title")}
      className="relative flex min-h-80 flex-col items-center justify-center gap-3 border bg-card p-4 text-muted-foreground"
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
      {loading ? (
        <Spinner className="size-8 motion-reduce:animate-none" aria-hidden />
      ) : (
        <Music2 className="size-8" aria-hidden />
      )}
      <output className="text-center text-sm">{message}</output>
    </section>
  );
}
