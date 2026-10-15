import { ArrowDownWideNarrow, ArrowUpWideNarrow, Search, X } from "lucide-react";
import { type ReactNode, useCallback } from "react";
import { useTranslation } from "react-i18next";

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
import {
  BUNDLE_SORT_FIELDS,
  type BundleSortField,
  type BundleSortOrder,
} from "@/lib/bundle-list-search";

import { BundleFilterOptions, type BundleFilterValues } from "./bundle-filter-options";

interface BundleListFiltersProps {
  filters: BundleFilterValues;
  onFiltersChange: (value: BundleFilterValues) => void;
  search: string;
  onSearchChange: (value: string) => void;
  sort: BundleSortField;
  onSortChange: (sort: BundleSortField, order: BundleSortOrder) => void;
  order: BundleSortOrder;
  searchPlaceholder?: string;
  extraFilters?: ReactNode;
  draftsOnly?: boolean;
  isRefreshing?: boolean;
}

export function BundleListFilters({
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
  order,
  searchPlaceholder,
  extraFilters,
  draftsOnly,
  isRefreshing = false,
}: Readonly<BundleListFiltersProps>) {
  const { t } = useTranslation();
  const placeholder = searchPlaceholder ?? t("ui.bundleList.searchPlaceholder");

  const handleClearSearch = useCallback(() => onSearchChange(""), [onSearchChange]);
  const sortDescription = t(
    `ui.bundleList.sortDirection.${draftsOnly ? "createdAt" : sort}.${order}`,
  );
  const handleToggleOrder = useCallback(
    () => onSortChange(sort, order === "desc" ? "asc" : "desc"),
    [onSortChange, sort, order],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="pr-16 pl-8"
        />
        <AsyncRefreshIndicator
          pending={isRefreshing}
          label={t("ui.loading")}
          className="absolute top-1/2 right-8 -translate-y-1/2"
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

      <BundleFilterOptions
        value={filters}
        onChange={onFiltersChange}
        extraFilters={extraFilters}
        sorter={
          <>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleToggleOrder}
              aria-label={t("ui.bundleList.toggleOrder")}
              aria-description={sortDescription}
              title={sortDescription}
            >
              {order === "desc" ? (
                <ArrowDownWideNarrow className="size-3.5" />
              ) : (
                <ArrowUpWideNarrow className="size-3.5" />
              )}
            </Button>

            <Select
              value={draftsOnly ? "createdAt" : sort}
              disabled={draftsOnly}
              onValueChange={(value) => {
                const field = BUNDLE_SORT_FIELDS.find((option) => option === value);
                if (field) onSortChange(field, order);
              }}
            >
              <SelectTrigger size="sm" className="w-38" aria-label={t("ui.bundleList.sortLabel")}>
                <SelectValue>
                  {t(`ui.bundleList.sort.${draftsOnly ? "createdAt" : sort}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{t("ui.bundleList.sortLabel")}</SelectLabel>
                  {draftsOnly ? (
                    <SelectItem value="createdAt">{t("ui.bundleList.sort.createdAt")}</SelectItem>
                  ) : (
                    BUNDLE_SORT_FIELDS.map((field) => (
                      <SelectItem key={field} value={field}>
                        {t(`ui.bundleList.sort.${field}`)}
                      </SelectItem>
                    ))
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </>
        }
      />
    </div>
  );
}
