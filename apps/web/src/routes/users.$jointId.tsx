import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CheckCircle, FileEdit, Settings, Users } from "lucide-react";
import { useCallback, useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";

import { BundleList } from "@/components/bundle";
import { Site } from "@/components/site";
import { buttonVariants } from "@/components/ui/button-variants";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ProfileNotFound } from "@/components/user-profile/profile-not-found";
import { ProfileSkeleton } from "@/components/user-profile/profile-skeleton";
import { UserProfile } from "@/components/user-profile/user-profile";
import { useAuth } from "@/hooks/auth";
import { userProfileQueryOptions, useUserProfile } from "@/hooks/query/use-user-profile";
import { ensureAuthenticated } from "@/lib/ensure-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/users/$jointId")({
  beforeLoad: async ({ params, context, location }) => {
    if (params.jointId === "me") {
      const user = await ensureAuthenticated(context, location);
      const jointId = user.slug ?? user.id;
      throw redirect({ to: "/users/$jointId", params: { jointId } });
    }

    context.queryClient.query(userProfileQueryOptions(params.jointId)).catch(() => undefined);
  },
  component: RouteComponent,
});

type ListMode = "released" | "collab" | "draft";

const LIST_MODE_OPTIONS_OWN: ListMode[] = ["released", "collab", "draft"];

const LIST_MODE_LABEL_KEYS = {
  released: "ui.bundleList.releasedTab",
  collab: "ui.bundleList.collabTab",
  draft: "ui.bundleList.draftsTab",
} as const;

const LIST_MODE_ICONS: Record<ListMode, ComponentType<{ className?: string }>> = {
  released: CheckCircle,
  collab: Users,
  draft: FileEdit,
};

function RouteComponent() {
  const { jointId } = Route.useParams();
  const { user, isLoading: authLoading } = useAuth();
  const [ownListMode, setOwnListMode] = useState<ListMode>("released");
  const { t } = useTranslation();

  const isOwnProfile = jointId === user?.slug || jointId === user?.id;
  const listMode = isOwnProfile ? ownListMode : "released";

  const effectiveId = isOwnProfile ? (user?.slug ?? user?.id ?? "") : jointId;
  const { data: profileData, isLoading: profileLoading, isError } = useUserProfile(effectiveId);

  const profileUser = profileData?.user;
  const userLoading = isOwnProfile && (authLoading || !user);
  const profileStillLoading = !!effectiveId && (profileLoading || !profileUser);

  const showNotFound =
    (isOwnProfile && isError) || (!isOwnProfile && !profileLoading && (isError || !profileUser));
  const showLoading =
    (isOwnProfile && (userLoading || profileStillLoading)) ||
    (!isOwnProfile && (profileLoading || !profileUser));

  const handleListModeChange = useCallback((v: string[]) => {
    const next = v[0];
    if (next) setOwnListMode(next as ListMode);
  }, []);

  if (showNotFound) {
    return <ProfileNotFound />;
  }

  if (showLoading || !profileUser) {
    return (
      <Site.Page documentTitle={t("ui.loading")}>
        <ProfileSkeleton />
      </Site.Page>
    );
  }

  const profileTabLabel = profileUser.slug
    ? t("ui.profilePage.browserTabUser", { handle: profileUser.slug })
    : profileUser.name;

  return (
    <Site.Page documentTitle={profileTabLabel}>
      <div className="flex w-full flex-col items-start gap-6">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <UserProfile user={profileUser} className="min-w-0 flex-1" />
          {isOwnProfile && (
            <Link
              to="/settings"
              className={cn(
                "shrink-0",
                buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" }),
              )}
            >
              <Settings className="size-4" aria-hidden />
              {t("ui.nav.settings")}
            </Link>
          )}
        </div>
        <section className="w-full space-y-4">
          <BundleList
            userId={profileUser.id}
            currentUserId={user?.id}
            draftsOnly={listMode === "draft"}
            collaborationsOnly={isOwnProfile && listMode === "collab"}
            searchPlaceholder={t("ui.bundleList.searchPlaceholder")}
            linkToManage={isOwnProfile}
            showFilters
            extraFilters={
              isOwnProfile ? (
                <ToggleGroup
                  value={[listMode]}
                  onValueChange={handleListModeChange}
                  variant="outline"
                  size="sm"
                  spacing={0}
                  className="w-fit"
                >
                  {LIST_MODE_OPTIONS_OWN.map((mode) => {
                    const Icon = LIST_MODE_ICONS[mode];
                    return (
                      <ToggleGroupItem key={mode} value={mode} className="gap-1.5">
                        <Icon className="size-4" />
                        {t(LIST_MODE_LABEL_KEYS[mode])}
                      </ToggleGroupItem>
                    );
                  })}
                </ToggleGroup>
              ) : undefined
            }
          />
        </section>
      </div>
    </Site.Page>
  );
}
