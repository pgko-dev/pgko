import { describe, expect, mock, test } from "bun:test";

import { QueryClient, QueryObserver } from "@tanstack/react-query";

describe("route query caching", () => {
  test("returns existing invalidated data while the mounted query still revalidates", async () => {
    const queryClient = new QueryClient();
    const queryKey = ["bundle-private", "cached"];
    const queryFn = mock(async () => ({ title: "refreshed" }));
    const options = { queryKey, queryFn, staleTime: 120_000 };
    const cached = { title: "cached" };
    queryClient.setQueryData(queryKey, cached, { updatedAt: 1 });
    await queryClient.invalidateQueries({ queryKey, refetchType: "none" });

    const routeData = await queryClient.query({ ...options, staleTime: "static" });
    expect(routeData).toEqual(cached);
    expect(queryFn).not.toHaveBeenCalled();

    const observer = new QueryObserver(queryClient, options);
    const unsubscribe = observer.subscribe(() => {});
    try {
      await queryClient.query(options);
      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(observer.getCurrentResult().data).toEqual({ title: "refreshed" });
      expect(observer.options.staleTime).toBe(120_000);
    } finally {
      unsubscribe();
      queryClient.clear();
    }
  });

  test("fetches missing route data and propagates failures", async () => {
    const queryClient = new QueryClient();
    const queryFn = mock(async () => ({ title: "fetched" }));

    try {
      await expect(
        queryClient.query({ queryKey: ["bundle", "new"], queryFn, staleTime: "static" }),
      ).resolves.toEqual({ title: "fetched" });
      expect(queryFn).toHaveBeenCalledTimes(1);

      const error = new Error("bundle not found");
      await expect(
        queryClient.query({
          queryKey: ["bundle", "missing"],
          queryFn: () => Promise.reject(error),
          staleTime: "static",
        }),
      ).rejects.toBe(error);
    } finally {
      queryClient.clear();
    }
  });
});
