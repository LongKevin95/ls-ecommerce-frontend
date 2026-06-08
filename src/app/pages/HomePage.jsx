import { useMemo } from "react";

import CleanProductCard from "../components/CleanProductCard";
import { useProductsQuery } from "../hooks/useProductsQuery";

export default function HomePage() {
  const { data: products = [], isLoading } = useProductsQuery();

  const activeProducts = useMemo(
    () => products.filter((product) => product.status === "active"),
    [products],
  );

  return (
    <section className="clean-container clean-page">
      <div className="clean-page__header">
        <p className="clean-breadcrumb">Home / Clean baseline</p>
        <h1>Frontend được tối ưu để dễ nối backend sau này</h1>
        <p className="clean-page__lead">
          Cart và wishlist chỉ lưu dữ liệu tối thiểu. Checkout chỉ gửi payload tối thiểu.
        </p>
      </div>

      {isLoading ? <div className="clean-empty">Loading products...</div> : null}

      <div className="clean-grid">
        {activeProducts.map((product) => (
          <CleanProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
