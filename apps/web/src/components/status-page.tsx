import type { ReactNode } from "react";

import { SITE_NAME } from "@pgko.dev/config";

import { Site } from "@/components/site";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { sitePageTitle } from "@/lib/site-title";

type StatusPageProps = {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
};

export function StatusPage({ title, description, children }: Readonly<StatusPageProps>) {
  const segment =
    typeof title === "string" || typeof title === "number" ? String(title).trim() : undefined;
  useDocumentTitle(segment ? sitePageTitle(segment) : SITE_NAME);

  return (
    <Site.Container layout="narrow" className="py-16">
      <div className="w-full space-y-3 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">{title}</h1>
          {description && <p className="text-gray-500">{description}</p>}
        </div>
        {children && <div className="flex justify-center gap-2">{children}</div>}
      </div>
    </Site.Container>
  );
}
