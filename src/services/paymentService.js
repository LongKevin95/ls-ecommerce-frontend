import apiClient, { extractApiPayload } from "../api/apiClient";

export async function initSePayCheckout(orderId) {
  const normalizedOrderId = String(orderId ?? "").trim();

  if (!normalizedOrderId) {
    throw new Error("Order not found for initializing SePay payment.");
  }

  const response = await apiClient.post("/payments/sepay/init", {
    orderId: normalizedOrderId,
  });

  return extractApiPayload(response);
}

export async function getOrderPaymentStatus(orderId) {
  const normalizedOrderId = String(orderId ?? "").trim();

  if (!normalizedOrderId) {
    throw new Error("Order not found for checking payment status.");
  }

  const response = await apiClient.get(
    `/payments/orders/${normalizedOrderId}/status`,
  );
  return extractApiPayload(response);
}
