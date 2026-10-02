import type { ReactNode } from "react";

import { SITE_NAME } from "@pgko-dev/config";

import { useDocumentTitle } from "@/hooks/use-document-title";
import { sitePageTitle } from "@/lib/site-title";
import { cn } from "@/lib/utils";

export function Site({ children }: Readonly<{ children?: ReactNode }>) {
  return <div className="[--header-height:--spacing(16)]">{children}</div>;
}

Site.Main = function SiteMain({
  children,
  className,
}: Readonly<{ children?: ReactNode; className?: string }>) {
  return (
    <div
      className={cn(
        "px-[5vw] py-8 sm:px-[7.5vw] md:px-[10vw] lg:px-[12.5vw] xl:px-[15vw]",
        className,
      )}
    >
      {children}
    </div>
  );
};

Site.Page = function SitePage({
  children,
  title,
  description,
  documentTitle,
}: Readonly<{
  children?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** When `title` is not a plain string (e.g. dynamic bundle name), set this for the browser tab. */
  documentTitle?: string;
}>) {
  const segment =
    documentTitle?.trim() ??
    (typeof title === "string" || typeof title === "number" ? String(title).trim() : undefined);
  useDocumentTitle(segment ? sitePageTitle(segment) : SITE_NAME);

  const hasHeader = (title != null && title !== "") || (description != null && description !== "");
  return (
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
  );
};
