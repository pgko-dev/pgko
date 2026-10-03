import { ArrowDownWideNarrow, ArrowUpWideNarrow, Search, X } from "lucide-react";
import { type ReactNode, useCallback } from "react";
import { useTranslation } from "react-i18next";

import type { BundleListQuery } from "@pgko.dev/schema";

import { AsyncRefreshIndicator } from "@/components/async-refresh-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortField = NonNullable<BundleListQuery["sort"]>;
type SortOrder = NonNullable<BundleListQuery["order"]>;

interface BundleListFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortField;
  onSortChange: (value: SortField) => void;
  order: SortOrder;
  onOrderChange: (value: SortOrder) => void;
  searchPlaceholder?: string;
  extraFilters?: ReactNode;
  draftsOnly?: boolean;
  isRefreshing?: boolean;
}

const SORT_OPTIONS: SortField[] = ["reuploadedAt", "releasedAt", "title", "artist", "downloads"];

export function BundleListFilters({
  search,
  onSearchChange,
  sort,
  onSortChange,
  order,
  onOrderChange,
  searchPlaceholder,
  extraFilters,
  draftsOnly,
  isRefreshing = false,
}: Readonly<BundleListFiltersProps>) {
  const { t } = useTranslation();
  const placeholder = searchPlaceholder ?? t("ui.bundleList.searchPlaceholder");

  const handleClearSearch = useCallback(() => onSearchChange(""), [onSearchChange]);
  const handleToggleOrder = useCallback(
    () => onOrderChange(order === "desc" ? "asc" : "desc"),
    [onOrderChange, order],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="pr-8 pl-8"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute top-1/2 right-1.5 -translate-y-1/2"
            onClick={handleClearSearch}
            aria-label={t("ui.bundleList.clearSearch")}
          >
            <X className="size-3" />
          </Button>
        )}
      </div>
      {search.trim().length > 0 && search.trim().length < 2 && (
        <output className="block text-xs text-muted-foreground">
          {t("ui.bundleList.searchMinLengthHint")}
        </output>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={handleToggleOrder}
          aria-label={t("ui.bundleList.toggleOrder")}
        >
          {order === "desc" ? (
            <ArrowDownWideNarrow className="size-3.5" />
          ) : (
            <ArrowUpWideNarrow className="size-3.5" />
          )}
        </Button>

        {draftsOnly ? (
          <Select value="createdAt" disabled>
            <SelectTrigger size="sm" className="w-38">
              <SelectValue>{t("ui.bundleList.sort.createdAt")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">{t("ui.bundleList.sort.createdAt")}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Select value={sort} onValueChange={(v) => onSortChange(v as SortField)}>
            <SelectTrigger size="sm" className="w-38">
              <SelectValue>{t(`ui.bundleList.sort.${sort}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{t("ui.bundleList.sortLabel")}</SelectLabel>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {t(`ui.bundleList.sort.${opt}`)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}

        {extraFilters}
        <AsyncRefreshIndicator pending={isRefreshing} label={t("ui.loading")} />
      </div>
    </div>
  );
}
