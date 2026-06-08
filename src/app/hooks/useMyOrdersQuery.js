import { useQuery } from "@tanstack/react-query";

import { getOrdersByCustomerId } from "../../services/orderService";

export function useMyOrdersQuery(customerId) {
  return useQuery({
    queryKey: ["clean-orders", customerId],
    queryFn: () => getOrdersByCustomerId(customerId),
    enabled: Boolean(customerId),
    staleTime: 0,
  });
}
