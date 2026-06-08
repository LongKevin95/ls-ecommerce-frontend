import { useQuery } from "@tanstack/react-query";

import { getAllOrders } from "../../services/orderService";

export function useAllOrdersQuery() {
  return useQuery({
    queryKey: ["clean-orders", "all"],
    queryFn: getAllOrders,
    staleTime: 0,
  });
}
