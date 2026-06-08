import { useQuery } from "@tanstack/react-query";

import { getVendorOrders } from "../../services/orderService";

export function useVendorOrdersQuery(vendorId) {
  return useQuery({
    queryKey: ["clean-orders", "vendor", vendorId],
    queryFn: () => getVendorOrders(vendorId),
    enabled: Boolean(vendorId),
    staleTime: 0,
  });
}
