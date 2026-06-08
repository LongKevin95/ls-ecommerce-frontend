import { Link } from "react-router-dom";

import { useAllOrdersQuery } from "../hooks/useAllOrdersQuery";
import { useAdminProductsQuery } from "../hooks/useAdminProductsQuery";
import "../styles/clean-management.css";

export default function AdminPage() {
  const { data: products = [] } = useAdminProductsQuery();
  const { data: orders = [] } = useAllOrdersQuery();

  const pendingProducts = products.filter(
    (product) => product.status === "pending",
  ).length;
  const processingOrders = orders.filter(
    (order) => order.status === "processing",
  ).length;
  const completedOrders = orders.filter(
    (order) => order.status === "completed",
  ).length;

  return (
    <section className="clean-container clean-page">
      <div className="clean-page__header">
        <h1>Admin Dashboard</h1>
        <p className="clean-page__lead">
          Admin kiểm soát products và orders qua route riêng, tránh dồn business
          logic vào component UI.
        </p>
      </div>

      <div className="clean-stat-grid">
        <article className="clean-stat-card">
          <small className="clean-muted">Total products</small>
          <strong>{products.length}</strong>
        </article>
        <article className="clean-stat-card">
          <small className="clean-muted">Pending products</small>
          <strong>{pendingProducts}</strong>
        </article>
        <article className="clean-stat-card">
          <small className="clean-muted">Orders processing</small>
          <strong>{processingOrders}</strong>
        </article>
        <article className="clean-stat-card">
          <small className="clean-muted">Orders completed</small>
          <strong>{completedOrders}</strong>
        </article>
      </div>

      <div className="clean-management-grid">
        <div className="clean-panel clean-stack">
          <h2>Products moderation</h2>
          <p className="clean-page__lead">
            Duyệt, từ chối hoặc deactivate sản phẩm ở một tầng quản trị riêng.
          </p>
          <Link to="/admin/products" className="clean-link-btn">
            Open Admin Products
          </Link>
        </div>

        <div className="clean-panel clean-stack">
          <h2>Orders management</h2>
          <p className="clean-page__lead">
            Theo dõi toàn bộ vòng đời đơn hàng và cập nhật trạng thái tập trung.
          </p>
          <Link to="/admin/orders" className="clean-link-btn">
            Open Admin Orders
          </Link>
        </div>
      </div>
    </section>
  );
}
