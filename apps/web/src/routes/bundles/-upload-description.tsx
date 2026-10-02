import { useTranslation } from "react-i18next";

export function Description() {
  const { t } = useTranslation();
  return <div>{t("ui.uploadPage.description_1")}</div>;
}
