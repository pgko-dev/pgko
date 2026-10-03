import { useCallback, useEffect, useRef, useState } from "react";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Common } from "@pgko.dev/config";
import { type languageMeta, supportedLanguages } from "@pgko.dev/i18n";

import { env } from "@/env.ts";

export type LanguageCode = keyof typeof languageMeta;

const cookieOptions = {
  domain: env.PUBLIC_COOKIE_DOMAIN,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
} as const;

const hostCookieOptions = {
  path: "/",
} as const;

export function useLanguageSelect() {
  const { i18n, t } = useTranslation();
  const activeLanguage = (i18n.resolvedLanguage ?? i18n.language) as LanguageCode;
  const [pendingLanguage, setPendingLanguage] = useState<LanguageCode>();
  const [cookies, setCookie, removeCookie] = useCookies([Common.LanguageCookie]);
  const cookieLanguage = cookies[Common.LanguageCookie] as LanguageCode | undefined;
  const hasSyncedCookie = useRef(false);

  const setLanguageCookie = useCallback(
    (code: LanguageCode) => {
      if (env.PUBLIC_COOKIE_DOMAIN) {
        removeCookie(Common.LanguageCookie, hostCookieOptions);
      }
      setCookie(Common.LanguageCookie, code, cookieOptions);
    },
    [removeCookie, setCookie],
  );

  useEffect(() => {
    if (cookieLanguage !== activeLanguage) {
      setLanguageCookie(activeLanguage);
      hasSyncedCookie.current = true;
      return;
    }
    if (env.PUBLIC_COOKIE_DOMAIN && !hasSyncedCookie.current) {
      hasSyncedCookie.current = true;
      setLanguageCookie(activeLanguage);
    }
  }, [activeLanguage, cookieLanguage, setLanguageCookie]);

  const handleLanguageChange = useCallback(
    async (code: LanguageCode) => {
      if (code === activeLanguage || pendingLanguage) {
        return;
      }

      setPendingLanguage(code);
      try {
        await i18n.changeLanguage(code);
        setLanguageCookie(code);
      } catch {
        toast.error(t("ui.toast.languageChangeFailed"));
      } finally {
        setPendingLanguage(undefined);
      }
    },
    [activeLanguage, i18n, pendingLanguage, setLanguageCookie, t],
  );

  return {
    activeLanguage,
    handleLanguageChange,
    isChangingLanguage: pendingLanguage !== undefined,
    pendingLanguage,
    supportedLanguages,
  };
}
