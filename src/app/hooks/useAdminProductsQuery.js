import { useQuery } from "@tanstack/react-query";

import { getAdminProducts } from "../../services/productService";

export function useAdminProductsQuery() {
  return useQuery({
    queryKey: ["clean-products", "admin"],
    queryFn: getAdminProducts,
    staleTime: 1000 * 60 * 5,
  });
}
