import {
  api as enApi,
  type ApiTranslation,
  ui as enUi,
  type UiTranslation,
  vali as enVali,
  type ValiTranslation,
} from "./en/index.js";
import { api as jaApi, ui as jaUi, vali as jaVali } from "./ja/index.js";
import { api as koApi, ui as koUi, vali as koVali } from "./ko/index.js";
import { defaultNamespace, type SupportedLanguage } from "./languages.js";
import { api as zhHansApi, ui as zhHansUi, vali as zhHansVali } from "./zh-hans/index.js";
import { api as zhHantApi, ui as zhHantUi, vali as zhHantVali } from "./zh-hant/index.js";

type LanguageResource = {
  api: ApiTranslation;
  ui: UiTranslation;
  vali: ValiTranslation;
};

export const languageResources = {
  en: { [defaultNamespace]: { api: enApi, ui: enUi, vali: enVali } },
  ja: { [defaultNamespace]: { api: jaApi, ui: jaUi, vali: jaVali } },
  ko: { [defaultNamespace]: { api: koApi, ui: koUi, vali: koVali } },
  "zh-Hans": {
    [defaultNamespace]: { api: zhHansApi, ui: zhHansUi, vali: zhHansVali },
  },
  "zh-Hant": {
    [defaultNamespace]: { api: zhHantApi, ui: zhHantUi, vali: zhHantVali },
  },
} satisfies Record<SupportedLanguage, Record<typeof defaultNamespace, LanguageResource>>;
