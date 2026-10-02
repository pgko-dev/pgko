"use client";

import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatDateYMD } from "@/lib/date";
import { cn } from "@/lib/utils";

const Area = lazy(() => import("recharts").then((mod) => ({ default: mod.Area })));
const AreaChart = lazy(() => import("recharts").then((mod) => ({ default: mod.AreaChart })));
const CartesianGrid = lazy(() =>
  import("recharts").then((mod) => ({ default: mod.CartesianGrid })),
);
const XAxis = lazy(() => import("recharts").then((mod) => ({ default: mod.XAxis })));
const YAxis = lazy(() => import("recharts").then((mod) => ({ default: mod.YAxis })));

type DailyPoint = { date: string; count: number };
type TotalPoint = { date: string; total: number };

export type ManageStatsChartsProps = {
  dailyData: DailyPoint[];
  totalData: TotalPoint[];
  isPending: boolean;
};

type MergedPoint = { date: string; count: number; total: number };

function ChartPlaceholder({ message }: Readonly<{ message: string }>) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function ToggleLegend({
  config,
  visible,
  onToggle,
}: Readonly<{
  config: ChartConfig;
  visible: Record<string, boolean>;
  onToggle: (key: string) => void;
}>) {
  return (
    <div className="flex items-center justify-center gap-4 pt-3">
      {Object.entries(config).map(([key, entry]) => (
        <button
          key={key}
          type="button"
          onClick={() => onToggle(key)}
          className={cn(
            "flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-all select-none",
            visible[key]
              ? "border-border bg-background hover:bg-accent"
              : "border-transparent bg-transparent text-muted-foreground opacity-50 hover:opacity-75",
          )}
        >
          <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.label}
        </button>
      ))}
    </div>
  );
}

export function ManageStatsCharts({
  dailyData,
  totalData,
  isPending,
}: Readonly<ManageStatsChartsProps>) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState<Record<string, boolean>>({ count: true, total: true });

  const onToggle = useCallback((key: string) => {
    setVisible((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Prevent turning off all lines
      if (!Object.values(next).some(Boolean)) return prev;
      return next;
    });
  }, []);

  const chartConfig = useMemo(
    () =>
      ({
        count: {
          label: t("ui.uploadDetail.stat.chartLegendDownloads"),
          color: "var(--chart-1)",
        },
        total: {
          label: t("ui.uploadDetail.stat.chartLegendTotal"),
          color: "var(--chart-2)",
        },
      }) satisfies ChartConfig,
    [t],
  );

  const mergedData = useMemo(() => {
    const totalMap = new Map(totalData.map((p) => [p.date, p.total]));
    return dailyData.map<MergedPoint>((d) => ({
      date: d.date,
      count: d.count,
      total: totalMap.get(d.date) ?? 0,
    }));
  }, [dailyData, totalData]);

  const yDomain = useMemo((): [number, number | "auto"] => {
    if (mergedData.length === 0) return [0, "auto"];
    let max = 0;
    for (const point of mergedData) {
      if (visible.count) max = Math.max(max, point.count);
      if (visible.total) max = Math.max(max, point.total);
    }
    return [0, max || "auto"];
  }, [mergedData, visible]);

  const hasData = dailyData.length > 0 || totalData.length > 0;

  return (
    <Card className="pt-0">
      <CardHeader className="space-y-0 border-b py-5">
        <CardTitle>{t("ui.uploadDetail.stat.downloadsChart")}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          {isPending || !hasData ? (
            <ChartPlaceholder message={isPending ? "…" : "No data"} />
          ) : (
            <Suspense fallback={<ChartPlaceholder message="…" />}>
              <AreaChart data={mergedData}>
                <defs>
                  <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={formatDateYMD}
                />
                <YAxis hide domain={yDomain} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) =>
                        typeof value === "string" || typeof value === "number"
                          ? formatDateYMD(String(value))
                          : ""
                      }
                      indicator="dot"
                    />
                  }
                />
                <Area
                  dataKey="count"
                  type="natural"
                  style={{ opacity: visible.count ? 1 : 0, transition: "opacity 0.25s ease" }}
                  fill="url(#fillCount)"
                  stroke="var(--color-count)"
                />
                <Area
                  dataKey="total"
                  type="natural"
                  style={{ opacity: visible.total ? 1 : 0, transition: "opacity 0.25s ease" }}
                  fill="url(#fillTotal)"
                  stroke="var(--color-total)"
                />
                <ChartLegend
                  content={
                    <ToggleLegend config={chartConfig} visible={visible} onToggle={onToggle} />
                  }
                />
              </AreaChart>
            </Suspense>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
