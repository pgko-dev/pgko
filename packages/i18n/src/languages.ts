export const supportedLanguages = [
  {
    code: "en",
    nativeName: "English",
  },
  {
    code: "zh-Hant",
    nativeName: "繁體中文",
  },
  {
    code: "zh-Hans",
    nativeName: "简体中文",
  },
  {
    code: "ja",
    nativeName: "日本語",
  },
  {
    code: "ko",
    nativeName: "한국어",
  },
] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number]["code"];

export const defaultLanguage = "en" as const;
export const defaultNamespace = "translation" as const;

export const languageMeta = Object.fromEntries(
  supportedLanguages.map((lang) => [lang.code, lang]),
) as Record<SupportedLanguage, (typeof supportedLanguages)[number]>;

export const supportedLanguageCodes = new Set(supportedLanguages.map(({ code }) => code));
export const supportedLanguageCodesArray = Array.from(supportedLanguageCodes);
