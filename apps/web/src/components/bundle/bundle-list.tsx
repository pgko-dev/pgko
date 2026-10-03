import { useDebouncedValue } from "@mantine/hooks";
import { useElementScrollRestoration } from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  type ReactNode,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import type { BundleListItem, BundleListQuery, BundleListSong } from "@pgko.dev/schema";

import { Spinner } from "@/components/ui/spinner";
import { useBundleList } from "@/hooks/query/use-bundle-list";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePreviewAudio } from "@/hooks/use-preview-audio";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { consumeReturnScrollY } from "@/lib/bundle-return";

import { BundleCard } from "./bundle-card";
import { CARD_HEIGHT, CARD_HEIGHT_MOBILE } from "./bundle-card-constants";
import { BundleListFilters } from "./bundle-list-filters";
import { ScrollToTopButton } from "./scroll-to-top-button";

const DEBOUNCE_MS = 350;
const GAP = 16;

interface BundleListProps {
  userId?: string;
  currentUserId?: string;
  noLinkUserId?: string;
  showFilters?: boolean;
  showDownloadCount?: boolean;
  searchPlaceholder?: string;
  draftsOnly?: boolean;
  collaborationsOnly?: boolean;
  linkToManage?: boolean;
  collaborationStatus?: "pending" | "accepted" | "declined";
  renderExtraActions?: (bundle: BundleListItem, isMobile: boolean) => ReactNode;
  extraFilters?: ReactNode;
}

interface BundleListVirtualizedProps {
  scrollMargin: number;
  rows: BundleListItem[][];
  cols: number;
  initialOffset: number | undefined;
  sort: NonNullable<BundleListQuery["sort"]>;
  userId?: string;
  currentUserId?: string;
  noLinkUserId?: string;
  linkToManage?: boolean;
  showDownloadCount?: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  onPlayPreview: (bundleId: string, song: BundleListSong) => void;
  getPlayingSongIdForBundle: (bundleId: string) => string | null;
  renderExtraActions?: (bundle: BundleListItem, isMobile: boolean) => ReactNode;
}

