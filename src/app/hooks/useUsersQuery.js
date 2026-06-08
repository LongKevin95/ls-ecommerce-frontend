import { useQuery } from "@tanstack/react-query";

import { getUsers } from "../../services/userService";

export function useUsersQuery() {
  return useQuery({
    queryKey: ["clean-users"],
    queryFn: getUsers,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}
