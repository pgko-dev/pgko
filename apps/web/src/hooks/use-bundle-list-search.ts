import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

import type { BundleFilterValues } from "@/components/bundle/bundle-filter-options";
import {
  type BundleListSearch,
  type BundleSortField,
  type BundleSortOrder,
  DEFAULT_BUNDLE_ORDER,
  DEFAULT_BUNDLE_SORT,
} from "@/lib/bundle-list-search";

export function useBundleListSearch() {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const updateSearch = useCallback(
    (patch: BundleListSearch) => {
      void navigate({
        to: ".",
        search: (previous: BundleListSearch) => ({ ...previous, ...patch }),
        replace: true,
        resetScroll: false,
      });
    },
    [navigate],
  );

  const setSearch = useCallback((q: string) => updateSearch({ q: q || undefined }), [updateSearch]);
  const setSort = useCallback(
    (sort: BundleSortField, order: BundleSortOrder) => updateSearch({ sort, order }),
    [updateSearch],
  );
  const filterValues = useMemo(
    () => ({ diff: search.diff, tag: search.tag }),
    [search.diff, search.tag],
  );
  const setFilterValues = useCallback(
    ({ diff, tag }: BundleFilterValues) =>
      updateSearch({
        diff: diff?.length ? diff : undefined,
        tag: tag?.length ? tag : undefined,
      }),
    [updateSearch],
  );

  return {
    search: search.q ?? "",
    sort: search.sort ?? DEFAULT_BUNDLE_SORT,
    order: search.order ?? DEFAULT_BUNDLE_ORDER,
    filterValues,
    setSearch,
    setSort,
    setFilterValues,
  };
}
