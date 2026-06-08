import { Link } from "react-router-dom";

import { formatCurrency } from "../../utils/formatters";
import { notifySuccess } from "../../utils/notify";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";

export default function CleanProductCard({ product }) {
  const { addToCart } = useCart();
  const { hasInWishlist, toggleWishlist } = useWishlist();
  const isFavorite = hasInWishlist(product.id);

  const handleAddToCart = () => {
    addToCart(product.id, 1, { color: "Default", size: "Default" });
    notifySuccess("Đã thêm sản phẩm vào giỏ hàng.");
  };

  const handleToggleWishlist = () => {
    const added = toggleWishlist(product.id);
    notifySuccess(added ? "Đã thêm vào wishlist." : "Đã xóa khỏi wishlist.");
  };

  return (
    <article className="clean-card">
      <img src={product.thumbnail} alt={product.title} className="clean-card__media" />
      <div className="clean-card__body">
        <p className="clean-badge">{product.category}</p>
        <h3>{product.title}</h3>
        <p className="clean-muted">{product.description}</p>
        <div className="clean-card__meta">
          <strong>{formatCurrency(product.price)}</strong>
          <span>Stock: {product.stock}</span>
        </div>
        <div className="clean-card__actions">
          <button type="button" className="clean-button" onClick={handleAddToCart}>
            Add to cart
          </button>
          <button type="button" className="clean-button clean-button--ghost" onClick={handleToggleWishlist}>
            {isFavorite ? "Unsave" : "Wishlist"}
          </button>
          <Link to={`/product/${product.id}`} className="clean-link-btn">
            Detail
          </Link>
        </div>
      </div>
    </article>
  );
}
