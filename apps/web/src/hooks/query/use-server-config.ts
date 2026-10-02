import { useQuery } from "@tanstack/react-query";
import * as v from "valibot";

import { ConfigResponseSchema } from "@pgko-dev/schema";

import { apiClient } from "@/lib/api.ts";
import { QUERY_KEYS } from "@/lib/query-keys.ts";

export const useServerConfig = () => {
  return useQuery({
    queryKey: QUERY_KEYS.serverConfig,
    staleTime: 1000 * 60 * 60, // 1 hour
    queryFn: async () => {
      const response = await apiClient.get("/api/config");
      return v.parse(ConfigResponseSchema, response.data);
    },
  });
};
