import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { SongSummary } from "@pgko-dev/schema";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";

export function BundleBeatmapToolbar({
  desktop,
  showList,
  onToggleList,
  selected,
  selectedIndex,
  count,
  pickerOpen,
  onPickerOpenChange,
  onNavigate,
  children,
}: Readonly<{
  desktop: boolean;
  showList: boolean;
  onToggleList: () => void;
  selected?: SongSummary;
  selectedIndex: number;
  count: number;
  pickerOpen: boolean;
  onPickerOpenChange: (open: boolean) => void;
  onNavigate: (direction: -1 | 1) => void;
  children: ReactNode;
}>) {
  const { t } = useTranslation();
  const toggleLabel = t(showList ? "ui.bundlePage.hideList" : "ui.bundlePage.showList");
  return (
    <div className="flex shrink-0 items-center gap-2">
      {desktop ? (
        <Button
          variant="outline"
          size="icon"
          aria-label={toggleLabel}
          title={toggleLabel}
          aria-expanded={showList}
          onClick={onToggleList}
        >
          {showList ? <PanelLeftClose /> : <PanelLeftOpen />}
        </Button>
      ) : null}
      {showList ? (
        <h3 className="min-w-0 flex-1 text-sm font-semibold">
          {t("ui.bundlePage.songsSectionTitle", { count })}
        </h3>
      ) : (
        <Popover open={pickerOpen} onOpenChange={onPickerOpenChange}>
          <PopoverTrigger
            aria-label={t("ui.bundlePage.selectBeatmap")}
            render={
              <Button variant="outline" className="min-w-0 flex-1 justify-between sm:max-w-sm" />
            }
          >
            <span className="truncate">
              {selected
                ? `${selected.title} · ${selected.level}`
                : t("ui.bundlePage.selectBeatmap")}
            </span>
            <ChevronsUpDown />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="h-[min(30rem,65dvh)] w-[min(24rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0"
          >
            <PopoverTitle className="sr-only">{t("ui.bundlePage.selectBeatmap")}</PopoverTitle>
            {children}
          </PopoverContent>
        </Popover>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {selected ? (
          <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
            {selectedIndex + 1} / {count}
          </span>
        ) : null}
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label={t("ui.bundlePage.previousBeatmap")}
            title={t("ui.bundlePage.previousBeatmap")}
            disabled={selectedIndex <= 0}
            onClick={() => onNavigate(-1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("ui.bundlePage.nextBeatmap")}
            title={t("ui.bundlePage.nextBeatmap")}
            disabled={!count || selectedIndex >= count - 1}
            onClick={() => onNavigate(1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
