import apiClient, { extractApiPayload } from "./apiClient";

function normalizeWishlistResponse(data) {
  const payload = data && typeof data === "object" ? data : {};
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function getMyWishlist() {
  const response = await apiClient.get("/wishlist");
  return normalizeWishlistResponse(extractApiPayload(response));
}

export async function addWishlistItem(productId) {
  const normalizedProductId = String(productId ?? "").trim();

  if (!normalizedProductId) {
    throw new Error("Missing product id.");
  }

  const response = await apiClient.post("/wishlist/items", {
    productId: normalizedProductId,
  });

  return normalizeWishlistResponse(extractApiPayload(response));
}

export async function removeWishlistItem(productId) {
  const normalizedProductId = String(productId ?? "").trim();

  if (!normalizedProductId) {
    throw new Error("Missing product id.");
  }

  const response = await apiClient.delete(
    `/wishlist/items/${normalizedProductId}`,
  );

  return normalizeWishlistResponse(extractApiPayload(response));
}
