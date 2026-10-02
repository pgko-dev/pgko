import { Link, useMatchRoute } from "@tanstack/react-router";
import { Dice3, Loader2, Upload } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth";
import { useRandomBundle } from "@/hooks/mutation/use-random-bundle";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";
import { type NavOverflow, type NavOverflowItem, UserMenu } from "./user-menu";

const ROW_GAP = 16; // gap-4
const NAV_GAP = 4; // gap-1
const ACTIONS_GAP = 8; // gap-2

const navLinkClass =
  "inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const NO_OVERFLOW: NavOverflow = {
  browse: false,
  creators: false,
  profile: false,
  action: false,
};

const LogoButton = () => {
  const { t } = useTranslation();

  return (
    <Link
      to="/"
      aria-label={t("ui.nav.title")}
      className="flex shrink-0 items-center gap-2 rounded-md text-primary transition-opacity hover:opacity-85 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Logo className="size-6" />
      <span className="text-lg font-bold tracking-tight text-foreground">{t("ui.nav.title")}</span>
    </Link>
  );
};

const RandomBundleButton = ({ compact = false }: Readonly<{ compact?: boolean }>) => {
  const { t } = useTranslation();
  const matchRoute = useMatchRoute();
  const { mutate, isPending } = useRandomBundle();

  const handleClick = React.useCallback(() => {
    const bundleMatch = matchRoute({ to: "/bundles/$bundleId", fuzzy: false });
    const bundleId = bundleMatch ? (bundleMatch as { bundleId?: string }).bundleId : undefined;
    mutate(bundleId === "upload" ? undefined : bundleId);
  }, [matchRoute, mutate]);

  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? "icon-lg" : "lg"}
      className={compact ? undefined : "text-muted-foreground hover:text-foreground"}
      disabled={isPending}
      aria-label={t("ui.nav.randomBeatmap")}
      onClick={handleClick}
    >
      {isPending ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <Dice3 aria-hidden="true" />
      )}
      {compact ? null : <span>{t("ui.nav.randomBeatmap")}</span>}
    </Button>
  );
};

function useNavOverflow(isAuthenticated: boolean, language: string) {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = React.useState<NavOverflow>(NO_OVERFLOW);

  React.useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;

    const readWidth = (key: string) => {
      const el = measure.querySelector(`[data-measure="${key}"]`);
      return el instanceof HTMLElement ? el.offsetWidth : 0;
    };

    const recompute = () => {
      const containerWidth = row.clientWidth;
      const logoW = readWidth("logo");
      const browseW = readWidth("browse");
      const creatorsW = readWidth("creators");
      const profileW = readWidth("profile");
      const randomFullW = readWidth("random-full");
      const randomIconW = readWidth("random-icon");
      const actionW = readWidth("action");
      const menuW = readWidth("menu");

      const hideOrder: NavOverflowItem[] = isAuthenticated
        ? ["action", "profile", "creators", "browse"]
        : ["action", "creators", "browse"];

      const fits = (hidden: ReadonlySet<NavOverflowItem>) => {
        const showBrowse = !hidden.has("browse");
        const showCreators = !hidden.has("creators");
        const showProfile = isAuthenticated && !hidden.has("profile");
        const showAction = !hidden.has("action");
        const leftNavCount = Number(showBrowse) + Number(showCreators) + Number(showProfile);
        const randomW = leftNavCount > 0 ? randomFullW : randomIconW;

        const navParts: number[] = [];
        if (showBrowse) navParts.push(browseW);
        if (showCreators) navParts.push(creatorsW);
        if (showProfile) navParts.push(profileW);
        navParts.push(randomW);
        const navW =
          navParts.reduce((sum, w) => sum + w, 0) + Math.max(0, navParts.length - 1) * NAV_GAP;

        const actionsW = showAction ? actionW + ACTIONS_GAP + menuW : menuW;
        // logo | nav | spacer | actions — spacer can shrink to 0; 3 row gaps
        const total = logoW + navW + actionsW + 3 * ROW_GAP;
        return total <= containerWidth;
      };

      const hidden = new Set<NavOverflowItem>();
      for (const item of hideOrder) {
        if (fits(hidden)) break;
        hidden.add(item);
      }

      const next: NavOverflow = {
        browse: hidden.has("browse"),
        creators: hidden.has("creators"),
        profile: isAuthenticated && hidden.has("profile"),
        action: hidden.has("action"),
      };

      setOverflow((prev) =>
        prev.browse === next.browse &&
        prev.creators === next.creators &&
        prev.profile === next.profile &&
        prev.action === next.action
          ? prev
          : next,
      );
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(row);
    return () => observer.disconnect();
  }, [isAuthenticated, language]);

  return { rowRef, measureRef, overflow };
}

function hasLeftNavPeer(overflow: NavOverflow, profileId: string | undefined): boolean {
  return !overflow.browse || !overflow.creators || (Boolean(profileId) && !overflow.profile);
}

function getProfileNavState(
  viewedProfileId: string | undefined,
  userId: string | undefined,
  userSlug: string | undefined,
  isCreatorsIndex: boolean,
) {
  const isOwnProfile =
    viewedProfileId != null && (viewedProfileId === userId || viewedProfileId === userSlug);

  return {
    isOwnProfile,
    isCreatorsActive: isCreatorsIndex || (viewedProfileId != null && !isOwnProfile),
  };
}

