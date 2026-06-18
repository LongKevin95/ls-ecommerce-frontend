import apiClient, { extractApiPayload } from "../api/apiClient";

export async function initSePayCheckout(orderId) {
  const normalizedOrderId = String(orderId ?? "").trim();

  if (!normalizedOrderId) {
    throw new Error("Không tìm thấy đơn hàng để khởi tạo thanh toán SePay.");
  }

  const response = await apiClient.post("/payments/sepay/init", {
    orderId: normalizedOrderId,
  });

  return extractApiPayload(response);
}

export async function getOrderPaymentStatus(orderId) {
  const normalizedOrderId = String(orderId ?? "").trim();

  if (!normalizedOrderId) {
    throw new Error("Không tìm thấy đơn hàng để kiểm tra trạng thái thanh toán.");
  }

  const response = await apiClient.get(`/payments/orders/${normalizedOrderId}/status`);
  return extractApiPayload(response);
}
