import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { AvatarSection } from "@/components/settings/avatar-section";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { ProfileSection } from "@/components/settings/profile-section";
import { Site } from "@/components/site";
import { useAuth } from "@/hooks/auth";
import { ensureAuthenticated } from "@/lib/ensure-auth";

export const Route = createFileRoute("/settings")({
  beforeLoad: async ({ context, location }) => {
    await ensureAuthenticated(context, location);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Site.Page title={t("ui.nav.settings")} description={t("ui.profilePage.descriptionSettings")}>
      <div className="w-full space-y-6">
        <AvatarSection user={user} />
        <ProfileSection user={user} />
        <DeleteAccountSection />
      </div>
    </Site.Page>
  );
}