function NavbarAccountActions({
  isAuthenticated,
  overflow,
}: Readonly<{ isAuthenticated: boolean; overflow: NavOverflow }>) {
  const { t } = useTranslation();

  return (
    <div className="flex shrink-0 items-center gap-2">
      {!overflow.action && isAuthenticated ? (
        <Button
          nativeButton={false}
          render={<Link to="/bundles/upload" />}
          size="lg"
          aria-label={t("ui.nav.upload")}
        >
          <Upload aria-hidden="true" />
          {t("ui.nav.upload")}
        </Button>
      ) : null}
      {!overflow.action && !isAuthenticated ? (
        <Button
          nativeButton={false}
          render={<Link to="/login" search={{ redirect: undefined }} preload={false} />}
          variant="outline"
          size="lg"
        >
          {t("ui.nav.signIn")}
        </Button>
      ) : null}
      <UserMenu overflow={overflow} />
    </div>
  );
}

export const Navbar = ({ className, ...props }: Readonly<React.HTMLAttributes<HTMLElement>>) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const matchRoute = useMatchRoute();
  const { rowRef, measureRef, overflow } = useNavOverflow(Boolean(user), i18n.language);

  const profileMatch = matchRoute({ to: "/users/$jointId", fuzzy: false });
  const viewedProfileId = profileMatch ? (profileMatch as { jointId: string }).jointId : undefined;
  const { isOwnProfile, isCreatorsActive } = getProfileNavState(
    viewedProfileId,
    user?.id,
    user?.slug,
    Boolean(matchRoute({ to: "/users", fuzzy: false })),
  );
  const profileId = user?.slug ?? user?.id;
  const showLeftNavPeer = hasLeftNavPeer(overflow, profileId);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full overflow-x-clip border-b bg-background/80 px-[5vw] backdrop-blur-xl select-none supports-backdrop-filter:bg-background/70 sm:px-[7.5vw] md:px-[10vw] lg:px-[12.5vw] xl:px-[15vw]",
        className,
      )}
      {...props}
    >
      {/* Offscreen measurement row — always mounts full-size items for width reads */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] flex h-16 items-center gap-4 opacity-0"
      >
        <div data-measure="logo">
          <LogoButton />
        </div>
        <div className="flex items-center gap-1">
          <span data-measure="browse" className={navLinkClass}>
            {t("ui.nav.browse")}
          </span>
          <span data-measure="creators" className={navLinkClass}>
            {t("ui.nav.creators")}
          </span>
          {user ? (
            <span data-measure="profile" className={navLinkClass}>
              {t("ui.nav.userPossessive")}
            </span>
          ) : null}
          <span data-measure="random-full">
            <Button type="button" variant="ghost" size="lg" tabIndex={-1}>
              <Dice3 aria-hidden="true" />
              <span>{t("ui.nav.randomBeatmap")}</span>
            </Button>
          </span>
          <span data-measure="random-icon">
            <Button type="button" variant="ghost" size="icon-lg" tabIndex={-1}>
              <Dice3 aria-hidden="true" />
            </Button>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span data-measure="action">
            {user ? (
              <Button type="button" size="lg" tabIndex={-1}>
                <Upload aria-hidden="true" />
                {t("ui.nav.upload")}
              </Button>
            ) : (
              <Button type="button" variant="outline" size="lg" tabIndex={-1}>
                {t("ui.nav.signIn")}
              </Button>
            )}
          </span>
          <span data-measure="menu">
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              tabIndex={-1}
              className="rounded-full"
            >
              <span className="size-8" />
            </Button>
          </span>
        </div>
      </div>

      <div ref={rowRef} className="mx-auto flex h-16 max-w-screen-2xl items-center gap-4">
        <LogoButton />

        <nav aria-label={t("ui.nav.menu")} className="flex min-w-0 items-center gap-1">
          {!overflow.browse ? (
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-muted text-foreground" }}
              className={navLinkClass}
            >
              {t("ui.nav.browse")}
            </Link>
          ) : null}
          {!overflow.creators ? (
            <Link
              to="/users"
              activeOptions={{ exact: true }}
              aria-current={isCreatorsActive ? "page" : undefined}
              className={cn(navLinkClass, isCreatorsActive && "bg-muted text-foreground")}
            >
              {t("ui.nav.creators")}
            </Link>
          ) : null}
          {profileId && !overflow.profile ? (
            <Link
              to="/users/$jointId"
              params={{ jointId: profileId }}
              activeOptions={{ exact: true }}
              aria-current={isOwnProfile ? "page" : undefined}
              className={cn(navLinkClass, isOwnProfile && "bg-muted text-foreground")}
            >
              {t("ui.nav.userPossessive")}
            </Link>
          ) : null}
          <RandomBundleButton compact={!showLeftNavPeer} />
        </nav>

        <div className="flex-1" aria-hidden="true" />

        <NavbarAccountActions isAuthenticated={Boolean(user)} overflow={overflow} />
      </div>
    </header>
  );
};
