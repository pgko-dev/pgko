import type { ReactNode } from "react";
import { lazy, Suspense, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBundleStats } from "@/hooks/query/use-bundle-stats";
import { formatDateYMD } from "@/lib/date";

import { useBundleManageContext } from "./use-bundle-manage";

const ManageStatsCharts = lazy(() =>
  import("./manage-stats-charts").then((m) => ({ default: m.ManageStatsCharts })),
);

function StatCard({
  title,
  value,
  isPending,
}: Readonly<{
  title: ReactNode;
  value?: number | string | null;
  isPending?: boolean;
}>) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{isPending ? "…" : (value?.toString() ?? "—")}</p>
      </CardContent>
    </Card>
  );
}

export function ManageStatsTab() {
  const { t } = useTranslation();
  const { bundleId } = useBundleManageContext();
  const { data: stats, isPending } = useBundleStats(bundleId);

  const biggestDayTitle = useMemo(
    () =>
      stats?.biggestDay
        ? `${t("ui.uploadDetail.stat.biggestDay")} (${formatDateYMD(stats.biggestDay.date)}):`
        : t("ui.uploadDetail.stat.biggestDay"),
    [stats, t],
  );

  const dailyData = useMemo(() => stats?.dailyDownloadsChart ?? [], [stats]);
  const totalData = useMemo(() => stats?.totalDownloadsChart ?? [], [stats]);

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("ui.uploadDetail.stat.last24h")}
          value={stats?.last24h}
          isPending={isPending}
        />
        <StatCard
          title={t("ui.uploadDetail.stat.lastWeek")}
          value={stats?.lastWeek}
          isPending={isPending}
        />
        <StatCard
          title={t("ui.uploadDetail.stat.lifetime")}
          value={stats?.lifetime}
          isPending={isPending}
        />
        <StatCard title={biggestDayTitle} value={stats?.biggestDay?.count} isPending={isPending} />
      </div>

      <Suspense fallback={<div className="h-[250px] animate-pulse rounded-lg bg-muted/30" />}>
        <ManageStatsCharts dailyData={dailyData} totalData={totalData} isPending={isPending} />
      </Suspense>
    </div>
  );
}
