import { useNavigate } from "@tanstack/react-router";
import {
  Ellipsis,
  Globe,
  Inbox,
  Info,
  Loader2,
  LogIn,
  LogOut,
  Moon,
  Package,
  ScrollText,
  Settings,
  Sun,
  SunMoon,
  Upload,
  User,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/auth";
import { useSignOut } from "@/hooks/mutation/use-sign-out";
import { useLanguageSelect } from "@/hooks/use-language-select";
import { useTheme } from "@/integrations/theme-provider";
import { getInitials } from "@/lib/get-initials";
import { cn } from "@/lib/utils";

export type NavOverflowItem = "browse" | "creators" | "profile" | "action";

export type NavOverflow = Readonly<{
  browse: boolean;
  creators: boolean;
  profile: boolean;
  action: boolean;
}>;

function LanguageSubmenu() {
  const { t } = useTranslation();
  const {
    activeLanguage,
    handleLanguageChange,
    isChangingLanguage,
    pendingLanguage,
    supportedLanguages,
  } = useLanguageSelect();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Globe aria-hidden="true" />
        {t("ui.nav.languageSelector")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-fit">
        {supportedLanguages.map(({ code, nativeName }) => (
          <DropdownMenuCheckboxItem
            key={code}
            checked={code === activeLanguage}
            disabled={isChangingLanguage}
            onCheckedChange={(checked) => checked && void handleLanguageChange(code)}
          >
            {code === pendingLanguage ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : null}
            {nativeName}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

const themeOptions = [
  { value: "light" as const, icon: Sun, key: "ui.nav.themeLight" as const },
  { value: "dark" as const, icon: Moon, key: "ui.nav.themeDark" as const },
  { value: "system" as const, icon: SunMoon, key: "ui.nav.themeSystem" as const },
];

function ThemeSubmenu() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Sun aria-hidden="true" />
        {t("ui.nav.themeSelector")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-fit">
        {themeOptions.map(({ value, icon: Icon, key }) => (
          <DropdownMenuCheckboxItem
            key={value}
            checked={value === theme}
            onCheckedChange={(checked) => checked && setTheme(value)}
          >
            <Icon aria-hidden="true" />
            {t(key)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function UserIdentity() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <DropdownMenuLabel className="px-2 py-2">
      <div className="flex items-center gap-2.5">
        <Avatar className="size-8">
          <AvatarImage src={user.avatarUrl ?? undefined} alt="" className="object-cover" />
          <AvatarFallback className="text-xs">{getInitials(user.name ?? "")}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm leading-5 font-medium text-foreground">{user.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
        </div>
      </div>
    </DropdownMenuLabel>
  );
}

function PreferencesAndLegal() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <LanguageSubmenu />
      <ThemeSubmenu />
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => navigate({ to: "/about" })}>
        <Info aria-hidden="true" />
        {t("ui.nav.about")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate({ to: "/tos" })}>
        <ScrollText aria-hidden="true" />
        {t("ui.nav.guidelines")}
      </DropdownMenuItem>
    </>
  );
}

function PrimaryNavItems({ overflow }: Readonly<{ overflow: NavOverflow }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      {overflow.browse ? (
        <DropdownMenuItem onClick={() => navigate({ to: "/" })}>
          <Package aria-hidden="true" />
          {t("ui.nav.browse")}
        </DropdownMenuItem>
      ) : null}
      {overflow.creators ? (
        <DropdownMenuItem onClick={() => navigate({ to: "/users" })}>
          <Users aria-hidden="true" />
          {t("ui.nav.creators")}
        </DropdownMenuItem>
      ) : null}
    </>
  );
}

function AccountItems({ showProfile }: Readonly<{ showProfile: boolean }>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <>
      {showProfile ? (
        <DropdownMenuItem
          onClick={() => navigate({ to: "/users/$jointId", params: { jointId: "me" } })}
        >
          <User aria-hidden="true" />
          {t("ui.nav.userPossessive", { name: user.name })}
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem onClick={() => navigate({ to: "/collaborations" })}>
        <Inbox aria-hidden="true" />
        {t("ui.nav.collaborationRequests")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
        <Settings aria-hidden="true" />
        {t("ui.nav.settings")}
      </DropdownMenuItem>
    </>
  );
}

export const UserMenu = ({ overflow }: Readonly<{ overflow: NavOverflow }>) => {
  const { t } = useTranslation();
  const { user, isLoading: isSessionLoading } = useAuth();
  const { mutate: signOut, isPending: isSigningOut } = useSignOut();
  const navigate = useNavigate();

  const showPrimaryNav = overflow.browse || overflow.creators;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isSessionLoading || isSigningOut}
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className={cn(user && "rounded-full")}
            aria-label={t("ui.nav.userMenu")}
          />
        }
      >
        {user ? (
          <Avatar className="size-8">
            <AvatarImage src={user.avatarUrl ?? undefined} alt="" className="object-cover" />
            <AvatarFallback className="text-xs">{getInitials(user.name ?? "")}</AvatarFallback>
          </Avatar>
        ) : (
          <Ellipsis aria-hidden="true" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-fit">
        {user ? (
          <DropdownMenuGroup>
            <UserIdentity />
            <DropdownMenuSeparator />
            {overflow.action ? (
              <>
                <DropdownMenuItem onClick={() => navigate({ to: "/bundles/upload" })}>
                  <Upload aria-hidden="true" />
                  {t("ui.nav.upload")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <PrimaryNavItems overflow={overflow} />
            <AccountItems showProfile={overflow.profile} />
            <DropdownMenuSeparator />
          </DropdownMenuGroup>
        ) : (
          <DropdownMenuGroup>
            {overflow.action ? (
              <>
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/login", search: { redirect: undefined } })}
                >
                  <LogIn aria-hidden="true" />
                  {t("ui.nav.signIn")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <PrimaryNavItems overflow={overflow} />
            {showPrimaryNav ? <DropdownMenuSeparator /> : null}
          </DropdownMenuGroup>
        )}
        <PreferencesAndLegal />
        {user ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
              <LogOut aria-hidden="true" />
              {t("ui.nav.signOut")}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
