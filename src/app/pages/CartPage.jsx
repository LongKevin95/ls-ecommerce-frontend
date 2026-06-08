import { useMemo } from "react";
import { Link } from "react-router-dom";

import { formatCurrency } from "../../utils/formatters";
import { useCart } from "../hooks/useCart";
import { useProductsQuery } from "../hooks/useProductsQuery";

export default function CartPage() {
  const { data: products = [] } = useProductsQuery();
  const { items, buildCartItemKey, updateQuantity, removeFromCart } = useCart();

  const enrichedItems = useMemo(
    () =>
      items.map((item) => {
        const product = products.find((productItem) => productItem.id === item.productId);
        return {
          ...item,
          key: buildCartItemKey(item),
          product,
          subtotal: (Number(product?.price ?? 0) || 0) * item.quantity,
        };
      }),
    [buildCartItemKey, items, products],
  );

  const total = enrichedItems.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <section className="clean-container clean-page">
      <div className="clean-page__header">
        <h1>Cart</h1>
        <p className="clean-page__lead">Cart chỉ lưu `productId`, `quantity`, `color`, `size`.</p>
      </div>

      {enrichedItems.length === 0 ? (
        <div className="clean-empty">
          <p>Giỏ hàng đang trống.</p>
          <Link to="/" className="clean-link-btn">
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="clean-checkout-layout">
          <div className="clean-panel">
            <ul className="clean-list">
              {enrichedItems.map((item) => (
                <li key={item.key} className="clean-list-item">
                  <div className="clean-cart-row">
                    <div>
                      <strong>{item.product?.title ?? item.productId}</strong>
                      <p className="clean-muted">{item.color} / {item.size}</p>
                    </div>
                    <strong>{formatCurrency(item.subtotal)}</strong>
                  </div>
                  <div className="clean-flex">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) => updateQuantity(item.key, Number(event.target.value))}
                      style={{ width: 88 }}
                    />
                    <button type="button" className="clean-button clean-button--ghost" onClick={() => removeFromCart(item.key)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <aside className="clean-summary">
            <h2>Summary</h2>
            <div className="clean-cart-row">
              <span>Total</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <Link to="/checkout" className="clean-link-btn">
              Go to checkout
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}
