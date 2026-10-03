import { useTranslation } from "react-i18next";

import type { ChartDiagnostic } from "@pgko.dev/ugc-render";

export function PreviewDiagnostics({
  diagnostics,
}: Readonly<{ diagnostics: readonly ChartDiagnostic[] }>) {
  const { t } = useTranslation(undefined, { keyPrefix: "ui.preview" });
  if (!diagnostics.length) return null;
  return (
    <details className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm">
      <summary className="cursor-pointer">
        {t("diagnostics", { count: diagnostics.length })}
      </summary>
      <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5 font-mono text-xs">
        {diagnostics.map((diagnostic) => (
          <li key={`${diagnostic.line}:${diagnostic.code}:${diagnostic.message}`}>
            {t("line", { line: diagnostic.line })}: {diagnostic.message}
          </li>
        ))}
      </ul>
    </details>
  );
}
