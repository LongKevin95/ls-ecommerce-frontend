import { useMemo } from "react";

import { formatCurrency, formatDateTime } from "../../utils/formatters";
import { useAuth } from "../hooks/useAuth";
import { useMyOrdersQuery } from "../hooks/useMyOrdersQuery";
import { useProductsQuery } from "../hooks/useProductsQuery";

export default function MyOrdersPage() {
  const { user } = useAuth();
  const { data: orders = [] } = useMyOrdersQuery(user?.id);
  const { data: products = [] } = useProductsQuery();

  const enrichedOrders = useMemo(
    () =>
      orders.map((order) => ({
        ...order,
        items: order.items.map((item) => ({
          ...item,
          product: products.find((product) => product.id === item.productId) ?? null,
        })),
      })),
    [orders, products],
  );

  return (
    <section className="clean-container clean-page">
      <div className="clean-page__header">
        <h1>My Orders</h1>
        <p className="clean-page__lead">Danh sách đơn hàng customer theo structure tối giản, dễ đổi sang API thật.</p>
      </div>

      {enrichedOrders.length === 0 ? (
        <div className="clean-empty">Bạn chưa có đơn hàng nào.</div>
      ) : (
        <ul className="clean-list">
          {enrichedOrders.map((order) => (
            <li key={order.id} className="clean-list-item">
              <div className="clean-cart-row">
                <div>
                  <strong>{order.id}</strong>
                  <p className="clean-muted">{formatDateTime(order.createdAt)}</p>
                </div>
                <span className="clean-badge">{order.status}</span>
              </div>
              <ul className="clean-list">
                {order.items.map((item) => (
                  <li key={`${order.id}-${item.productId}-${item.color}-${item.size}`}>
                    <div className="clean-cart-row">
                      <span>{item.product?.title ?? item.productId} x {item.quantity}</span>
                      <strong>{formatCurrency((Number(item.product?.price ?? 0) || 0) * item.quantity)}</strong>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="clean-cart-row">
                <span>Total</span>
                <strong>{formatCurrency(order.total)}</strong>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
