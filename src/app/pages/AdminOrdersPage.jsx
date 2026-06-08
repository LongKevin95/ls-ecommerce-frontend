import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ORDER_STATUS } from "../../constants/orderStatus";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import { notifyError, notifySuccess } from "../../utils/notify";
import { updateOrderStatus } from "../../services/orderService";
import { useAllOrdersQuery } from "../hooks/useAllOrdersQuery";
import { useUsersQuery } from "../hooks/useUsersQuery";
import "../styles/clean-management.css";

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const { data: orders = [] } = useAllOrdersQuery();
  const { data: users = [] } = useUsersQuery();
  const [statusFilter, setStatusFilter] = useState("all");

  const customerMap = useMemo(
    () => new Map(users.map((item) => [item.id, item])),
    [users],
  );

  const visibleOrders = useMemo(
    () =>
      orders.filter((order) =>
        statusFilter === "all" ? true : order.status === statusFilter,
      ),
    [orders, statusFilter],
  );

  const statusMutation = useMutation({
    mutationFn: ({ orderId, nextStatus }) => updateOrderStatus(orderId, nextStatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clean-orders"] });
      notifySuccess("Đã cập nhật trạng thái đơn hàng.");
    },
    onError: (error) => notifyError(error?.message || "Không thể cập nhật đơn hàng."),
  });

  return (
    <section className="clean-container clean-page">
      <div className="clean-page__header">
        <h1>Admin Orders</h1>
        <p className="clean-page__lead">Admin xem toàn bộ đơn hàng và điều phối trạng thái ở một tầng duy nhất.</p>
      </div>

      <div className="clean-panel clean-stack">
        <div className="clean-toolbar">
          <h2>Orders</h2>
          <div className="clean-toolbar__group">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All</option>
              <option value={ORDER_STATUS.PENDING}>Pending</option>
              <option value={ORDER_STATUS.PROCESSING}>Processing</option>
              <option value={ORDER_STATUS.COMPLETED}>Completed</option>
              <option value={ORDER_STATUS.CANCELLED}>Cancelled</option>
            </select>
          </div>
        </div>

        <table className="clean-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.map((order) => {
              const customer = customerMap.get(order.customerId);

              return (
                <tr key={order.id}>
                  <td>
                    <div className="clean-stack">
                      <strong>{order.id}</strong>
                      <small className="clean-muted">{formatDateTime(order.createdAt)}</small>
                    </div>
                  </td>
                  <td>
                    <div className="clean-stack">
                      <strong>{customer?.name ?? order.shippingAddress.fullName}</strong>
                      <small className="clean-muted">{customer?.email ?? "N/A"}</small>
                    </div>
                  </td>
                  <td>{order.paymentMethod}</td>
                  <td>{formatCurrency(order.total)}</td>
                  <td><span className="clean-badge">{order.status}</span></td>
                  <td>
                    <div className="clean-actions">
                      <button type="button" className="clean-button clean-button--ghost" onClick={() => statusMutation.mutate({ orderId: order.id, nextStatus: ORDER_STATUS.PENDING })}>
                        Pending
                      </button>
                      <button type="button" className="clean-button clean-button--ghost" onClick={() => statusMutation.mutate({ orderId: order.id, nextStatus: ORDER_STATUS.PROCESSING })}>
                        Processing
                      </button>
                      <button type="button" className="clean-button clean-button--ghost" onClick={() => statusMutation.mutate({ orderId: order.id, nextStatus: ORDER_STATUS.COMPLETED })}>
                        Complete
                      </button>
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
