import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PRODUCT_STATUS } from "../../constants/productStatus";
import { formatCurrency } from "../../utils/formatters";
import { notifyError, notifySuccess } from "../../utils/notify";
import { updateProductById } from "../../services/productService";
import { useAdminProductsQuery } from "../hooks/useAdminProductsQuery";
import { useUsersQuery } from "../hooks/useUsersQuery";
import "../styles/clean-management.css";

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const { data: products = [] } = useAdminProductsQuery();
  const { data: users = [] } = useUsersQuery();
  const [statusFilter, setStatusFilter] = useState("all");

  const vendorMap = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  const visibleProducts = useMemo(
    () =>
      products.filter((product) =>
        statusFilter === "all" ? true : product.status === statusFilter,
      ),
    [products, statusFilter],
  );

  const moderateMutation = useMutation({
    mutationFn: ({ productId, nextStatus }) =>
      updateProductById(productId, { status: nextStatus }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clean-products"] });
      notifySuccess("Đã cập nhật trạng thái sản phẩm.");
    },
    onError: (error) =>
      notifyError(error?.message || "Không thể duyệt sản phẩm."),
  });

  return (
    <section className="clean-container clean-page">
      <div className="clean-page__header">
        <h1>Admin Products</h1>
        <p className="clean-page__lead">
          Admin duyệt sản phẩm qua trạng thái chuẩn hóa thay vì sửa data trực
          tiếp trong component.
        </p>
      </div>

      <div className="clean-panel clean-stack">
        <div className="clean-toolbar">
          <h2>Products moderation</h2>
          <div className="clean-toolbar__group">
            <label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All</option>
                <option value={PRODUCT_STATUS.DRAFT}>Draft</option>
                <option value={PRODUCT_STATUS.PENDING}>Pending</option>
                <option value={PRODUCT_STATUS.ACTIVE}>Active</option>
                <option value={PRODUCT_STATUS.INACTIVE}>Inactive</option>
                <option value={PRODUCT_STATUS.REJECTED}>Rejected</option>
              </select>
            </label>
          </div>
        </div>

        <table className="clean-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Vendor</th>
              <th>Status</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleProducts.map((product) => {
              const vendor = vendorMap.get(product.vendorId);

              return (
                <tr key={product.id}>
                  <td>
                    <div className="clean-stack">
                      <strong>{product.title}</strong>
                      <small className="clean-muted">{product.category}</small>
                    </div>
                  </td>
                  <td>{vendor?.name ?? product.vendorId}</td>
                  <td>
                    <span className="clean-badge">{product.status}</span>
                  </td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>
                    <div className="clean-actions">
                      {product.status !== PRODUCT_STATUS.ACTIVE ? (
                        <button
                          type="button"
                          className="clean-button clean-button--ghost"
                          onClick={() =>
                            moderateMutation.mutate({
                              productId: product.id,
                              nextStatus: PRODUCT_STATUS.ACTIVE,
                            })
                          }
                        >
                          Approve
                        </button>
                      ) : null}
                      {product.status !== PRODUCT_STATUS.REJECTED ? (
                        <button
                          type="button"
                          className="clean-button clean-button--ghost"
                          onClick={() =>
                            moderateMutation.mutate({
                              productId: product.id,
                              nextStatus: PRODUCT_STATUS.REJECTED,
                            })
                          }
                        >
                          Reject
                        </button>
                      ) : null}
                      {product.status !== PRODUCT_STATUS.INACTIVE ? (
                        <button
                          type="button"
                          className="clean-button clean-button--ghost"
                          onClick={() =>
                            moderateMutation.mutate({
                              productId: product.id,
                              nextStatus: PRODUCT_STATUS.INACTIVE,
                            })
                          }
                        >
                          Deactivate
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
