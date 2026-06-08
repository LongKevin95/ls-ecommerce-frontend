import { useQuery } from "@tanstack/react-query";

import { getProductsByVendorId } from "../../services/productService";

export function useVendorProductsQuery(vendorId) {
  return useQuery({
    queryKey: ["clean-products", "vendor", vendorId],
    queryFn: () => getProductsByVendorId(vendorId),
    enabled: Boolean(vendorId),
    staleTime: 1000 * 60 * 5,
  });
}
