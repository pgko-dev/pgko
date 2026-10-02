import { Link } from "@tanstack/react-router";
import { Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatusPage } from "@/components/status-page";
import { Button } from "@/components/ui/button";

export function NotFound() {
  const { t } = useTranslation();

  return (
    <StatusPage title={t("ui.notFoundPage.title")} description={t("ui.notFoundPage.description")}>
      <Button variant="secondary" size="icon" nativeButton={false} render={<Link to="/" />}>
        <Undo2 />
      </Button>
    </StatusPage>
  );
}
