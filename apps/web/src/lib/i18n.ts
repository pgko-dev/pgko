import getUserLocale from "get-user-locale";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Cookies from "universal-cookie";

import { Common } from "@pgko-dev/config";
import {
  defaultLanguage,
  defaultNamespace,
  type SupportedLanguage,
  supportedLanguageCodes,
  supportedLanguageCodesArray,
} from "@pgko-dev/i18n";
import { languageResources } from "@pgko-dev/i18n/all";

function detectBrowserLanguage(): SupportedLanguage | undefined {
  try {
    const locale = getUserLocale({ useFallbackLocale: false });
    if (!locale) {
      return undefined;
    }

    const normalized = locale.trim() as SupportedLanguage;
    if (!normalized) {
      return undefined;
    }

    if (supportedLanguageCodes.has(normalized)) {
      return normalized;
    }

    const lower = normalized.toLowerCase();
    const base = lower.split("-")[0];

    if (base === "ja") {
      return "ja";
    }

    if (base === "ko") {
      return "ko";
    }

    if (base === "en") {
      return "en";
    }

    if (base === "zh") {
      const isTraditional =
        lower.includes("hant") ||
        lower.endsWith("-tw") ||
        lower.endsWith("-hk") ||
        lower.endsWith("-mo");

      if (isTraditional) {
        return "zh-Hant";
      }

      return "zh-Hans";
    }
  } catch {
    // Ignore detection errors and fall through to defaultLanguage
  }

  return undefined;
}

function getInitialLanguage(): SupportedLanguage {
  const saved = new Cookies().get(Common.LanguageCookie) as SupportedLanguage | undefined;
  if (saved && supportedLanguageCodes.has(saved)) {
    console.log("Using saved language:", saved);
    return saved;
  }

  const detected = detectBrowserLanguage();
  if (detected && supportedLanguageCodes.has(detected)) {
    console.log("Using detected language:", detected);
    return detected;
  }

  console.log("Using default language:", defaultLanguage);
  return defaultLanguage;
}

const initialLanguage = getInitialLanguage();

await i18n.use(initReactI18next).init({
  lng: initialLanguage,
  resources: languageResources,
  supportedLngs: supportedLanguageCodesArray,
  fallbackLng: defaultLanguage,
  defaultNS: defaultNamespace,
  fallbackNS: defaultNamespace,
  interpolation: {
    escapeValue: false,
  },
});

function updateDocumentLanguage(language: string) {
  document.documentElement.lang = language;
  document.documentElement.dir = i18n.dir(language);
}

updateDocumentLanguage(i18n.resolvedLanguage ?? initialLanguage);
i18n.on("languageChanged", updateDocumentLanguage);
