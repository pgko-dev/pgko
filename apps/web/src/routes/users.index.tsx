import { useDebouncedValue } from "@mantine/hooks";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, Search, X } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { UserListSort } from "@pgko.dev/schema";

import { AsyncRefreshIndicator } from "@/components/async-refresh-indicator";
import { Site } from "@/components/site";
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
import { Spinner } from "@/components/ui/spinner";
import { CreatorCard, CreatorCardSkeleton } from "@/components/users/creator-card";
import { useUserList } from "@/hooks/query/use-user-list";

export const Route = createFileRoute("/users/")({
  component: RouteComponent,
});

const DEBOUNCE_MS = 350;
const MIN_SEARCH_LENGTH = 2;
const SORT_OPTIONS: UserListSort[] = ["activity", "bundles", "name"];
const SORT_LABEL_KEY = {
  activity: "ui.usersPage.sortActivity",
  bundles: "ui.usersPage.sortBundles",
  name: "ui.usersPage.sortName",
} as const satisfies Record<UserListSort, string>;

type SortOrder = "asc" | "desc";

function RouteComponent() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<UserListSort>("activity");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [debouncedSearch] = useDebouncedValue(search, DEBOUNCE_MS);

  const trimmedSearch = debouncedSearch.trim();
  const isSearching = trimmedSearch.length >= MIN_SEARCH_LENGTH;

  const filters = useMemo(
    () => ({ q: isSearching ? trimmedSearch : undefined, sort, order }),
    [isSearching, trimmedSearch, sort, order],
  );

  const { data, isLoading, isError, isFetching, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useUserList(filters);

  const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          return fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleClearSearch = useCallback(() => setSearch(""), []);
  const handleToggleOrder = useCallback(
    () => setOrder((prev) => (prev === "desc" ? "asc" : "desc")),
    [],
  );

  let listContent: ReactNode;
  if (isLoading) {
    listContent = (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CreatorCardSkeleton key={i} />
        ))}
      </div>
    );
  } else if (isError) {
    listContent = (
      <p className="py-12 text-center text-sm text-muted-foreground">{t("ui.usersPage.error")}</p>
    );
  } else if (items.length === 0) {
    listContent = (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {t(isSearching ? "ui.usersPage.emptySearch" : "ui.usersPage.empty")}
      </p>
    );
  } else {
    listContent = (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((user) => (
            <CreatorCard key={user.id} user={user} />
          ))}
        </div>
        <div ref={sentinelRef} aria-hidden className="h-px" />
        {isFetchingNextPage && (
          <div className="flex justify-center py-6">
            <Spinner className="size-5 text-muted-foreground" aria-hidden />
          </div>
        )}
      </>
    );
  }

  return (
    <Site.Page
      title={t("ui.usersPage.title")}
      description={t("ui.usersPage.description")}
      documentTitle={t("ui.usersPage.browserTab")}
    >
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("ui.usersPage.searchPlaceholder")}
            aria-label={t("ui.usersPage.searchPlaceholder")}
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
        {search.trim().length > 0 && search.trim().length < MIN_SEARCH_LENGTH && (
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

          <Select value={sort} onValueChange={(v) => setSort(v as UserListSort)}>
            <SelectTrigger size="sm" className="w-38">
              <SelectValue>{t(SORT_LABEL_KEY[sort])}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{t("ui.bundleList.sortLabel")}</SelectLabel>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(SORT_LABEL_KEY[option])}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <AsyncRefreshIndicator
            pending={isFetching && !isLoading && !isFetchingNextPage}
            label={t("ui.loading")}
          />
        </div>
      </div>

      <div aria-busy={isFetching || undefined}>{listContent}</div>
    </Site.Page>
  );
}
