import * as Sentry from "@sentry/react";
import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { RefreshCw, Undo2 } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { StatusPage } from "@/components/status-page";
import { Button } from "@/components/ui/button";
import { isIgnorableClientError } from "@/lib/sentry";

export function ErrorComponent({ error, reset }: Readonly<ErrorComponentProps>) {
  const { t } = useTranslation();
  const isStaleChunk = isIgnorableClientError(error);

  useEffect(() => {
    console.error(error);
    if (isIgnorableClientError(error)) {
      return;
    }
    Sentry.captureException(error, {
      mechanism: {
        handled: true,
        type: "tanstack_router",
      },
    });
  }, [error]);

  return (
    <StatusPage title={t("ui.errorPage.title")} description={t("ui.errorPage.description")}>
      <Button
        variant="secondary"
        size="icon"
        nativeButton={false}
        render={<Link to="/" />}
        aria-label={t("ui.nav.browse")}
      >
        <Undo2 />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        aria-label={t("ui.errorPage.retry")}
        onClick={() => {
          if (isStaleChunk) {
            window.location.reload();
            return;
          }
          reset();
        }}
      >
        <RefreshCw />
      </Button>
    </StatusPage>
  );
}
