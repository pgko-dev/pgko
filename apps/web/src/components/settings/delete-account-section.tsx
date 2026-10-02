import { useInterval } from "@mantine/hooks";
import { Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useDeleteAccount } from "@/hooks/mutation/use-delete-account.ts";

const COUNT_DOWN = 3;

export function DeleteAccountSection() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { mutate, isPending } = useDeleteAccount();
  const [countdown, setCountdown] = useState(COUNT_DOWN);

  const countdownInterval = useInterval(
    () =>
      setCountdown((current) => {
        if (current <= 1) {
          countdownInterval.stop();
          return 0;
        }
        return current - 1;
      }),
    1000,
  );

  const openDialog = useCallback(() => {
    setCountdown(COUNT_DOWN);
    countdownInterval.start();
    setDialogOpen(true);
  }, [countdownInterval]);

  const closeDialog = useCallback(() => {
    countdownInterval.stop();
    setDialogOpen(false);
  }, [countdownInterval]);

  const handleConfirm = useCallback(() => {
    closeDialog();
    mutate();
  }, [closeDialog, mutate]);

  const ConfirmIcon = isPending ? Spinner : Trash2;
  const showingCountdown = !isPending && countdown > 0;
  const confirmText = t(
    isPending
      ? "ui.settingsPage.deleteAccountSection.action.deleting"
      : "ui.settingsPage.deleteAccountSection.action.delete",
  );

  return (
    <>
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-4 shrink-0" />
            {t("ui.settingsPage.deleteAccountSection.title")}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant="destructive" className="border-destructive/50">
            <AlertTitle>{t("ui.settingsPage.deleteAccountSection.alert.title")}</AlertTitle>
            <AlertDescription>
              {t("ui.settingsPage.deleteAccountSection.alert.description")}
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter>
          <Button variant="destructive" className="w-full sm:w-auto" onClick={openDialog}>
            <Trash2 className="size-4" />
            <span className="ml-2">{t("ui.settingsPage.deleteAccountSection.action.delete")}</span>
          </Button>
        </CardFooter>
      </Card>

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) countdownInterval.stop();
        }}
        description={t("ui.settingsPage.deleteAccountSection.confirm.description")}
        tone="destructive"
        cancelLabel={t("ui.settingsPage.deleteAccountSection.action.cancel")}
        confirmContent={
          <>
            <ConfirmIcon className="size-4" />
            <span className={showingCountdown ? undefined : "ml-2"}>
              {confirmText}
              {showingCountdown && ` (${countdown})`}
            </span>
          </>
        }
        isBusy={isPending}
        isConfirmDisabled={countdown > 0}
        onConfirm={handleConfirm}
      />
    </>
  );
}
