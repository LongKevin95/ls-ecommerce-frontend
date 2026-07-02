import { normalizeOrder } from "../adapters/orderAdapter";
import apiClient, { extractApiPayload } from "../api/apiClient";
import { readAuthSession } from "../utils/authStorage";

function normalizeOrderList(data) {
  return Array.isArray(data) ? data.map(normalizeOrder) : [];
}

function normalizeVendorOrder(order) {
  return {
    ...normalizeOrder(order),
    vendorItems: Array.isArray(order?.vendorItems)
      ? order.vendorItems.map((item) => ({
          productId: String(item?.productId ?? ""),
          variantId: String(item?.variantId ?? ""),
          variantLabel: String(item?.variantLabel ?? "").trim(),
          title: String(item?.title ?? "Product").trim(),
          image: String(item?.image ?? "/favicon.svg").trim(),
          quantity: Math.max(1, Number(item?.quantity ?? 1)),
          price: Math.max(0, Number(item?.price ?? 0)),
          sku: String(item?.sku ?? "").trim(),
          color: String(item?.color ?? "Default").trim(),
          size: String(item?.size ?? "Default").trim(),
        }))
      : [],
  };
}

function getCurrentRoles() {
  return Array.isArray(readAuthSession()?.user?.roles)
    ? readAuthSession().user.roles
    : [];
}

export async function getOrdersByCustomerId() {
  const response = await apiClient.get("/orders/me");
  return normalizeOrderList(extractApiPayload(response));
}

export async function getAllOrders() {
  const response = await apiClient.get("/admin/orders");
  return normalizeOrderList(extractApiPayload(response));
}

export async function getVendorOrders() {
  const response = await apiClient.get("/vendor/orders");
  const payload = extractApiPayload(response);
  return Array.isArray(payload) ? payload.map(normalizeVendorOrder) : [];
}

export async function createOrder({
  customerId,
  shippingAddress,
  paymentMethod,
  items,
}) {
  const response = await apiClient.post("/orders", {
    customerId,
    shippingAddress,
    paymentMethod,
    items: Array.isArray(items)
      ? items.map((item) => ({
          productId: String(item?.productId ?? "").trim(),
          variantId: String(item?.variantId ?? "").trim(),
          variantLabel: String(item?.variantLabel ?? "").trim(),
          title: String(item?.title ?? "Product").trim(),
          image: String(item?.image ?? "/favicon.svg").trim(),
          quantity: Math.max(1, Number(item?.quantity ?? 1)),
          price: Math.max(0, Number(item?.price ?? 0)),
          vendorEmail: String(item?.vendorEmail ?? "")
            .trim()
            .toLowerCase(),
          shopName: String(item?.shopName ?? "Shop").trim(),
          sku: String(item?.sku ?? "").trim(),
          color: String(item?.color ?? "Default").trim(),
          size: String(item?.size ?? "Default").trim(),
        }))
      : [],
  });
  return normalizeOrder(extractApiPayload(response));
}

export async function updateOrderStatus(orderId, nextStatus, reason = "") {
  const normalizedOrderId = String(orderId ?? "").trim();

  if (!normalizedOrderId) {
    throw new Error("Order not found for updating.");
  }

  const route = getCurrentRoles().includes("admin")
    ? `/admin/orders/${normalizedOrderId}/status`
    : `/vendor/orders/${normalizedOrderId}/status`;
  const response = await apiClient.patch(route, {
    status: nextStatus,
    reason: String(reason ?? "").trim(),
  });

  return normalizeOrder(extractApiPayload(response));
}

export async function cancelMyOrder(orderId, reason) {
  const normalizedOrderId = String(orderId ?? "").trim();
  const normalizedReason = String(reason ?? "").trim();

  if (!normalizedOrderId) {
    throw new Error("Order not found for cancellation.");
  }

  if (!normalizedReason) {
    throw new Error("Please enter a cancellation reason.");
  }

  const response = await apiClient.patch(
    `/orders/${normalizedOrderId}/cancel`,
    {
      reason: normalizedReason,
    },
  );

  return normalizeOrder(extractApiPayload(response));
}
