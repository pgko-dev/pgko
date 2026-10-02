import { queryOptions, useQuery } from "@tanstack/react-query";
import * as v from "valibot";

import { GetUserByJointIDResponseSchema } from "@pgko-dev/schema";

import { apiClient } from "@/lib/api.ts";
import { QUERY_KEYS } from "@/lib/query-keys.ts";

export const userProfileQueryOptions = (jointID?: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.userProfile(jointID),
    staleTime: 1000 * 60 * 30, // 30 minutes
    queryFn: async () => {
      const response = await apiClient.get(`/api/user/${jointID}`);
      return v.parse(GetUserByJointIDResponseSchema, response.data);
    },
    enabled: !!jointID,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) return false;
      return failureCount < 3;
    },
  });

export const useUserProfile = (jointID?: string) => {
  return useQuery(userProfileQueryOptions(jointID));
};
