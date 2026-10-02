import { AlertTriangle, X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ConfirmDialogTone = "default" | "destructive";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: ConfirmDialogTone;
  cancelLabel: ReactNode;
  confirmContent: ReactNode;
  /** When true, disables both buttons and hides the close button by default. */
  isBusy?: boolean;
  /** Additional flag to disable only the confirm button (e.g. countdowns). */
  isConfirmDisabled?: boolean;
  /** Override for showing the close button on the dialog content. */
  showCloseButton?: boolean;
  /** Called when the confirm button is clicked. */
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  tone = "destructive",
  cancelLabel,
  confirmContent,
  isBusy = false,
  isConfirmDisabled,
  showCloseButton,
  onConfirm,
}: Readonly<ConfirmDialogProps>) {
  const { t } = useTranslation();
  const effectiveShowCloseButton = showCloseButton ?? !isBusy;
  const resolvedTitle = title ?? t("ui.confirmDialog.warningTitle");
  const resolvedIcon = icon ?? <AlertTriangle className="size-4 shrink-0" aria-hidden />;

  const handleConfirmClick = async () => {
    if (isBusy || isConfirmDisabled) return;
    await onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={effectiveShowCloseButton}>
        <DialogHeader>
          <DialogTitle
            className={cn("flex items-center gap-2", tone === "destructive" && "text-destructive")}
          >
            {resolvedIcon}
            {resolvedTitle}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter showCloseButton={false} className="flex-row gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
          >
            <X className="size-4" />
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === "destructive" ? "destructive" : "default"}
            onClick={handleConfirmClick}
            disabled={isBusy || isConfirmDisabled}
          >
            {confirmContent}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