const BundleListVirtualized = memo(function BundleListVirtualized({
  scrollMargin,
  rows,
  cols,
  initialOffset,
  sort,
  userId,
  currentUserId,
  noLinkUserId,
  linkToManage,
  showDownloadCount,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onPlayPreview,
  getPlayingSongIdForBundle,
  renderExtraActions,
}: Readonly<BundleListVirtualizedProps>) {
  const isMobile = useIsMobile();
  const rowHeight = isMobile ? CARD_HEIGHT_MOBILE + GAP : CARD_HEIGHT + GAP;
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => rowHeight,
    overscan: 3,
    scrollMargin,
    initialOffset: initialOffset ?? 0,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useLayoutEffect(() => {
    virtualizer.measure();
  }, [virtualizer, rowHeight, cols, scrollMargin]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: "relative",
        }}
      >
        {virtualItems.map((virtualRow) => {
          const rowBundles = rows[virtualRow.index];
          if (!rowBundles) return null;
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: isMobile ? CARD_HEIGHT_MOBILE : CARD_HEIGHT,
                transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
                zIndex: rows.length - virtualRow.index,
              }}
            >
              <div
                className="grid h-full gap-4"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {rowBundles.map((bundle) => {
                  const isOwner = !!currentUserId && bundle.uploadedBy.id === currentUserId;
                  const isCollaborator =
                    !!currentUserId && bundle.collaborators.some((c) => c.id === currentUserId);

                  return (
                    <BundleCard
                      key={bundle.id}
                      bundle={bundle}
                      onPlayPreview={(song) => onPlayPreview(bundle.id, song)}
                      playingSongId={getPlayingSongIdForBundle(bundle.id)}
                      noLinkUserId={userId ?? noLinkUserId}
                      linkToManage={linkToManage && (isOwner || isCollaborator)}
                      showDownloadCount={showDownloadCount}
                      dateSort={
                        sort === "reuploadedAt" || sort === "releasedAt" ? sort : "releasedAt"
                      }
                      renderExtraActions={renderExtraActions}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div ref={sentinelRef} className="flex justify-center py-4">
        {isFetchingNextPage && <Spinner className="size-5 text-muted-foreground" aria-hidden />}
      </div>
    </>
  );
});

export const BundleList = memo(function BundleList({
  userId,
  currentUserId,
  noLinkUserId,
  showFilters = true,
  showDownloadCount = true,
  searchPlaceholder,
  draftsOnly,
  collaborationsOnly,
  linkToManage,
  collaborationStatus,
  renderExtraActions,
  extraFilters,
}: Readonly<BundleListProps>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, DEBOUNCE_MS);
  const [sort, setSort] = useState<NonNullable<BundleListQuery["sort"]>>("reuploadedAt");
  const [order, setOrder] = useState<NonNullable<BundleListQuery["order"]>>("desc");

  const filters = useMemo<BundleListQuery>(
    () => ({
      q: debouncedSearch || undefined,
      userId,
      sort,
      order,
      draftsOnly: draftsOnly === true ? true : undefined,
      collaborationsOnly: collaborationsOnly === true ? true : undefined,
      collaborationStatus,
    }),
    [debouncedSearch, userId, sort, order, draftsOnly, collaborationsOnly, collaborationStatus],
  );

  const { data, isLoading, isError, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useBundleList(filters, {
      account: Boolean(
        (currentUserId && userId === currentUserId) ||
        draftsOnly ||
        collaborationsOnly ||
        collaborationStatus,
      ),
    });

  const { audioRef: previewAudioRef, playingId, playPreview, stopPreview } = usePreviewAudio();

  const playPreviewRef = useRef(playPreview);
  useEffect(() => {
    playPreviewRef.current = playPreview;
  });

  const handlePlayPreview = useCallback((bundleId: string, song: BundleListSong) => {
    playPreviewRef.current({ id: `${bundleId}:${song.id}`, previewUrl: song.previewUrl });
  }, []);

  const getPlayingSongIdForBundle = useCallback(
    (bundleId: string) =>
      playingId?.startsWith(`${bundleId}:`) ? playingId.slice(bundleId.length + 1) : null,
    [playingId],
  );

  // ── Column count (parent): scroll virtualizer lives in BundleListVirtualized so filters
  //    are not re-rendered on every scroll tick. This ref still wraps loading/empty/list for width.
  const gridRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(1);
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const update = (width: number) => {
      setCols(width >= 1024 ? 2 : 1);
      setScrollMargin(el.offsetTop);
    };
    const observer = new ResizeObserver(([entry]) => {
      update(entry.contentRect.width);
    });
    observer.observe(el);
    update(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  // ── Bundle rows ─────────────────────────────────────────────────────────────
  const bundles = useMemo(() => data?.pages.flatMap((page) => page.bundles) ?? [], [data]);

  const rows = useMemo(() => {
    const result: (typeof bundles)[] = [];
    for (let i = 0; i < bundles.length; i += cols) {
      result.push(bundles.slice(i, i + cols));
    }
    return result;
  }, [bundles, cols]);

  const scrollEntry = useElementScrollRestoration({ getElement: () => window });
  const [initialOffset] = useState(() => consumeReturnScrollY() ?? scrollEntry?.scrollY);

  const { visible: showScrollToTop, scrollToTop } = useScrollToTop();

  let listContent: ReactNode;
  if (isLoading) {
    listContent = (
      <div className="flex justify-center py-12">
        <Spinner className="size-8 text-muted-foreground" aria-label={t("ui.loading")} />
      </div>
    );
  } else if (isError) {
    listContent = (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">{t("api.error.unknown")}</p>
      </div>
    );
  } else if (bundles.length === 0) {
    listContent = (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">{t("ui.bundleList.empty")}</p>
      </div>
    );
  } else {
    listContent = (
      <BundleListVirtualized
        scrollMargin={scrollMargin}
        rows={rows}
        cols={cols}
        initialOffset={initialOffset}
        sort={sort}
        userId={userId}
        currentUserId={currentUserId}
        noLinkUserId={noLinkUserId}
        linkToManage={linkToManage}
        showDownloadCount={showDownloadCount}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        onPlayPreview={handlePlayPreview}
        getPlayingSongIdForBundle={getPlayingSongIdForBundle}
        renderExtraActions={renderExtraActions}
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <ScrollToTopButton
        visible={showScrollToTop}
        onClick={scrollToTop}
        ariaLabel={t("ui.bundleList.backToTop")}
      />
      {showFilters && (
        <BundleListFilters
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          order={order}
          onOrderChange={setOrder}
          searchPlaceholder={searchPlaceholder}
          extraFilters={extraFilters}
          draftsOnly={draftsOnly}
          isRefreshing={isFetching && !isLoading && !isFetchingNextPage}
        />
      )}

      {/* Always render gridRef so ResizeObserver can measure cols before data loads */}
      <div ref={gridRef} aria-busy={isFetching || undefined}>
        {listContent}
      </div>

      <audio ref={previewAudioRef} onEnded={stopPreview} hidden>
        <track kind="captions" />
      </audio>
    </div>
  );
});
