import { DoorOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/confirm-dialog";

export function NavigationConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: Readonly<{
  open: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}>) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel?.();
        }
      }}
      description={t("ui.uploadDetail.actions.leaveConfirm")}
      tone="destructive"
      cancelLabel={t("ui.uploadDetail.actions.cancel")}
      confirmContent={
        <>
          <DoorOpen className="size-4" aria-hidden />
          <span className="ml-2">{t("ui.uploadDetail.actions.leave")}</span>
        </>
      }
      onConfirm={() => {
        onConfirm?.();
      }}
    />
  );
}
