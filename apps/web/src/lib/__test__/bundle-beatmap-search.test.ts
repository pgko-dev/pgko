import { describe, expect, test } from "bun:test";

import { resolveBundleBeatmapId, validateBundleBeatmapSearch } from "../bundle-beatmap-search";

const songs = [{ id: "first-chart" }, { id: "second-chart" }];

describe("bundle beatmap URL state", () => {
  test("accepts a beatmap ID and distinguishes a closed preview from a default selection", () => {
    expect(validateBundleBeatmapSearch({ bId: "second-chart", q: "list search" })).toEqual({
      bId: "second-chart",
    });
    expect(resolveBundleBeatmapId(songs, "second-chart")).toBe("second-chart");
    expect(resolveBundleBeatmapId(songs, validateBundleBeatmapSearch({}).bId)).toBe("first-chart");
    expect(
      resolveBundleBeatmapId(songs, validateBundleBeatmapSearch({ bId: null }).bId),
    ).toBeNull();
  });

  test.each(["", 123, false, ["first-chart"], { id: "first-chart" }].map((bId) => ({ bId })))(
    "malformed selection %j falls back to the first chart",
    ({ bId }) => {
      const search = validateBundleBeatmapSearch({ bId });
      expect(search.bId).toBeUndefined();
      expect(resolveBundleBeatmapId(songs, search.bId)).toBe("first-chart");
    },
  );

  test("stale IDs fall back within the current bundle, including empty revisions", () => {
    expect(resolveBundleBeatmapId(songs, "removed-chart")).toBe("first-chart");
    expect(resolveBundleBeatmapId([], "second-chart")).toBeNull();
  });
});
