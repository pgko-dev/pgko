import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";

import { Site } from "@/components/site";
import { ensureAuthenticated } from "@/lib/ensure-auth";

import { BundleUploadBox } from "./-bundle-upload-box";
import { Description } from "./-upload-description";

export const Route = createFileRoute("/bundles/upload")({
  beforeLoad: async ({ context, location }) => {
    await ensureAuthenticated(context, location);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const description = useMemo(() => <Description />, []);

  return (
    <Site.Page title={t("ui.uploadPage.label")} description={description}>
      <div className="flex flex-col gap-6">
        <BundleUploadBox />
        <p className="text-center text-xs text-muted-foreground">
          <Trans
            i18nKey="ui.uploadPage.guidelinesNotice"
            components={{
              guidelines: (
                <Link to="/tos" className="text-primary !no-underline hover:!underline" />
              ),
            }}
          />
        </p>
      </div>
    </Site.Page>
  );
}
