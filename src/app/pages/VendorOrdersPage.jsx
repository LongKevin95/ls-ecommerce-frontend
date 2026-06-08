import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ORDER_STATUS } from "../../constants/orderStatus";
import { formatDateTime } from "../../utils/formatters";
import { notifyError, notifySuccess } from "../../utils/notify";
import { updateOrderStatus } from "../../services/orderService";
import { useAuth } from "../hooks/useAuth";
import { useVendorOrdersQuery } from "../hooks/useVendorOrdersQuery";
import "../styles/clean-management.css";

export default function VendorOrdersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: orders = [] } = useVendorOrdersQuery(user?.id);

  const statusMutation = useMutation({
    mutationFn: ({ orderId, nextStatus }) =>
      updateOrderStatus(orderId, nextStatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clean-orders"] });
      notifySuccess("Đã cập nhật trạng thái đơn hàng.");
    },
    onError: (error) =>
      notifyError(error?.message || "Không thể cập nhật đơn hàng."),
  });

  return (
    <section className="clean-container clean-page">
      <div className="clean-page__header">
        <h1>Vendor Orders</h1>
        <p className="clean-page__lead">
          Vendor chỉ nhìn các order có item thuộc shop của mình.
        </p>
      </div>

      <div className="clean-panel clean-stack">
        <table className="clean-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Vendor items</th>
              <th>Total (vendor view)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const vendorTotal = order.vendorItems.reduce(
                (sum, item) => sum + item.quantity,
                0,
              );

              return (
                <tr key={order.id}>
                  <td>
                    <div className="clean-stack">
                      <strong>{order.id}</strong>
                      <small className="clean-muted">
                        {formatDateTime(order.createdAt)}
                      </small>
                    </div>
                  </td>
                  <td>
                    <div className="clean-stack">
                      <strong>{order.shippingAddress.fullName}</strong>
                      <small className="clean-muted">
                        {order.shippingAddress.phone || "N/A"}
                      </small>
                    </div>
                  </td>
                  <td>
                    <div className="clean-stack">
                      {order.vendorItems.map((item) => (
                        <small
                          key={`${order.id}-${item.productId}`}
                          className="clean-code"
                        >
                          {item.productId} x {item.quantity}
                        </small>
                      ))}
                    </div>
                  </td>
                  <td>{vendorTotal} items</td>
                  <td>
                    <span className="clean-badge">{order.status}</span>
                  </td>
                  <td>
                    <div className="clean-actions">
                      {order.status !== ORDER_STATUS.PROCESSING ? (
                        <button
                          type="button"
                          className="clean-button clean-button--ghost"
                          onClick={() =>
                            statusMutation.mutate({
                              orderId: order.id,
                              nextStatus: ORDER_STATUS.PROCESSING,
                            })
                          }
                        >
                          Processing
                        </button>
                      ) : null}
                      {order.status !== ORDER_STATUS.COMPLETED ? (
                        <button
                          type="button"
                          className="clean-button clean-button--ghost"
                          onClick={() =>
                            statusMutation.mutate({
                              orderId: order.id,
                              nextStatus: ORDER_STATUS.COMPLETED,
                            })
                          }
                        >
                          Complete
                        </button>
                      ) : null}
                      {order.status !== ORDER_STATUS.CANCELLED ? (
                        <button
                          type="button"
                          className="clean-button clean-button--ghost"
                          onClick={() =>
                            statusMutation.mutate({
                              orderId: order.id,
                              nextStatus: ORDER_STATUS.CANCELLED,
                            })
                          }
                        >
                          Cancel
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
