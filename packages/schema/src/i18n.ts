import type { TFunction } from "i18next";

export const dTranslator: TFunction = ((...params: unknown[]) => {
  return `t:${JSON.stringify(params)}`;
}) as unknown as TFunction;
