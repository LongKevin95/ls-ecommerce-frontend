import { Link } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { useVendorOrdersQuery } from "../hooks/useVendorOrdersQuery";
import { useVendorProductsQuery } from "../hooks/useVendorProductsQuery";
import "../styles/clean-management.css";

export default function VendorPage() {
  const { user } = useAuth();
  const { data: products = [] } = useVendorProductsQuery(user?.id);
  const { data: orders = [] } = useVendorOrdersQuery(user?.id);

  const pendingProducts = products.filter(
    (product) => product.status === "pending",
  ).length;
  const draftProducts = products.filter(
    (product) => product.status === "draft",
  ).length;
  const processingOrders = orders.filter(
    (order) => order.status === "processing",
  ).length;

  return (
    <section className="clean-container clean-page">
      <div className="clean-page__header">
        <h1>Vendor Dashboard</h1>
        <p className="clean-page__lead">
          Dashboard sạch cho vendor, tập trung vào products và orders để sau này
          nối API backend thật.
        </p>
      </div>

      <div className="clean-stat-grid">
        <article className="clean-stat-card">
          <small className="clean-muted">Total products</small>
          <strong>{products.length}</strong>
        </article>
        <article className="clean-stat-card">
          <small className="clean-muted">Draft products</small>
          <strong>{draftProducts}</strong>
        </article>
        <article className="clean-stat-card">
          <small className="clean-muted">Pending products</small>
          <strong>{pendingProducts}</strong>
        </article>
        <article className="clean-stat-card">
          <small className="clean-muted">Orders processing</small>
          <strong>{processingOrders}</strong>
        </article>
      </div>

      <div className="clean-management-grid">
        <div className="clean-panel clean-stack">
          <h2>Manage products</h2>
          <p className="clean-page__lead">
            Tạo, submit, ẩn hoặc xóa sản phẩm của vendor qua service layer.
          </p>
          <Link to="/vendor/products" className="clean-link-btn">
            Open Vendor Products
          </Link>
        </div>

        <div className="clean-panel clean-stack">
          <h2>Manage orders</h2>
          <p className="clean-page__lead">
            Xem các order có item thuộc vendor hiện tại và đổi trạng thái.
          </p>
          <Link to="/vendor/orders" className="clean-link-btn">
            Open Vendor Orders
          </Link>
        </div>
      </div>
    </section>
  );
}
