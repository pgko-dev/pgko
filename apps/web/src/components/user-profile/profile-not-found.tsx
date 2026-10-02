import { useTranslation } from "react-i18next";

import { Site } from "@/components/site";

export function ProfileNotFound() {
  const { t } = useTranslation();
  return (
    <Site.Page
      title={t("ui.profilePage.notFound")}
      description={t("ui.profilePage.notFoundDescription")}
    />
  );
}
