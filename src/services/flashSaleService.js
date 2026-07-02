import apiClient, { extractApiPayload } from "../api/apiClient";

export async function getFlashSaleState() {
  const response = await apiClient.get("/flash-sale");
  return extractApiPayload(response);
}

export async function updateFlashSaleState(payload = {}) {
  const response = await apiClient.patch("/admin/flash-sale", payload);
  return extractApiPayload(response);
}
