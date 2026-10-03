import { createFileRoute } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";

import type { SupportedLanguage } from "@pgko.dev/i18n";

import JapaneseTerms from "@/components/about/terms-of-use.ja.mdx";
import KoreanTerms from "@/components/about/terms-of-use.ko.mdx";
import EnglishTerms from "@/components/about/terms-of-use.mdx";
import SimplifiedChineseTerms from "@/components/about/terms-of-use.zh-Hans.mdx";
import TraditionalChineseTerms from "@/components/about/terms-of-use.zh-Hant.mdx";
import { Site } from "@/components/site";

export const Route = createFileRoute("/tos")({
  component: TermsOfUsePage,
});

function TermsOfUsePage() {
  const { i18n, t } = useTranslation();
  const TermsOfUse = termsByLanguage[i18n.language as SupportedLanguage] ?? EnglishTerms;

  return (
    <Site.Page documentTitle={t("ui.nav.guidelines")} layout="narrow">
      <div className="typeset typeset-docs">
        <TermsOfUse />
      </div>
    </Site.Page>
  );
}

const termsByLanguage: Record<SupportedLanguage, ComponentType> = {
  en: EnglishTerms,
  ja: JapaneseTerms,
  ko: KoreanTerms,
  "zh-Hans": SimplifiedChineseTerms,
  "zh-Hant": TraditionalChineseTerms,
};
