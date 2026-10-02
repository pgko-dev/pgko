import { Link } from "@tanstack/react-router";
import { Clock, Package } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { UserListItem } from "@pgko-dev/schema";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/lib/get-initials";

const CREATOR_CARD_CLASS_NAME =
  "flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4";

function CreatorCardContent({
  avatar,
  name,
  handle,
  bio,
  metadata,
}: Readonly<{
  avatar: ReactNode;
  name: ReactNode;
  handle: ReactNode;
  bio: ReactNode;
  metadata: ReactNode;
}>) {
  return (
    <>
      <div className="flex items-center gap-3">
        {avatar}
        <div className="flex min-w-0 flex-1 flex-col">
          {name}
          {handle}
        </div>
      </div>
      {bio}
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {metadata}
      </div>
    </>
  );
}

export function CreatorCard({ user }: Readonly<{ user: UserListItem }>) {
  const { t, i18n } = useTranslation();
  const jointId = user.slug || user.id;
  const lastActive = useMemo(
    () =>
      new Date(user.lastActivityAt).toLocaleDateString(i18n.language, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [user.lastActivityAt, i18n.language],
  );

  return (
    <Link
      to="/users/$jointId"
      params={{ jointId }}
      className={`${CREATOR_CARD_CLASS_NAME} transition-colors hover:border-border hover:bg-card/70`}
    >
      <CreatorCardContent
        avatar={
          <Avatar className="size-12 shrink-0 ring-2 ring-border/40" aria-hidden>
            <AvatarImage src={user.avatarUrl ?? undefined} alt="" className="object-cover" />
            <AvatarFallback className="bg-muted/70 font-semibold text-foreground/90">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        }
        name={<span className="truncate font-semibold text-foreground">{user.name}</span>}
        handle={
          user.slug ? (
            <span className="truncate font-mono text-xs text-muted-foreground" title={user.slug}>
              @{user.slug}
            </span>
          ) : null
        }
        bio={
          <p className="line-clamp-1 text-sm leading-relaxed break-words text-muted-foreground">
            {user.bio || ""}
          </p>
        }
        metadata={
          <>
            <span className="flex items-center gap-1.5">
              <Package className="size-3.5 shrink-0" aria-hidden />
              {t("ui.usersPage.bundleCount", { count: user.bundlesCount })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5 shrink-0" aria-hidden />
              {t("ui.usersPage.lastActive", { date: lastActive })}
            </span>
          </>
        }
      />
    </Link>
  );
}

export function CreatorCardSkeleton() {
  return (
    <div className={CREATOR_CARD_CLASS_NAME} aria-hidden>
      <CreatorCardContent
        avatar={<Skeleton className="size-12 shrink-0 rounded-full" />}
        name={<Skeleton className="h-4 w-28" />}
        handle={<Skeleton className="mt-1.5 h-3 w-20" />}
        bio={<Skeleton className="h-3.5 w-full" />}
        metadata={<Skeleton className="h-3 w-24" />}
      />
    </div>
  );
}
