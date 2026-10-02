import "i18next";
import type { defaultNamespace, LanguageResources } from "@pgko-dev/i18n";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNamespace;
    resources: LanguageResources;
  }
}
