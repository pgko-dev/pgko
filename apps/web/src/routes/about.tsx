import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import Changelog from "@/components/about/changelog.mdx";
import { Todo } from "@/components/about/todo";
import { Site } from "@/components/site";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/env";
import { useServerConfig } from "@/hooks/query/use-server-config";
import { formatDateYMDHM } from "@/lib/date";

export const Route = createFileRoute("/about")({
  component: About,
});

function formatBuildTimestamp(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return formatDateYMDHM(value);
}

function SectionCard({ title, children }: Readonly<{ title?: ReactNode; children: ReactNode }>) {
  return (
    <Card>
      {title != null && (
        <CardHeader>
          {title != null && (
            <CardTitle className="text-lg font-semibold tracking-tight">{title}</CardTitle>
          )}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function About() {
  const { t } = useTranslation();
  const serverConfig = useServerConfig();

  const webBuild =
    env.PUBLIC_BUILD_TIME != null && env.PUBLIC_BUILD_TIME !== ""
      ? formatBuildTimestamp(env.PUBLIC_BUILD_TIME)
      : null;
  const apiBuild =
    !serverConfig.isError &&
    serverConfig.isSuccess &&
    serverConfig.data.version != null &&
    serverConfig.data.version !== ""
      ? formatBuildTimestamp(serverConfig.data.version)
      : null;

  const showVersion = webBuild != null || apiBuild != null;

  return (
    <Site.Page title={t("ui.aboutPage.title")}>
      {showVersion && (
        <SectionCard title={t("ui.aboutPage.versionHeading")}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            {webBuild != null && (
              <>
                <dt className="text-muted-foreground">{t("ui.aboutPage.buildWebLabel")}</dt>
                <dd>{webBuild}</dd>
              </>
            )}
            {apiBuild != null && (
              <>
                <dt className="text-muted-foreground">{t("ui.aboutPage.buildApiLabel")}</dt>
                <dd>{apiBuild}</dd>
              </>
            )}
          </dl>
        </SectionCard>
      )}

      <SectionCard title={t("ui.aboutPage.authorHeading")}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">GitHub</dt>
          <dd>
            <a
              href="https://github.com/pgko-dev/pgko/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              pgko-dev/pgko/issues
            </a>
          </dd>
          <dt className="text-muted-foreground">{t("ui.aboutPage.authorQQ")}</dt>
          <dd>
            <code className="rounded bg-muted px-1.5 py-0.5">281262885</code>
          </dd>
          <dt className="text-muted-foreground">{t("ui.aboutPage.authorDiscord")}</dt>
          <dd>
            <code className="rounded bg-muted px-1.5 py-0.5">@niflhevier</code>
          </dd>
        </dl>
      </SectionCard>

      <SectionCard title={t("ui.aboutPage.todoHeading")}>
        <Todo />
      </SectionCard>

      <SectionCard title={t("ui.aboutPage.changelogHeading")}>
        <div className="typeset typeset-docs">
          <Changelog />
        </div>
      </SectionCard>
    </Site.Page>
  );
}
