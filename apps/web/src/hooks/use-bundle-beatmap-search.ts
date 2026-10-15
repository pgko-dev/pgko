import { useNavigate, useRouterState, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";

import { type BundleBeatmapSearch, resolveBundleBeatmapId } from "@/lib/bundle-beatmap-search";

export function useBundleBeatmapSearch(songs: readonly { id: string }[]) {
  const { bId } = useSearch({ strict: false });
  const navigate = useNavigate();
  const isNavigating = useRouterState({ select: (state) => state.status === "pending" });
  const selectedId = resolveBundleBeatmapId(songs, bId);
  const setSelectedId = useCallback(
    (id: string | null) => {
      void navigate({
        to: ".",
        search: (previous: BundleBeatmapSearch) => ({ ...previous, bId: id }),
        replace: true,
        resetScroll: false,
        viewTransition: false,
      });
    },
    [navigate],
  );

  useEffect(() => {
    if (!isNavigating && bId !== selectedId) setSelectedId(selectedId);
  }, [isNavigating, bId, selectedId, setSelectedId]);

  return { selectedId, setSelectedId };
}
