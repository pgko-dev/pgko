import type { ApiTranslation, UiTranslation, ValiTranslation } from "@pgko-dev/i18n/en";

import type { defaultNamespace } from "./languages.js";
import type { DotNestedKeys } from "./utils.js";

export type LanguageResources = {
  [defaultNamespace]: {
    vali: ValiTranslation;
    ui: UiTranslation;
    api: ApiTranslation;
  };
};

export type BackendLanguageResources = {
  [defaultNamespace]: {
    vali: ValiTranslation;
    api: ApiTranslation;
  };
};

export type TranslationKey = DotNestedKeys<LanguageResources[typeof defaultNamespace]>;
export type BackendTranslationKey = DotNestedKeys<
  BackendLanguageResources[typeof defaultNamespace]
>;
