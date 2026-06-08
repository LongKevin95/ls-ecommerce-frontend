import { useQuery } from "@tanstack/react-query";

import { getProducts } from "../../services/productService";

export function useProductsQuery() {
  return useQuery({
    queryKey: ["clean-products"],
    queryFn: getProducts,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}
