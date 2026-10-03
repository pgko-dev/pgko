import "i18next";
import { defaultNamespace } from "@pgko.dev/i18n";
import type { ValiTranslation } from "@pgko.dev/i18n/en";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNamespace;
    resources: {
      [defaultNamespace]: {
        vali: ValiTranslation;
      };
    };
  }
}
