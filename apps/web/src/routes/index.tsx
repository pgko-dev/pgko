import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { BundleList } from "@/components/bundle";
import { Site } from "@/components/site";
import { validateBundleListSearch } from "@/lib/bundle-list-search";

export const Route = createFileRoute("/")({
  validateSearch: validateBundleListSearch,
  component: App,
});

function App() {
  const { t } = useTranslation();
  return (
    <Site.Page title={t("ui.homePage.title")} description={t("ui.homePage.description")}>
      <BundleList />
    </Site.Page>
  );
}
