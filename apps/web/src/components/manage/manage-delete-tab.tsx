import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

import { useBundleManageContext } from "./use-bundle-manage";

export function ManageDeleteTab() {
  const { t } = useTranslation();
  const manage = useBundleManageContext();

  return (
    <div className="mt-4">
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-4 shrink-0" />
            {t("ui.uploadDetail.delete.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive" className="border-destructive/50">
            <AlertTitle>{t("ui.uploadDetail.delete.alert.title")}</AlertTitle>
            <AlertDescription>{t("ui.uploadDetail.delete.alert.description")}</AlertDescription>
          </Alert>
          <Button
            type="button"
            variant="destructive"
            onClick={manage.handleDelete}
            disabled={manage.isSaving || manage.isDeleting}
            className="w-full sm:w-auto"
          >
            {manage.isDeleting ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
            <span className="ml-2">{t("ui.uploadDetail.actions.delete")}</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
