import { useTranslation } from "react-i18next";

import { Site } from "@/components/site";
import { Spinner } from "@/components/ui/spinner";

export function ManageLoading() {
  const { t } = useTranslation();

  return (
    <Site.Page documentTitle={t("ui.loading")}>
      <div className="flex min-h-48 items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" aria-label={t("ui.loading")} />
      </div>
    </Site.Page>
  );
}
