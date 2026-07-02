import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { addProductReview } from "../../api/productApi";
import { cancelMyOrder } from "../../api/ordersApi";
import Footer from "../../components/Footer";
import Header from "../../components/Header";
import { useAuth } from "../../hooks/useAuth";
import { useOrdersQuery } from "../../hooks/useOrdersQuery";
import { useProductsQuery } from "../../hooks/useProductsQuery";
import { useUsersQuery } from "../../hooks/useUsersQuery";
import { syncProductCaches } from "../../utils/productCache";
import "./MyOrders.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("vi-VN");
}

const ORDER_TABS = [
  { key: "all", label: "All" },
  { key: "to_confirm", label: "To Confirm" },
  { key: "to_ship", label: "To Ship" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const ORDER_STATUS_LABELS = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PAYMENT_STATUS_LABELS = {
  unpaid: "Unpaid",
  pending: "Pending Payment",
  paid: "Paid",
  failed: "Payment Failed",
  expired: "Payment Expired",
  cancelled: "Payment Cancelled",
};

function normalizeOrderStatus(value) {
  const rawStatus = String(value ?? "pending")
    .trim()
    .toLowerCase();

  if (rawStatus === "delivery" || rawStatus === "delivered") {
    return "completed";
  }

  if (rawStatus === "canceled") {
    return "cancelled";
  }

  if (["pending", "processing", "completed", "cancelled"].includes(rawStatus)) {
    return rawStatus;
  }

  return "pending";
}

function getOrderTabKey(status) {
  const normalizedStatus = normalizeOrderStatus(status);

  if (normalizedStatus === "pending") {
    return "to_confirm";
  }

  if (normalizedStatus === "processing") {
    return "to_ship";
  }

  if (normalizedStatus === "completed" || normalizedStatus === "cancelled") {
    return normalizedStatus;
  }

  return "all";
}

function getOrderStatusLabel(status) {
  return ORDER_STATUS_LABELS[normalizeOrderStatus(status)] ?? "Pending";
}

function getPaymentStatusLabel(status) {
  const normalizedStatus = String(status ?? "unpaid")
    .trim()
    .toLowerCase();

  return (
    PAYMENT_STATUS_LABELS[normalizedStatus] ?? PAYMENT_STATUS_LABELS.unpaid
  );
}

function buildShopList(orderItems, vendorMapByEmail) {
  const uniqueShopMap = new Map();

  for (const orderItem of orderItems) {
    const vendorEmail = String(orderItem?.vendorEmail ?? "")
      .trim()
      .toLowerCase();
    const vendorProfile = vendorMapByEmail.get(vendorEmail);
    const shopName =
      vendorProfile?.shopName ||
      vendorProfile?.name ||
      orderItem?.shopName ||
      (vendorEmail ? vendorEmail.split("@")[0] : "Shop");
    const avatarUrl = String(vendorProfile?.avatarUrl ?? "").trim();
    const shopKey = vendorEmail || String(shopName).trim().toLowerCase();

    if (!shopKey || uniqueShopMap.has(shopKey)) {
      continue;
    }

    uniqueShopMap.set(shopKey, {
      vendorEmail,
      shopName,
      avatarUrl,
    });
  }

  return Array.from(uniqueShopMap.values());
}

function buildOrderSearchText(order, orderItems, shops, statusLabel) {
  const shippingAddress =
    order?.shippingAddress && typeof order.shippingAddress === "object"
      ? order.shippingAddress
      : {};

  return [
    order?.id,
    order?.customerName,
    order?.customerEmail,
    order?.contactEmail,
    order?.customerPhone,
    shippingAddress.fullName,
    shippingAddress.address,
    shippingAddress.city,
    shippingAddress.state,
    shops.map((shop) => shop.shopName).join(" "),
    orderItems
      .map((item) => [item?.title, item?.sku, item?.color, item?.size])
      .flat()
      .filter(Boolean)
      .join(" "),
    statusLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildOrderItemVariantText(item) {
  const explicitVariantLabel = String(item?.variantLabel ?? "").trim();

  if (explicitVariantLabel) {
    return explicitVariantLabel;
  }

  return [
    item?.color ? `Color ${item.color}` : null,
    item?.size ? `Size ${item.size}` : null,
    item?.sku ? `SKU ${item.sku}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function hasUserReviewedProduct(product, customerEmail) {
  const normalizedCustomerEmail = String(customerEmail ?? "")
    .trim()
    .toLowerCase();

  if (!normalizedCustomerEmail || !Array.isArray(product?.reviewsData)) {
    return false;
  }

  return product.reviewsData.some(
    (reviewItem) =>
      String(reviewItem?.customerEmail ?? "")
        .trim()
        .toLowerCase() === normalizedCustomerEmail,
  );
}

function buildReviewableItems(orderItems, productsById, customerEmail) {
  const uniqueReviewItems = new Map();

  orderItems.forEach((orderItem, index) => {
    const productId = String(orderItem?.productId ?? "").trim();
    const reviewKey = productId || `order-item-${index}`;

    if (uniqueReviewItems.has(reviewKey)) {
      return;
    }

    const product = productId ? (productsById.get(productId) ?? null) : null;

    uniqueReviewItems.set(reviewKey, {
      reviewKey,
      productId,
      title: orderItem?.title || product?.title || "Product",
      image: orderItem?.image || product?.image || "/favicon.svg",
      variantLabel: buildOrderItemVariantText(orderItem),
      isAvailable: Boolean(productId && product),
      isReviewed: hasUserReviewedProduct(product, customerEmail),
    });
  });

  return Array.from(uniqueReviewItems.values());
}

export default function MyOrders() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: orders = [], isLoading: isOrdersLoading } = useOrdersQuery();
  const { data: users = [], isLoading: isUsersLoading } = useUsersQuery();
  const { data: products = [], isLoading: isProductsLoading } =
    useProductsQuery();
  const [cancelReasonByOrder, setCancelReasonByOrder] = useState({});
  const [cancelReasonErrorByOrder, setCancelReasonErrorByOrder] = useState({});
  const cancelReasonInputRefs = useRef({});
  const [processingOrderId, setProcessingOrderId] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeReviewOrderId, setActiveReviewOrderId] = useState("");
  const [selectedReviewItemKey, setSelectedReviewItemKey] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewStars, setReviewStars] = useState(5);
  const [processingReviewItemKey, setProcessingReviewItemKey] = useState("");
  const [reviewFeedbackMessage, setReviewFeedbackMessage] = useState("");

  const vendorMapByEmail = useMemo(
    () =>
      new Map(
        users.map((item) => [
          String(item?.email ?? "")
            .trim()
            .toLowerCase(),
          item,
        ]),
      ),
    [users],
  );

  const userEmail = String(user?.email ?? "")
    .trim()
    .toLowerCase();
  const userId = String(user?.id ?? "").trim();

  const productMapById = useMemo(
    () =>
      new Map(products.map((item) => [String(item?.id ?? "").trim(), item])),
    [products],
  );

  const myOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderCustomerId = String(order?.customerId ?? "").trim();
      const orderEmail = String(order?.customerEmail ?? "")
        .trim()
        .toLowerCase();
      return (
        (orderCustomerId && orderCustomerId === userId) ||
        (orderEmail && orderEmail === userEmail)
      );
    });
  }, [orders, userEmail, userId]);

  const ordersWithMeta = useMemo(() => {
    return myOrders.map((order) => {
      const orderId = String(order?.id ?? "").trim();
      const status = normalizeOrderStatus(order?.status);
      const statusLabel = getOrderStatusLabel(status);
      const statusGroup = getOrderTabKey(status);
      const orderItems = Array.isArray(order?.items) ? order.items : [];
      const shops = buildShopList(orderItems, vendorMapByEmail);
      const reviewableItems = buildReviewableItems(
        orderItems,
        productMapById,
        userEmail,
      );
      const firstShop = shops[0] ?? null;
      const visibleItems = orderItems.slice(0, 3);
      const hiddenItemsCount = Math.max(
        0,
        orderItems.length - visibleItems.length,
      );

      return {
        ...order,
        orderId,
        status,
        statusLabel,
        paymentMethod: String(order?.paymentMethod ?? "cod")
          .trim()
          .toLowerCase(),
        paymentStatus: String(order?.paymentStatus ?? "unpaid")
          .trim()
          .toLowerCase(),
        paymentStatusLabel: getPaymentStatusLabel(order?.paymentStatus),
        statusGroup,
        orderItems,
        reviewableItems,
        shops,
        firstShopName: firstShop?.shopName || "Shop",
        firstShopAvatar: firstShop?.avatarUrl || "",
        firstShopEmail: firstShop?.vendorEmail || "",
        visibleItems,
        hiddenItemsCount,
        canCancel: status === "pending",
        searchText: buildOrderSearchText(order, orderItems, shops, statusLabel),
        createdAtTime: new Date(
          order?.createdAt ?? order?.updatedAt ?? 0,
        ).getTime(),
        updatedAtTime: new Date(
          order?.updatedAt ?? order?.createdAt ?? 0,
        ).getTime(),
        orderTotal: Number(order?.total ?? 0),
        cancellationReason: String(order?.cancellation?.reason ?? "").trim(),
        cancellationAt: order?.cancellation?.at ?? null,
        displayDate: formatDate(order?.createdAt),
        canRetryPayment:
          String(order?.paymentMethod ?? "")
            .trim()
            .toLowerCase() === "sepay" &&
          ["pending", "failed"].includes(
            String(order?.paymentStatus ?? "")
              .trim()
              .toLowerCase(),
          ),
      };
    });
  }, [myOrders, productMapById, userEmail, vendorMapByEmail]);

  const tabCounts = useMemo(() => {
    const counts = {
      all: ordersWithMeta.length,
      to_confirm: 0,
      to_ship: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const order of ordersWithMeta) {
      if (counts[order.statusGroup] !== undefined) {
        counts[order.statusGroup] += 1;
      }
    }

    return counts;
  }, [ordersWithMeta]);

  const visibleOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...ordersWithMeta]
      .filter((order) => {
        if (activeTab !== "all" && order.statusGroup !== activeTab) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return order.searchText.includes(normalizedSearch);
      })
      .sort((left, right) => {
        const leftTime = Number.isFinite(left.updatedAtTime)
          ? left.updatedAtTime
          : left.createdAtTime;
        const rightTime = Number.isFinite(right.updatedAtTime)
          ? right.updatedAtTime
          : right.createdAtTime;

        return rightTime - leftTime;
      });
  }, [activeTab, ordersWithMeta, searchTerm]);

  const activeReviewOrder = useMemo(
    () =>
      ordersWithMeta.find((order) => order.orderId === activeReviewOrderId) ??
      null,
    [activeReviewOrderId, ordersWithMeta],
  );

  const selectedReviewItem =
    activeReviewOrder?.reviewableItems.find(
      (item) => item.reviewKey === selectedReviewItemKey,
    ) ??
    activeReviewOrder?.reviewableItems[0] ??
    null;

  const canSubmitSelectedReview = Boolean(
    user &&
    selectedReviewItem?.productId &&
    selectedReviewItem?.isAvailable &&
    !selectedReviewItem?.isReviewed,
  );

  const isSubmittingReview = Boolean(
    processingReviewItemKey &&
    processingReviewItemKey === selectedReviewItemKey,
  );

  const isPageLoading = isOrdersLoading || isUsersLoading || isProductsLoading;

  const handleCustomerCancelOrder = async (order) => {
    const orderId = String(order?.id ?? "").trim();
    const status = String(order?.status ?? "")
      .trim()
      .toLowerCase();

    if (!orderId || status !== "pending") {
      return;
    }

    const reason = String(cancelReasonByOrder[orderId] ?? "").trim();

    if (!reason) {
      setCancelReasonErrorByOrder((previous) => ({
        ...previous,
        [orderId]: true,
      }));

      cancelReasonInputRefs.current[orderId]?.focus();
      return;
    }

    try {
      setProcessingOrderId(orderId);

      await cancelMyOrder({
        id: orderId,
        reason,
      });

      setCancelReasonByOrder((previous) => ({
        ...previous,
        [orderId]: "",
      }));
      setCancelReasonErrorByOrder((previous) => ({
        ...previous,
        [orderId]: false,
      }));

      await queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (error) {
      window.alert(error?.message ?? "Unable to cancel the order.");
    } finally {
      setProcessingOrderId("");
    }
  };

  const handleOpenReviewModal = (order) => {
    const firstReviewItem =
      order?.reviewableItems?.find(
        (item) => item.isAvailable && !item.isReviewed,
      ) ??
      order?.reviewableItems?.[0] ??
      null;

    setActiveReviewOrderId(order?.orderId ?? "");
    setSelectedReviewItemKey(firstReviewItem?.reviewKey ?? "");
    setReviewComment("");
    setReviewStars(5);
    setReviewFeedbackMessage("");
  };

  const handleCloseReviewModal = () => {
    setActiveReviewOrderId("");
    setSelectedReviewItemKey("");
    setReviewComment("");
    setReviewStars(5);
    setProcessingReviewItemKey("");
    setReviewFeedbackMessage("");
  };

  const handleSelectReviewItem = (reviewKey) => {
    setSelectedReviewItemKey(reviewKey);
    setReviewComment("");
    setReviewStars(5);
    setReviewFeedbackMessage("");
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();

    if (!user) {
      window.alert("Please sign in to review the product.");
      return;
    }

    if (!selectedReviewItem?.productId) {
      window.alert("Product not found for review.");
      return;
    }

    if (!selectedReviewItem.isAvailable) {
      window.alert(
        "This product is currently unavailable for review submission.",
      );
      return;
    }

    if (selectedReviewItem.isReviewed) {
      window.alert("You have already reviewed this product.");
      return;
    }

    const trimmedComment = reviewComment.trim();

    if (!trimmedComment) {
      window.alert("Please enter a comment before submitting.");
      return;
    }

    const nextReviewItem =
      activeReviewOrder?.reviewableItems.find(
        (item) =>
          item.reviewKey !== selectedReviewItem.reviewKey &&
          item.isAvailable &&
          !item.isReviewed,
      ) ?? null;

    try {
      setProcessingReviewItemKey(selectedReviewItem.reviewKey);

      const updatedProduct = await addProductReview({
        productId: selectedReviewItem.productId,
        review: {
          customerEmail: user.email,
          customerName: user.name ?? user.email,
          comment: trimmedComment,
          stars: reviewStars,
        },
      });

      syncProductCaches(queryClient, updatedProduct);

      setReviewComment("");
      setReviewStars(5);
      setReviewFeedbackMessage(
        "Your review has been saved and is now visible on the product page.",
      );

      if (nextReviewItem) {
        setSelectedReviewItemKey(nextReviewItem.reviewKey);
      }

      await queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error) {
      window.alert(error?.message ?? "Unable to submit the review.");
    } finally {
      setProcessingReviewItemKey("");
    }
  };

  return (
    <>
      <Header />

      <main className="my-orders-page o-container">
        <nav className="my-orders-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>&gt;</span>
          <strong>My Orders</strong>
        </nav>

        <section className="my-orders-panel">
          <div className="my-orders-header-wrapper">
            <div>
              <h1>Your Orders</h1>
              <p>
                Track order status, quickly review products, and cancel orders
                when eligible.
              </p>
            </div>
            <div className="my-orders-hero__stat">
              <strong>{myOrders.length}</strong>
              <span>orders</span>
            </div>
          </div>
          <div className="my-orders-toolbar">
            <label
              className="my-orders-search"
              htmlFor="my-orders-search-input"
            >
              <span className="my-orders-search__icon" aria-hidden="true">
                ⌕
              </span>
              <input
                id="my-orders-search-input"
                type="search"
                placeholder="Search by order ID, shop, or product"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <div
              className="my-orders-tabs"
              role="tablist"
              aria-label="Order status tabs"
            >
              {ORDER_TABS.map((tab) => {
                const isActive = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`my-orders-tab${isActive ? " is-active" : ""}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <span>{tab.label}</span>
                    <span className="my-orders-tab__count">
                      {tabCounts[tab.key] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {isPageLoading ? (
            <section className="my-orders-loading" aria-live="polite">
              <p>Loading orders...</p>
            </section>
          ) : myOrders.length === 0 ? (
            <div className="my-orders-empty-state">
              <div className="my-orders-empty-state__icon" aria-hidden="true">
                🛍️
              </div>
              <h2>You don't have any orders yet</h2>
              <p>Start shopping to see your orders appear here.</p>
              <Link
                to="/"
                className="my-orders-button my-orders-button--primary"
              >
                Shop Now
              </Link>
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="my-orders-empty-state">
              <div className="my-orders-empty-state__icon" aria-hidden="true">
                🔎
              </div>
              <h2>No matching orders found</h2>
              <p>
                Try changing the tab or clearing the search term to see other
                orders.
              </p>
              <button
                type="button"
                className="my-orders-button my-orders-button--secondary"
                onClick={() => {
                  setActiveTab("all");
                  setSearchTerm("");
                }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="my-orders-list">
              {visibleOrders.map((order, index) => {
                const orderId = order.orderId || `#${index + 1}`;
                const isCancelled = order.status === "cancelled";
                const isCompleted = order.status === "completed";
                const canCancel = order.canCancel && !isCancelled;
                const cancelReason = String(
                  cancelReasonByOrder[order.orderId] ?? "",
                );
                const hasCancelReasonError = Boolean(
                  cancelReasonErrorByOrder[order.orderId],
                );
                const cancelReasonErrorId = hasCancelReasonError
                  ? `cancel-reason-error-${order.orderId}`
                  : undefined;
                const shopHref = order.firstShopEmail
                  ? `/shops/${encodeURIComponent(order.firstShopEmail)}`
                  : "/shops";
                const isCancelling = processingOrderId === order.orderId;

                return (
                  <article
                    key={order.orderId || `my-order-${index}`}
                    className="my-orders-card"
                  >
                    <header className="my-orders-card__top">
                      <div className="my-orders-card__shop">
                        <div
                          className="my-orders-card__avatar"
                          aria-hidden="true"
                        >
                          {order.firstShopAvatar ? (
                            <img
                              src={order.firstShopAvatar}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span>
                              {String(order.firstShopName || "S")
                                .trim()
                                .charAt(0)
                                .toUpperCase() || "S"}
                            </span>
                          )}
                        </div>

                        <div className="my-orders-card__shop-copy">
                          <div className="my-orders-card__shop-line">
                            <strong>{order.firstShopName}</strong>
                            <Link to={shopHref} className="my-orders-shop-link">
                              View Shop
                            </Link>
                          </div>
                          <p>
                            Order {orderId} · {order.displayDate}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`my-orders-status-pill my-orders-status-pill--${order.status}`}
                      >
                        {order.statusLabel}
                      </span>
                    </header>

                    {order.paymentMethod === "sepay" ? (
                      <div className="my-orders-card__note">
                        <p>
                          Payment status:{" "}
                          <strong>{order.paymentStatusLabel}</strong>
                          {order.paidAt ? ` · ${formatDate(order.paidAt)}` : ""}
                        </p>
                      </div>
                    ) : null}

                    <div className="my-orders-card__items">
                      {order.visibleItems.map((item, itemIndex) => {
                        const itemQuantity = Number(item?.quantity ?? 0);
                        const safeQuantity =
                          Number.isFinite(itemQuantity) && itemQuantity > 0
                            ? itemQuantity
                            : 1;
                        const itemVariant = buildOrderItemVariantText(item);

                        return (
                          <div
                            key={`${order.orderId}-${item?.productId ?? itemIndex}`}
                            className="my-orders-item"
                          >
                            <div
                              className="my-orders-item__thumb"
                              aria-hidden="true"
                            >
                              <img
                                src={item?.image || "/favicon.svg"}
                                alt=""
                                loading="lazy"
                              />
                            </div>

                            <div className="my-orders-item__content">
                              <h3>{item?.title || "Product"}</h3>
                              <div className="my-orders-item__meta">
                                <span>{itemVariant || "Default variant"}</span>
                                <span>x{safeQuantity}</span>
                              </div>
                            </div>

                            <div className="my-orders-item__price">
                              {currency.format(Number(item?.price ?? 0))}
                            </div>
                          </div>
                        );
                      })}

                      {order.hiddenItemsCount > 0 ? (
                        <p className="my-orders-card__more-items">
                          +{order.hiddenItemsCount} more items
                        </p>
                      ) : null}
                    </div>

                    <footer className="my-orders-card__footer">
                      <div className="my-orders-card__note">
                        {isCancelled ? (
                          <>
                            <span className="my-orders-card__note-label">
                              Cancelled
                            </span>
                            <p>
                              {order.cancellationReason ||
                                "The order has been cancelled."}
                            </p>
                            {order.cancellationAt ? (
                              <small>
                                Cancelled at {formatDate(order.cancellationAt)}
                              </small>
                            ) : null}
                          </>
                        ) : isCompleted ? (
                          <p>
                            This order has been completed. You can review it at
                            any time.
                          </p>
                        ) : order.paymentMethod === "sepay" &&
                          order.paymentStatus === "paid" ? (
                          <p>
                            This order was successfully paid via SePay and is
                            waiting for the shop to confirm processing.
                          </p>
                        ) : order.status === "pending" ? (
                          <p>
                            The order is pending confirmation. You can cancel it
                            during this stage.
                          </p>
                        ) : order.canRetryPayment ? (
                          <p>
                            The SePay payment for this order is currently{" "}
                            {order.paymentStatus}. You can continue the payment.
                          </p>
                        ) : (
                          <p>
                            This order is currently{" "}
                            {order.statusLabel.toLowerCase()}. It cannot be
                            cancelled from this page.
                          </p>
                        )}

                        {canCancel ? (
                          <label
                            className="my-orders-cancel"
                            htmlFor={`cancel-${order.orderId}`}
                          >
                            <div className="my-orders-cancel__header">
                              <span>Cancellation Reason</span>
                            </div>
                            <textarea
                              id={`cancel-${order.orderId}`}
                              rows="2"
                              placeholder="Enter cancellation reason"
                              ref={(element) => {
                                if (element) {
                                  cancelReasonInputRefs.current[order.orderId] =
                                    element;
                                } else {
                                  delete cancelReasonInputRefs.current[
                                    order.orderId
                                  ];
                                }
                              }}
                              aria-invalid={hasCancelReasonError}
                              aria-describedby={cancelReasonErrorId}
                              className={`my-orders-cancel__textarea${
                                hasCancelReasonError ? " is-error" : ""
                              }`}
                              value={cancelReason}
                              onBlur={() => {
                                if (hasCancelReasonError) {
                                  setCancelReasonErrorByOrder((current) => ({
                                    ...current,
                                    [order.orderId]: false,
                                  }));
                                }
                              }}
                              onChange={(event) => {
                                const nextValue = event.target.value;

                                setCancelReasonByOrder((previous) => ({
                                  ...previous,
                                  [order.orderId]: nextValue,
                                }));

                                if (hasCancelReasonError) {
                                  setCancelReasonErrorByOrder((current) => ({
                                    ...current,
                                    [order.orderId]: false,
                                  }));
                                }
                              }}
                            />
                          </label>
                        ) : null}
                      </div>

                      <div className="my-orders-card__summary">
                        <div className="my-orders-card__total">
                          <span>Total Payment</span>
                          <strong>{currency.format(order.orderTotal)}</strong>
                        </div>

                        <div className="my-orders-card__actions">
                          {isCompleted ? (
                            <button
                              type="button"
                              className="my-orders-button my-orders-button--primary"
                              disabled={order.reviewableItems.length === 0}
                              onClick={() => handleOpenReviewModal(order)}
                            >
                              Review
                            </button>
                          ) : null}

                          <Link
                            to={shopHref}
                            className="my-orders-button my-orders-button--secondary"
                          >
                            View Shop
                          </Link>

                          {order.canRetryPayment ? (
                            <Link
                              to={`/payment/result?result=pending&provider=sepay&orderId=${encodeURIComponent(order.orderId)}`}
                              className="my-orders-button my-orders-button--primary"
                            >
                              Continue Payment
                            </Link>
                          ) : null}

                          {canCancel ? (
                            <button
                              type="button"
                              className="my-orders-button my-orders-button--danger"
                              disabled={isCancelling}
                              onClick={() => handleCustomerCancelOrder(order)}
                            >
                              {isCancelling ? "Cancelling..." : "Cancel Order"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {activeReviewOrder ? (
        <div
          className="my-orders-review-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="my-orders-review-modal-title"
          onClick={handleCloseReviewModal}
        >
          <div
            className="my-orders-review-modal__panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="my-orders-review-modal__header">
              <div>
                <p>Order {activeReviewOrder.orderId || "N/A"}</p>
                <h2 id="my-orders-review-modal-title">
                  Review Purchased Products
                </h2>
              </div>
              <button
                type="button"
                className="my-orders-review-modal__close"
                onClick={handleCloseReviewModal}
                aria-label="Close review modal"
              >
                ×
              </button>
            </div>

            {activeReviewOrder.reviewableItems.length === 0 ? (
              <p className="my-orders-review-modal__empty">
                No eligible products were found for review in this order.
              </p>
            ) : (
              <div className="my-orders-review-modal__content">
                <div className="my-orders-review-items">
                  {activeReviewOrder.reviewableItems.map((item) => {
                    const isSelected =
                      selectedReviewItem?.reviewKey === item.reviewKey;

                    return (
                      <button
                        key={item.reviewKey}
                        type="button"
                        className={`my-orders-review-item${
                          isSelected ? " is-active" : ""
                        }${item.isReviewed ? " is-reviewed" : ""}`}
                        onClick={() => handleSelectReviewItem(item.reviewKey)}
                      >
                        <div
                          className="my-orders-review-item__thumb"
                          aria-hidden="true"
                        >
                          <img src={item.image} alt="" loading="lazy" />
                        </div>

                        <div className="my-orders-review-item__content">
                          <strong>{item.title}</strong>
                          <span>{item.variantLabel || "Default variant"}</span>
                        </div>

                        <span className="my-orders-review-item__badge">
                          {item.isReviewed
                            ? "Reviewed"
                            : item.isAvailable
                              ? "Not Reviewed"
                              : "Unavailable"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <form
                  className="product-review-form my-orders-review-form"
                  onSubmit={handleSubmitReview}
                >
                  <h4>Write a Review</h4>

                  {reviewFeedbackMessage ? (
                    <p className="product-review-feedback" role="status">
                      {reviewFeedbackMessage}
                    </p>
                  ) : null}

                  {selectedReviewItem ? (
                    <div className="my-orders-review-form__product">
                      <div
                        className="my-orders-review-form__product-thumb"
                        aria-hidden="true"
                      >
                        <img
                          src={selectedReviewItem.image}
                          alt=""
                          loading="lazy"
                        />
                      </div>

                      <div className="my-orders-review-form__product-copy">
                        <strong>{selectedReviewItem.title}</strong>
                        <span>
                          {selectedReviewItem.variantLabel || "Default variant"}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {!user ? (
                    <p className="product-review-note">
                      Sign in to review this product.
                    </p>
                  ) : selectedReviewItem?.isReviewed ? (
                    <p className="product-review-note">
                      You have already reviewed this product. Each account can
                      only review a product once.
                    </p>
                  ) : !selectedReviewItem?.isAvailable ? (
                    <p className="product-review-note">
                      This product is currently unavailable for review
                      submission.
                    </p>
                  ) : (
                    <p className="product-review-note">
                      Your review will be displayed on the product detail page.
                    </p>
                  )}

                  <label>
                    Stars
                    <select
                      value={reviewStars}
                      onChange={(event) =>
                        setReviewStars(Number(event.target.value))
                      }
                      disabled={!canSubmitSelectedReview || isSubmittingReview}
                    >
                      <option value={5}>5</option>
                      <option value={4}>4</option>
                      <option value={3}>3</option>
                      <option value={2}>2</option>
                      <option value={1}>1</option>
                    </select>
                  </label>

                  <label>
                    Comment
                    <textarea
                      rows="5"
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      placeholder={
                        canSubmitSelectedReview
                          ? "Share your experience..."
                          : selectedReviewItem?.isReviewed
                            ? "You have already submitted a review for this product"
                            : "This product cannot be reviewed right now"
                      }
                      disabled={!canSubmitSelectedReview || isSubmittingReview}
                    />
                  </label>

                  <div className="my-orders-review-form__actions">
                    <button
                      type="button"
                      className="my-orders-button my-orders-button--secondary"
                      onClick={handleCloseReviewModal}
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="product-review-form__submit"
                      disabled={!canSubmitSelectedReview || isSubmittingReview}
                    >
                      {isSubmittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <Footer />
    </>
  );
}
