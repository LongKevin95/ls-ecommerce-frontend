import { useMemo } from "react";
import { Link } from "react-router-dom";

import CleanProductCard from "../components/CleanProductCard";
import { useProductsQuery } from "../hooks/useProductsQuery";
import { useWishlist } from "../hooks/useWishlist";

export default function WishlistPage() {
  const { data: products = [] } = useProductsQuery();
  const { items } = useWishlist();

  const savedProducts = useMemo(
    () =>
      items
        .map((item) => products.find((product) => product.id === item.productId))
        .filter(Boolean),
    [items, products],
  );

  return (
    <section className="clean-container clean-page">
      <div className="clean-page__header">
        <h1>Wishlist</h1>
        <p className="clean-page__lead">Wishlist chỉ lưu `productId` thay vì snapshot nguyên sản phẩm.</p>
      </div>

      {savedProducts.length === 0 ? (
        <div className="clean-empty">
          <p>Wishlist đang trống.</p>
          <Link to="/" className="clean-link-btn">
            Explore products
          </Link>
        </div>
      ) : (
        <div className="clean-grid">
          {savedProducts.map((product) => (
            <CleanProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
