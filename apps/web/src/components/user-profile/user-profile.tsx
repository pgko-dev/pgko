import { Calendar, Package } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { PublicUser } from "@pgko-dev/schema";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/get-initials";

import { UserProfileLayout } from "./user-profile-layout";

export function UserProfile({
  user,
  className,
}: Readonly<{ user: PublicUser; className?: string }>) {
  const { t, i18n } = useTranslation();
  const memberDate = useMemo(
    () =>
      new Date(user.createdAt).toLocaleDateString(i18n.language, {
        month: "short",
        year: "numeric",
      }),
    [user.createdAt, i18n.language],
  );

  return (
    <UserProfileLayout
      className={className}
      avatar={
        <Avatar
          className="size-16 shrink-0 text-base ring-2 ring-border/40 sm:size-20 sm:text-lg"
          aria-hidden
        >
          <AvatarImage src={user.avatarUrl ?? undefined} alt="" className="object-cover" />
          <AvatarFallback className="bg-muted/70 font-semibold text-foreground/90">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      }
      identity={
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h1 className="shrink-0 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {user.name}
          </h1>
          {user.slug && (
            <span
              className="min-w-0 truncate font-mono text-sm text-muted-foreground"
              title={user.slug}
            >
              @{user.slug}
            </span>
          )}
        </div>
      }
      metadata={
        <>
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5 shrink-0 sm:size-4" aria-hidden />
            {t("ui.profilePage.memberShort", { date: memberDate })}
          </span>
          <span className="flex items-center gap-1.5">
            <Package className="size-3.5 shrink-0 sm:size-4" aria-hidden />
            {t("ui.profilePage.bundlesUploaded", { count: user.bundlesCount })}
          </span>
        </>
      }
      bio={
        user.bio ? (
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-muted-foreground">
            {user.bio}
          </p>
        ) : undefined
      }
    />
  );
}
