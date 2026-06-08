import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { updateOrderById } from "../../api/ordersApi";
import { useAdminProductsQuery } from "../../hooks/useAdminProductsQuery";
import { useAuth } from "../../hooks/useAuth";
import { useOrdersQuery } from "../../hooks/useOrdersQuery";
import {
  extractVendorOrderItems,
  getItemProductId,
  isOrderOfVendor,
  isProductOwnedByVendor,
  normalizeOrderStatus,
  resolveAddressSummary,
  resolveFullAddress,
  resolveOrderCustomer,
  resolveOrderDate,
  resolvePaymentMethodLabel,
  resolveStatusHistory,
  resolveUpdatedAt,
  resolveVendorSubtotal,
} from "./vendorDataUtils";
import "./VendorDashboard.css";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const ITEMS_PER_PAGE = 10;

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-GB");
}

function formatDateTime(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString("en-GB");
}

function formatItemVariant(item) {
  const explicitVariantLabel = String(item?.variantLabel ?? "").trim();

  if (explicitVariantLabel) {
    return explicitVariantLabel;
  }

  const parts = [item?.size, item?.color].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "Default";
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

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M5 12.5 9.2 16.7 19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
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

function getOrderSearchableText(order) {
  return [
    order?.id,
    order?.customer?.name,
    order?.customer?.email,
    order?.customer?.phone,
  ]
    .join(" ")
    .toLowerCase();
}

function getOrderDateInputValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export default function VendorOrders() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: products = [], isLoading: isProductsLoading } =
    useAdminProductsQuery();
  const { data: orders = [], isLoading: isOrdersLoading } = useOrdersQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [cancelTargetId, setCancelTargetId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [processingOrderId, setProcessingOrderId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const vendorEmail = String(user?.email ?? "")
    .trim()
    .toLowerCase();
  const vendorId = String(user?.id ?? "").trim();

  const vendorProducts = useMemo(() => {
    return products.filter((product) =>
      isProductOwnedByVendor(product, vendorEmail, vendorId),
    );
  }, [products, vendorEmail, vendorId]);

  const vendorProductIds = useMemo(
    () =>
      new Set(
        vendorProducts.map((product) => String(product?.id ?? "").trim()),
      ),
    [vendorProducts],
  );

  const vendorOrders = useMemo(() => {
    return orders
      .filter((order) =>
        isOrderOfVendor({
          order,
          vendorEmail,
          vendorProductIds,
        }),
      )
      .map((order) => {
        const items = extractVendorOrderItems(
          order,
          vendorEmail,
          vendorProductIds,
        );

        return {
          ...order,
          items,
          status: normalizeOrderStatus(order?.status),
          customer: resolveOrderCustomer(order),
          date: resolveOrderDate(order),
          updatedAt: resolveUpdatedAt(order),
          vendorSubtotal: resolveVendorSubtotal(items),
          paymentMethodLabel: resolvePaymentMethodLabel(order?.paymentMethod),
          addressSummary: resolveAddressSummary(order),
          fullAddress: resolveFullAddress(order),
          statusHistory: resolveStatusHistory(order),
          cancellation:
            order?.cancellation && typeof order.cancellation === "object"
              ? order.cancellation
              : null,
        };
      });
  }, [orders, vendorEmail, vendorProductIds]);

  const visibleOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const nextOrders = vendorOrders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      if (dateFilter && getOrderDateInputValue(order.date) !== dateFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return getOrderSearchableText(order).includes(normalizedSearch);
    });

    nextOrders.sort((left, right) => {
      const leftTime = new Date(left.updatedAt ?? left.date ?? 0).getTime();
      const rightTime = new Date(right.updatedAt ?? right.date ?? 0).getTime();

      if (sortBy === "oldest") {
        return leftTime - rightTime;
      }

      if (sortBy === "highest-value") {
        return right.vendorSubtotal - left.vendorSubtotal;
      }

      return rightTime - leftTime;
    });

    return nextOrders;
  }, [dateFilter, searchTerm, sortBy, statusFilter, vendorOrders]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return visibleOrders.slice(startIndex, endIndex);
  }, [currentPage, visibleOrders]);

  const totalPages = Math.ceil(visibleOrders.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, searchTerm, sortBy, statusFilter]);

  useEffect(() => {
    if (currentPage <= totalPages) {
      return;
    }

    setCurrentPage(Math.max(totalPages, 1));
  }, [currentPage, totalPages]);

  const selectedOrder = useMemo(() => {
    const currentInVisible = visibleOrders.find(
      (order) => String(order?.id ?? "") === selectedOrderId,
    );

    if (currentInVisible) {
      return currentInVisible;
    }

    return (
      vendorOrders.find(
        (order) => String(order?.id ?? "") === selectedOrderId,
      ) || null
    );
  }, [selectedOrderId, vendorOrders, visibleOrders]);

  const cancelTargetOrder = useMemo(() => {
    return (
      vendorOrders.find(
        (order) => String(order?.id ?? "") === cancelTargetId,
      ) || null
    );
  }, [cancelTargetId, vendorOrders]);

  const handleOrderStatusUpdate = async (
    order,
    nextStatus,
    cancellationPayload,
  ) => {
    const orderId = String(order?.id ?? "").trim();

    if (!orderId) {
      return;
    }

    try {
      setProcessingOrderId(orderId);

      const updatedOrder = await updateOrderById({
        id: orderId,
        actor: "vendor",
        updates: {
          status: nextStatus,
          ...(cancellationPayload ? { cancellation: cancellationPayload } : {}),
        },
      });

      queryClient.setQueryData(["orders"], (previous) =>
        upsertOrderInList(previous, updatedOrder),
      );
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (error) {
      window.alert(error?.message ?? "Khong the cap nhat don hang.");
    } finally {
      setProcessingOrderId("");
    }
  };

  const handleStartProcessing = async (order) => {
    if (order?.status !== "pending") {
      return;
    }

    await handleOrderStatusUpdate(order, "processing");
  };

  const handleMarkCompleted = async (order) => {
    if (order?.status !== "processing") {
      return;
    }

    await handleOrderStatusUpdate(order, "completed");
  };

  const handleOpenCancelModal = (order) => {
    const currentStatus = String(order?.status ?? "")
      .trim()
      .toLowerCase();

    if (!currentStatus || !["pending", "processing"].includes(currentStatus)) {
      return;
    }

    setCancelTargetId(String(order?.id ?? ""));
    setCancelReason("");
  };

  const handleCloseCancelModal = () => {
    setCancelTargetId("");
    setCancelReason("");
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetOrder) {
      return;
    }

    const reason = cancelReason.trim();

    if (!reason) {
      window.alert("Vendor can nhap ly do khi huy don.");
      return;
    }

    await handleOrderStatusUpdate(cancelTargetOrder, "cancelled", {
      by: "vendor",
      reason,
      at: new Date().toISOString(),
    });

    handleCloseCancelModal();
  };

  return (
    <section className="vendor-section-card">
      <div className="vendor-section-card__header">
        <h2>Orders from your customers</h2>
        <span>{visibleOrders.length} orders</span>
      </div>

      <div className="vendor-orders-toolbar">
        <label className="vendor-orders-toolbar__field vendor-orders-toolbar__field--search">
          <span>Search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Order ID, customer, email, phone"
          />
        </label>

        <label className="vendor-orders-toolbar__field">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label className="vendor-orders-toolbar__field">
          <span>Order date</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          />
        </label>

        <label className="vendor-orders-toolbar__field">
          <span>Sort</span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest-value">Highest value</option>
          </select>
        </label>
      </div>

      {visibleOrders.length === 0 ? (
        <p className="vendor-panel-empty">
          {isProductsLoading || isOrdersLoading
            ? "Loading data..."
            : "No order data available."}
        </p>
      ) : (
        <div className="vendor-table vendor-table--scrollable">
          <div className="vendor-table__row vendor-table__row--orders-v1 vendor-table__row--head">
            <span>Orrder ID</span>
            <span>Placed</span>
            <span>Customer</span>
            <span>Contact</span>
            <span>Amount</span>
            <span>Payment</span>
            <span>Address</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {paginatedOrders.map((order, index) => {
            const orderId = String(order?.id ?? "");
            const rowKey =
              orderId || String(order?._id || `vendor-order-${index}`);
            const normalizedStatus = String(order?.status ?? "").toLowerCase();
            const isPending = normalizedStatus === "pending";
            const isProcessing = normalizedStatus === "processing";
            const canCancel =
              normalizedStatus === "pending" ||
              normalizedStatus === "processing";
            const isFinalized =
              normalizedStatus === "completed" ||
              normalizedStatus === "cancelled";
            const isBusy = processingOrderId === orderId;

            return (
              <div
                key={rowKey}
                className="vendor-table__row vendor-table__row--orders-v1"
              >
                <span className="vendor-order-id">
                  {orderId ||
                    `#${(currentPage - 1) * ITEMS_PER_PAGE + index + 1}`}
                </span>
                <span>{formatDate(order.date)}</span>
                <span>
                  <strong>{order.customer?.name}</strong>
                </span>
                <span className="vendor-order-contact">
                  <span>{order.customer?.email}</span>
                  <span>{order.customer?.phone}</span>
                </span>
                <span>{currency.format(order.vendorSubtotal)}</span>
                <span>{order.paymentMethodLabel}</span>
                <span title={order.fullAddress}>{order.addressSummary}</span>
                <span>
                  <span
                    className={`vendor-pill vendor-pill--${normalizedStatus}`}
                  >
                    {normalizedStatus}
                  </span>
                </span>
                <span>
                  <div className="vendor-order-actions vendor-order-actions--stacked">
                    <button
                      type="button"
                      className="vendor-inline-btn vendor-inline-btn--muted vendor-inline-icon-btn"
                      aria-label="View details"
                      title="View details"
                      onClick={() => setSelectedOrderId(orderId)}
                    >
                      <EyeIcon />
                    </button>

                    <button
                      type="button"
                      className="vendor-inline-btn vendor-inline-icon-btn vendor-inline-icon-btn--play"
                      aria-label="Start processing"
                      title="Start processing"
                      disabled={isBusy || !isPending}
                      onClick={() => handleStartProcessing(order)}
                    >
                      {isBusy && isPending ? (
                        <span className="vendor-inline-icon-btn__spinner">
                          ...
                        </span>
                      ) : (
                        <PlayIcon />
                      )}
                    </button>

                    <button
                      type="button"
                      className="vendor-inline-btn vendor-inline-btn--success vendor-inline-icon-btn"
                      aria-label="Mark completed"
                      title="Mark completed"
                      disabled={isBusy || !isProcessing}
                      onClick={() => handleMarkCompleted(order)}
                    >
                      {isBusy && isProcessing ? (
                        <span className="vendor-inline-icon-btn__spinner">
                          ...
                        </span>
                      ) : (
                        <CheckIcon />
                      )}
                    </button>

                    <button
                      type="button"
                      className="vendor-inline-btn vendor-inline-btn--danger vendor-inline-icon-btn"
                      aria-label="Cancel order"
                      title="Cancel order"
                      disabled={isBusy || !canCancel}
                      onClick={() => handleOpenCancelModal(order)}
                    >
                      <XIcon />
                    </button>
                  </div>
                  <div>
                    {" "}
                    {isFinalized ? (
                      <small className="vendor-order-final-note">
                        Order is finalized, cannot be changed.
                      </small>
                    ) : null}
                    <div></div>
                    {order.customer?.email &&
                    order.customer?.email !== "N/A" ? (
                      <a
                        className="vendor-inline-link"
                        href={`mailto:${order.customer.email}`}
                      >
                        Contact customer
                      </a>
                    ) : null}
                  </div>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {visibleOrders.length > 0 && totalPages > 1 && (
        <div className="vendor-pagination">
          <button
            type="button"
            className="vendor-pagination-btn"
            onClick={() => setCurrentPage((previous) => previous - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          <span className="vendor-pagination-info">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            className="vendor-pagination-btn"
            onClick={() => setCurrentPage((previous) => previous + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {selectedOrder ? (
        <div className="vendor-modal" role="dialog" aria-modal="true">
          <div className="vendor-modal__content vendor-modal__content--wide">
            <div className="vendor-modal__header">
              <div>
                <h3>Order details</h3>
                <p>{selectedOrder.id}</p>
              </div>
              <button type="button" onClick={() => setSelectedOrderId("")}>
                ×
              </button>
            </div>

            <div className="vendor-modal__body vendor-order-details">
              <section className="vendor-order-details__section">
                <h4>Recipient</h4>
                <dl className="vendor-order-details__grid">
                  <div>
                    <dt>Name</dt>
                    <dd>
                      {selectedOrder.shippingAddress?.fullName ||
                        selectedOrder.customer?.name}
                    </dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>{selectedOrder.customer?.phone}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{selectedOrder.customer?.email}</dd>
                  </div>

                  <div>
                    <dt>Payment</dt>
                    <dd>{selectedOrder.paymentMethodLabel}</dd>
                  </div>
                  <div className="vendor-order-details__full">
                    <dt>Address</dt>
                    <dd>{selectedOrder.fullAddress}</dd>
                  </div>
                </dl>
              </section>

              <section className="vendor-order-details__section vendor-order-details__section--full">
                <h4>Your items</h4>
                <div className="vendor-order-detail-items">
                  {selectedOrder.items.map((item, itemIndex) => {
                    const itemSubtotal =
                      Number(item?.price ?? 0) * Number(item?.quantity ?? 0);

                    return (
                      <article
                        key={`${selectedOrder.id}-detail-${getItemProductId(item)}-${itemIndex}`}
                        className="vendor-order-detail-item"
                      >
                        <img src={item.image} alt={item.title} />
                        <div>
                          <strong>{item.title}</strong>
                          <p>SKU/ID: {item.sku || item.productId || "N/A"}</p>
                          <p>Variant: {formatItemVariant(item)}</p>
                          <p>Quantity: {item.quantity}</p>
                          <p>
                            Unit price:{" "}
                            {currency.format(Number(item?.price ?? 0))}
                          </p>
                          <p>Subtotal: {currency.format(itemSubtotal)}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="vendor-order-details__summary">
                  <strong>Vendor subtotal</strong>
                  <span>{currency.format(selectedOrder.vendorSubtotal)}</span>
                </div>
              </section>

              <section className="vendor-order-details__section">
                <h4>Status history</h4>
                <div className="vendor-order-history">
                  {selectedOrder.statusHistory.length > 0 ? (
                    selectedOrder.statusHistory.map((entry, entryIndex) => (
                      <div
                        key={`${selectedOrder.id}-history-${entryIndex}`}
                        className="vendor-order-history__item"
                      >
                        <strong>
                          {entry.fromStatus
                            ? `${entry.fromStatus} → ${entry.toStatus}`
                            : entry.toStatus}
                        </strong>
                        <span>By: {entry.by}</span>
                        <span>At: {formatDateTime(entry.at)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="vendor-panel-empty">No status history yet.</p>
                  )}
                </div>
              </section>

              <section className="vendor-order-details__section">
                <h4>Cancellation</h4>
                {selectedOrder.cancellation?.reason ? (
                  <dl className="vendor-order-details__grid">
                    <div>
                      <dt>Cancelled by</dt>
                      <dd>{selectedOrder.cancellation.by || "N/A"}</dd>
                    </div>
                    <div>
                      <dt>Cancelled at</dt>
                      <dd>{formatDateTime(selectedOrder.cancellation.at)}</dd>
                    </div>
                    <div className="vendor-order-details__full">
                      <dt>Reason</dt>
                      <dd>{selectedOrder.cancellation.reason}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="vendor-panel-empty">
                    Order has not been cancelled.
                  </p>
                )}
              </section>
            </div>

            <div className="vendor-modal__actions">
              <button
                type="button"
                className="vendor-inline-btn vendor-inline-btn--muted"
                onClick={() => setSelectedOrderId("")}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cancelTargetOrder ? (
        <div className="vendor-modal" role="dialog" aria-modal="true">
          <div className="vendor-modal__content vendor-modal__content--compact">
            <div className="vendor-modal__header">
              <div>
                <h3>Cancel order</h3>
                <p>{cancelTargetOrder.id}</p>
              </div>
              <button type="button" onClick={handleCloseCancelModal}>
                ×
              </button>
            </div>

            <div className="vendor-modal__body vendor-order-cancel-modal">
              <label className="vendor-order-cancel-modal__field">
                <span>Reason for cancellation</span>
                <textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Nhap ly do huy don"
                />
              </label>
            </div>

            <div className="vendor-modal__actions">
              <button
                type="button"
                className="vendor-inline-btn vendor-inline-btn--muted"
                onClick={handleCloseCancelModal}
              >
                Close
              </button>
              <button
                type="button"
                className="vendor-inline-btn vendor-inline-btn--danger"
                disabled={
                  processingOrderId === String(cancelTargetOrder?.id ?? "")
                }
                onClick={handleConfirmCancel}
              >
                {processingOrderId === String(cancelTargetOrder?.id ?? "")
                  ? "Cancelling..."
                  : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
