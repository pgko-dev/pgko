import { useRouter } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import type { BundlePublicDetail, SongSummary } from "@pgko.dev/schema";

import { Site } from "@/components/site";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { clearBundleReturnTo, getBundleReturnTo } from "@/lib/bundle-return";

import { BundleBeatmaps } from "./bundle-beatmaps";
import { BundleDetailHeader } from "./bundle-detail-header";

const pageLayout =
  "flex flex-col gap-4 md:h-[calc(100dvh-var(--header-height,4rem)-2rem)] md:min-h-[34rem]";

export function BundleDetailSkeleton() {
  const { t } = useTranslation();
  return (
    <Site.Page documentTitle={t("ui.loading")} layout="wide">
      <div className={pageLayout} aria-hidden>
        <Skeleton className="h-7 w-16 shrink-0" />
        <div className="flex shrink-0 items-center gap-3">
          <Skeleton className="size-20" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-8 w-48 shrink-0" />
        <div className="grid min-h-80 flex-1 gap-3 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <Skeleton className="hidden h-full lg:block" />
          <Skeleton className="h-full" />
        </div>
      </div>
    </Site.Page>
  );
}

export function BundleDetailContent({
  data,
  bundleId,
  songs,
}: Readonly<{
  data: BundlePublicDetail;
  bundleId: string;
  songs: SongSummary[];
}>) {
  const { t } = useTranslation();
  const router = useRouter();
  const revisionChanged = useCallback(() => {
    void router.invalidate();
  }, [router]);
  const displayTitle = data.title || t("ui.bundlePage.title");
  const handleBack = () => {
    const returnTo = getBundleReturnTo();
    if (returnTo) {
      clearBundleReturnTo();
      return router.navigate({ to: returnTo, resetScroll: false });
    }
    return router.navigate({ to: "/" });
  };

  return (
    <Site.Page documentTitle={displayTitle} layout="wide">
      <div className={pageLayout}>
        <div className="flex shrink-0 flex-col gap-2">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={handleBack}>
            <ArrowLeft />
            {t("ui.uploadDetail.actions.back")}
          </Button>
          <BundleDetailHeader data={data} bundleId={bundleId} displayTitle={displayTitle} />
        </div>
        {data.encodingIssues ? (
          <div className="flex shrink-0 items-center gap-2 border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="size-4 shrink-0" />
            {t("ui.bundlePage.encodingWarning")}
          </div>
        ) : null}
        <BundleBeatmaps
          key={`${bundleId}:${data.revision}`}
          songs={songs}
          bundleId={bundleId}
          revision={data.revision}
          onRevisionChange={revisionChanged}
        />
      </div>
    </Site.Page>
  );
}
