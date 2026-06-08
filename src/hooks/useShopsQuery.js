import { useQuery } from "@tanstack/react-query";

import { getShops } from "../api/shopsApi";

export function useShopsQuery() {
  return useQuery({
    queryKey: ["shops"],
    queryFn: getShops,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
