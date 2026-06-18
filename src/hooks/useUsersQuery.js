import { useQuery } from "@tanstack/react-query";

import { getUsers, USERS_QUERY_SCOPE } from "../api/usersApi";

const USERS_STALE_TIME = 1000 * 60 * 10;
const USERS_GC_TIME = 1000 * 60 * 30;

export function useUsersQuery(options = {}) {
  const { scope = USERS_QUERY_SCOPE.PUBLIC, ...queryOptions } = options;

  return useQuery({
    queryKey: ["users", scope],
    queryFn: () => getUsers(scope),
    staleTime: USERS_STALE_TIME,
    gcTime: USERS_GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...queryOptions,
  });
}
