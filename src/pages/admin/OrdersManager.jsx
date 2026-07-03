import { useEffect, useMemo, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { updateOrderById } from "../../api/ordersApi";
import { useOrdersQuery } from "../../hooks/useOrdersQuery";
import { formatOrderId } from "../../utils/entityId";
import "./OrdersManager.css";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const STATUS_OPTIONS = [
  "all",
  "pending",
  "processing",
  "completed",
  "cancelled",
];

const STATUS_LABELS = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

function normalizeStatus(status) {
  const rawStatus = String(status ?? "")
    .trim()
    .toLowerCase();

  if (rawStatus === "delivery") {
    return "completed";
  }

  if (rawStatus === "canceled") {
    return "cancelled";
  }

  if (Object.prototype.hasOwnProperty.call(STATUS_LABELS, rawStatus)) {
    return rawStatus;
  }

  return "pending";
}

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getOrderText(order) {
  const items = Array.isArray(order?.items) ? order.items : [];

  return [
    order?.id,
    formatOrderId(order?.id),
    order?.customerName,
    order?.customerEmail,
    order?.contactEmail,
    order?.customerPhone,
    order?.shippingAddress?.fullName,
    order?.shippingAddress?.address,
    normalizeStatus(order?.status),
    ...items.flatMap((item) => [
      item?.title,
      item?.shopName,
      item?.sku,
      item?.vendorEmail,
    ]),
  ]
    .map((value) =>
      String(value ?? "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean)
    .join(" ");
}

function getCustomerLabel(order) {
  const customerName = String(
    order?.customerName ?? order?.shippingAddress?.fullName ?? "",
  ).trim();
  const customerEmail = String(
    order?.customerEmail ?? order?.contactEmail ?? "",
  ).trim();
  const customerPhone = String(
    order?.customerPhone ?? order?.shippingAddress?.phone ?? "",
  ).trim();

  return customerName || customerEmail || customerPhone || "N/A";
}

function getStatusLabel(status) {
  return STATUS_LABELS[normalizeStatus(status)] ?? "Pending";
}

function getStatusTone(status) {
  return `admin-orders__pill--${normalizeStatus(status)}`;
}

function getTimestamp(value) {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6 6 18 18M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function upsertOrderInList(list, nextOrder) {
  const orders = Array.isArray(list) ? list : [];
  const normalizedId = String(nextOrder?.id ?? "").trim();

  if (!normalizedId) {
    return orders;
  }

  const existingIndex = orders.findIndex(
    (order) => String(order?.id ?? "").trim() === normalizedId,
  );

  if (existingIndex < 0) {
    return [nextOrder, ...orders];
  }

  return orders.map((order, index) =>
    index === existingIndex ? nextOrder : order,
  );
}

export default function OrdersManager() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading, isError, error } = useOrdersQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrderIntent, setSelectedOrderIntent] = useState("view");
  const [cancelReasonByOrder, setCancelReasonByOrder] = useState({});
  const [cancelReasonErrorByOrder, setCancelReasonErrorByOrder] = useState({});
  const [processingOrderId, setProcessingOrderId] = useState("");

  const sortedOrders = useMemo(() => {
    return [...orders].sort((left, right) => {
      return getTimestamp(right?.createdAt) - getTimestamp(left?.createdAt);
    });
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return sortedOrders.filter((order) => {
      const normalizedStatus = normalizeStatus(order?.status);

      if (statusFilter !== "all" && normalizedStatus !== statusFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return getOrderText(order).includes(keyword);
    });
  }, [searchTerm, sortedOrders, statusFilter]);

  const selectedOrder = useMemo(() => {
    return (
      filteredOrders.find(
        (order) => String(order?.id ?? "") === selectedOrderId,
      ) ?? null
    );
  }, [filteredOrders, selectedOrderId]);

  useEffect(() => {
    if (!selectedOrderId) {
      return;
    }

    const hasSelectedOrder = filteredOrders.some(
      (order) => String(order?.id ?? "") === selectedOrderId,
    );

    if (!hasSelectedOrder) {
      setSelectedOrderId("");
    }
  }, [filteredOrders, selectedOrderId]);

  const summary = useMemo(() => {
    return sortedOrders.reduce(
      (accumulator, order) => {
        const normalizedStatus = normalizeStatus(order?.status);

        accumulator.total += 1;
        if (normalizedStatus === "pending") accumulator.pending += 1;
        if (normalizedStatus === "processing") accumulator.processing += 1;
        if (normalizedStatus === "completed") accumulator.completed += 1;
        if (normalizedStatus === "cancelled") accumulator.cancelled += 1;

        return accumulator;
      },
      {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        cancelled: 0,
      },
    );
  }, [sortedOrders]);

  const selectedOrderStatus = normalizeStatus(selectedOrder?.status);
  const selectedOrderItems = Array.isArray(selectedOrder?.items)
    ? selectedOrder.items
    : [];
  const getCancelReasonValue = (order) => {
    const orderId = String(order?.id ?? "").trim();

    if (typeof cancelReasonByOrder[orderId] === "string") {
      return cancelReasonByOrder[orderId];
    }

    return String(order?.cancellation?.reason ?? "");
  };

  const selectedCancelReason = getCancelReasonValue(selectedOrder);
  const selectedCancelReasonError = Boolean(
    cancelReasonErrorByOrder[String(selectedOrder?.id ?? "")],
  );
  const canAdminCancelSelectedOrder =
    Boolean(selectedOrder?.id) && selectedOrderStatus === "processing";
  const isSelectedOrderBusy =
    processingOrderId &&
    String(processingOrderId) === String(selectedOrder?.id ?? "");

  const handleCancelReasonChange = (orderId, value) => {
    const normalizedOrderId = String(orderId ?? "").trim();

    if (!normalizedOrderId) {
      return;
    }

    setCancelReasonByOrder((previous) => ({
      ...previous,
      [normalizedOrderId]: value,
    }));
    setCancelReasonErrorByOrder((previous) => ({
      ...previous,
      [normalizedOrderId]: !String(value ?? "").trim(),
    }));
  };

  const handleSelectOrder = (orderId, intent = "view") => {
    setSelectedOrderId(String(orderId ?? ""));
    setSelectedOrderIntent(intent);
  };

  const handleCloseOrderModal = () => {
    setSelectedOrderId("");
    setSelectedOrderIntent("view");
  };

  useEffect(() => {
    if (!selectedOrder?.id || selectedOrderIntent !== "cancel") {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const cancelReasonField = document.getElementById(
        "admin-order-cancel-reason",
      );

      if (cancelReasonField) {
        cancelReasonField.focus();
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [selectedOrder?.id, selectedOrderIntent]);

  const handleCancelOrder = async (order) => {
    const orderId = String(order?.id ?? "").trim();
    const status = normalizeStatus(order?.status);

    if (!orderId || status !== "processing") {
      return;
    }

    const reason = getCancelReasonValue(order).trim();

    if (!reason) {
      setCancelReasonErrorByOrder((previous) => ({
        ...previous,
        [orderId]: true,
      }));
      return;
    }

    try {
      setProcessingOrderId(orderId);

      const updatedOrder = await updateOrderById({
        id: orderId,
        actor: "admin",
        updates: {
          status: "cancelled",
          cancellation: {
            by: "admin",
            reason,
            at: new Date().toISOString(),
          },
        },
      });

      setCancelReasonByOrder((previous) => ({
        ...previous,
        [orderId]: reason,
      }));
      setCancelReasonErrorByOrder((previous) => ({
        ...previous,
        [orderId]: false,
      }));

      queryClient.setQueryData(["orders"], (previous) =>
        upsertOrderInList(previous, updatedOrder),
      );
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (updateError) {
      window.alert(updateError?.message ?? "Khong the cap nhat don hang.");
    } finally {
      setProcessingOrderId("");
    }
  };

  return (
    <div className="admin-orders">
      <section className="admin-orders__summary">
        <article className="admin-orders__card">
          <p>Total orders</p>
          <strong>{summary.total}</strong>
        </article>
        <article className="admin-orders__card">
          <p>Pending</p>
          <strong>{summary.pending}</strong>
        </article>
        <article className="admin-orders__card">
          <p>Processing</p>
          <strong>{summary.processing}</strong>
        </article>
        <article className="admin-orders__card">
          <p>Cancelled</p>
          <strong>{summary.cancelled}</strong>
        </article>
      </section>

      <section className="admin-orders__toolbar">
        <div className="admin-orders__filters">
          <label className="admin-orders__field">
            <span>Search</span>
            <input
              type="search"
              placeholder="Order id, customer, phone, email..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <label className="admin-orders__field">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All" : getStatusLabel(option)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-orders__toolbar-meta">
          <span>{filteredOrders.length} orders shown</span>
        </div>
      </section>

      {isError ? (
        <section className="admin-orders__empty admin-orders__empty--error">
          <strong>Không thể tải danh sách đơn hàng.</strong>
          <p>{error?.message ?? "Vui lòng thử lại sau."}</p>
        </section>
      ) : isLoading ? (
        <section className="admin-orders__empty">
          <p>Đang tải đơn hàng...</p>
        </section>
      ) : sortedOrders.length === 0 ? (
        <section className="admin-orders__empty">
          <strong>Chưa có đơn hàng nào.</strong>
          <p>Danh sách đơn sẽ xuất hiện ở đây sau khi khách đặt hàng.</p>
        </section>
      ) : (
        <div className="admin-orders__layout admin-orders__layout--single">
          <section className="admin-orders__list">
            <div className="admin-orders__row admin-orders__row--head">
              <span>Order</span>
              <span>Customer</span>
              <span>Status</span>
              <span>Total</span>
              <span>Created</span>
              <span>Reason</span>
              <span>Action</span>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="admin-orders__empty admin-orders__empty--inline">
                <p>Không tìm thấy đơn hàng phù hợp bộ lọc.</p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const orderId = String(order?.id ?? "");
                const status = normalizeStatus(order?.status);
                const isActive = String(selectedOrderId ?? "") === orderId;
                const isBusy = String(processingOrderId ?? "") === orderId;
                const canCancelOrder = status === "processing";
                const orderCancelReason = getCancelReasonValue(order);
                const hasReasonError = Boolean(
                  cancelReasonErrorByOrder[orderId],
                );

                return (
                  <div
                    key={orderId}
                    className={`admin-orders__row admin-orders__row-button ${
                      isActive ? "is-active" : ""
                    }`}
                  >
                    <span title={orderId || "N/A"}>
                      {formatOrderId(orderId)}
                    </span>
                    <span>{getCustomerLabel(order)}</span>
                    <span>
                      <span
                        className={`admin-orders__pill ${getStatusTone(status)}`}
                      >
                        {getStatusLabel(status)}
                      </span>
                    </span>
                    <span>{currency.format(Number(order?.total ?? 0))}</span>
                    <span>{formatDate(order?.createdAt)}</span>
                    <span className="admin-orders__reason-cell">
                      <input
                        type="text"
                        className={`admin-orders__reason-input${hasReasonError ? " admin-orders__reason-input--error" : ""}`}
                        placeholder="Nhập lý do..."
                        value={orderCancelReason}
                        disabled={isBusy || !canCancelOrder}
                        aria-invalid={hasReasonError}
                        onChange={(event) => {
                          handleCancelReasonChange(orderId, event.target.value);
                        }}
                      />
                      {hasReasonError ? (
                        <span className="admin-orders__reason-error">
                          Vui lòng nhập lý do hủy đơn
                        </span>
                      ) : null}
                    </span>
                    <span className="admin-orders__action-cell">
                      <div className="admin-orders__action-buttons">
                        <button
                          type="button"
                          className="admin-orders__action-btn admin-orders__action-btn--muted admin-orders__action-btn--icon"
                          disabled={isBusy}
                          aria-label="View order details"
                          title="View"
                          onClick={() => handleSelectOrder(orderId, "view")}
                        >
                          <EyeIcon />
                        </button>
                        <button
                          type="button"
                          className="admin-orders__action-btn admin-orders__action-btn--danger admin-orders__action-btn--icon"
                          disabled={isBusy || !canCancelOrder}
                          aria-label="Cancel order"
                          title={
                            !canCancelOrder
                              ? "Chỉ order ở trạng thái Processing mới có thể Cancel"
                              : "Cancel"
                          }
                          onClick={() => handleCancelOrder(order)}
                        >
                          <XIcon />
                        </button>
                        {isBusy ? (
                          <span className="admin-action-spinner" />
                        ) : null}
                      </div>
                    </span>
                  </div>
                );
              })
            )}
          </section>

          {selectedOrder ? (
            <div
              className="admin-orders__modal-backdrop"
              onClick={handleCloseOrderModal}
            >
              <div
                className="admin-orders__detail admin-orders__modal-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-order-modal-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="admin-orders__detail-header">
                  <div>
                    <h2
                      id="admin-order-modal-title"
                      title={selectedOrder.id || "N/A"}
                    >
                      {formatOrderId(selectedOrder.id)}
                    </h2>
                    <span
                      className={`admin-orders__pill ${getStatusTone(selectedOrderStatus)}`}
                    >
                      {getStatusLabel(selectedOrderStatus)}
                    </span>
                  </div>
                  <div className="admin-orders__detail-header-actions">
                    <div className="admin-orders__detail-summary">
                      <strong>
                        {currency.format(Number(selectedOrder?.total ?? 0))}
                      </strong>
                      <span>{selectedOrderItems.length} items</span>
                    </div>
                    <button
                      type="button"
                      className="admin-orders__button admin-orders__button--secondary"
                      onClick={handleCloseOrderModal}
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="admin-orders__meta-grid">
                  <article className="admin-orders__meta-card">
                    <p>Customer</p>
                    <strong>{getCustomerLabel(selectedOrder)}</strong>
                  </article>
                  <article className="admin-orders__meta-card">
                    <p>Contact</p>
                    <strong>
                      {selectedOrder?.customerEmail ||
                        selectedOrder?.contactEmail ||
                        "N/A"}
                    </strong>
                    <span>{selectedOrder?.customerPhone || "N/A"}</span>
                  </article>
                  <article className="admin-orders__meta-card">
                    <p>Payment</p>
                    <strong>
                      {String(
                        selectedOrder?.paymentMethod ?? "cod",
                      ).toUpperCase()}
                    </strong>
                    <span>{formatDate(selectedOrder?.createdAt)}</span>
                  </article>
                  <article className="admin-orders__meta-card">
                    <p>Shipping</p>
                    <strong>
                      {selectedOrder?.shippingAddress?.address || "N/A"}
                    </strong>
                    <span>
                      {[
                        selectedOrder?.shippingAddress?.city,
                        selectedOrder?.shippingAddress?.state,
                        selectedOrder?.shippingAddress?.country,
                      ]
                        .filter(Boolean)
                        .join(", ") || "N/A"}
                    </span>
                  </article>
                </div>

                <section className="admin-orders__section">
                  <div className="admin-orders__section-header">
                    <h3>Order items</h3>
                    <span>{selectedOrderItems.length} lines</span>
                  </div>
                  <div className="admin-orders__items">
                    {selectedOrderItems.map((item, index) => {
                      const itemKey = `${selectedOrder.id}-${item?.productId ?? index}`;

                      return (
                        <article key={itemKey} className="admin-orders__item">
                          <div>
                            <strong>{item?.title || "Product"}</strong>
                            <p>
                              {item?.shopName || "Shop"}
                              {item?.sku ? ` · SKU ${item.sku}` : ""}
                            </p>
                          </div>
                          <div className="admin-orders__item-meta">
                            <span>
                              Qty:{" "}
                              <strong>{Number(item?.quantity ?? 0)}</strong>
                            </span>
                            <span>
                              Price:{" "}
                              <strong>
                                {currency.format(Number(item?.price ?? 0))}
                              </strong>
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className="admin-orders__section">
                  <div className="admin-orders__section-header">
                    <h3>Status history</h3>
                    <span>
                      {Array.isArray(selectedOrder?.statusHistory)
                        ? selectedOrder.statusHistory.length
                        : 0}{" "}
                      events
                    </span>
                  </div>
                  <div className="admin-orders__timeline">
                    {Array.isArray(selectedOrder?.statusHistory) &&
                    selectedOrder.statusHistory.length > 0 ? (
                      selectedOrder.statusHistory.map((entry, index) => (
                        <article
                          key={`${selectedOrder.id}-${index}`}
                          className="admin-orders__timeline-item"
                        >
                          <div>
                            <strong>
                              {getStatusLabel(entry?.fromStatus)} →{" "}
                              {getStatusLabel(entry?.toStatus)}
                            </strong>
                            <p>By {String(entry?.by ?? "system")}</p>
                          </div>
                          <span>{formatDate(entry?.at)}</span>
                        </article>
                      ))
                    ) : (
                      <p className="admin-orders__empty admin-orders__empty--inline">
                        Chưa có lịch sử trạng thái.
                      </p>
                    )}
                  </div>
                </section>

                <section className="admin-orders__section admin-orders__cancel-section">
                  <div className="admin-orders__section-header">
                    <h3>Admin action</h3>
                    <span>
                      {canAdminCancelSelectedOrder
                        ? "Can cancel only while Processing"
                        : "Cancel is unavailable for this status"}
                    </span>
                  </div>

                  {canAdminCancelSelectedOrder ? (
                    <>
                      <label className="admin-orders__field">
                        <span>Cancellation reason</span>
                        <textarea
                          id="admin-order-cancel-reason"
                          className={`admin-orders__textarea${selectedCancelReasonError ? " admin-orders__textarea--error" : ""}`}
                          value={selectedCancelReason}
                          aria-invalid={selectedCancelReasonError}
                          onChange={(event) => {
                            handleCancelReasonChange(
                              selectedOrder.id,
                              event.target.value,
                            );
                          }}
                          placeholder="Nhập lý do hủy đơn"
                        />
                        {selectedCancelReasonError ? (
                          <span className="admin-orders__reason-error">
                            Vui lòng nhập lý do hủy đơn
                          </span>
                        ) : null}
                      </label>

                      <div className="admin-orders__action-row">
                        <p>
                          Admin chỉ được hủy đơn khi đơn đang{" "}
                          <strong>Processing</strong>.
                        </p>
                        <button
                          type="button"
                          className="admin-orders__button admin-orders__button--danger"
                          disabled={isSelectedOrderBusy}
                          onClick={() => handleCancelOrder(selectedOrder)}
                        >
                          {isSelectedOrderBusy
                            ? "Cancelling..."
                            : "Cancel order"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="admin-orders__hint">
                      Đơn này không đủ điều kiện để admin hủy. Chỉ các đơn ở
                      trạng thái Processing mới có thể cancel.
                    </p>
                  )}
                </section>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
