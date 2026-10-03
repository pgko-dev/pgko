import type { ReactNode } from "react";

import { SITE_NAME } from "@pgko.dev/config";

import { useDocumentTitle } from "@/hooks/use-document-title";
import { sitePageTitle } from "@/lib/site-title";
import { cn } from "@/lib/utils";

const pageWidths = {
  standard: "max-w-[1200px]",
  wide: "max-w-[1600px]",
  narrow: "max-w-3xl",
};

type PageLayout = keyof typeof pageWidths;

export function Site({ children }: Readonly<{ children?: ReactNode }>) {
  return (
    <div className="[--header-height:--spacing(16)] [--page-gutter:--spacing(4)] sm:[--page-gutter:--spacing(6)] md:[--page-gutter:--spacing(8)] lg:[--page-gutter:--spacing(10)] xl:[--page-gutter:--spacing(12)]">
      {children}
    </div>
  );
}

Site.Main = function SiteMain({
  children,
  className,
}: Readonly<{ children?: ReactNode; className?: string }>) {
  return (
    <main className={cn("w-full [view-transition-name:main-content]", className)}>{children}</main>
  );
};

Site.Container = function SiteContainer({
  children,
  layout = "standard",
  className,
}: Readonly<{ children?: ReactNode; layout?: PageLayout; className?: string }>) {
  return (
    <div
      className={cn("px-[var(--page-gutter,1rem)]", layout === "wide" ? "py-4" : "py-8", className)}
    >
      <div className={cn("mx-auto w-full", pageWidths[layout])}>{children}</div>
    </div>
  );
};

Site.Page = function SitePage({
  children,
  title,
  description,
  documentTitle,
  layout = "standard",
}: Readonly<{
  children?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** When `title` is not a plain string (e.g. dynamic bundle name), set this for the browser tab. */
  documentTitle?: string;
  layout?: PageLayout;
}>) {
  const segment =
    documentTitle?.trim() ??
    (typeof title === "string" || typeof title === "number" ? String(title).trim() : undefined);
  useDocumentTitle(segment ? sitePageTitle(segment) : SITE_NAME);

  const hasHeader = (title != null && title !== "") || (description != null && description !== "");
  return (
    <Site.Container layout={layout}>
      <div className="w-full space-y-6">
        {hasHeader && (
          <header className="space-y-2">
            {title != null && title !== "" && (
              <div className="text-3xl font-semibold tracking-tight">{title}</div>
            )}
            {description != null && description !== "" && (
              <div className="text-muted-foreground">{description}</div>
            )}
          </header>
        )}
        {children}
      </div>
    </Site.Container>
  );
};
