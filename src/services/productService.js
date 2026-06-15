import apiClient, { extractApiPayload } from "../api/apiClient";
import { readAuthSession } from "../utils/authStorage";
import { buildProductFormData } from "../utils/formData";

function normalizeProductList(data) {
  return Array.isArray(data) ? data : [];
}

function getCurrentRoles() {
  return Array.isArray(readAuthSession()?.user?.roles)
    ? readAuthSession().user.roles
    : [];
}

function isStatusOnlyUpdate(updates = {}) {
  const keys = Object.keys(updates ?? {}).filter(
    (key) => typeof updates[key] !== "undefined",
  );

  return (
    keys.includes("status") &&
    keys.every((key) => key === "status" || key === "reason")
  );
}

export async function getProducts() {
  const response = await apiClient.get("/products");
  return normalizeProductList(extractApiPayload(response));
}

export async function getProductById(productId) {
  const normalizedProductId = String(productId ?? "").trim();

  if (!normalizedProductId) {
    return null;
  }

  const response = await apiClient.get(`/products/${normalizedProductId}`);
  return extractApiPayload(response);
}

export async function getAdminProducts() {
  const response = await apiClient.get("/admin/products");
  return normalizeProductList(extractApiPayload(response));
}

export async function getProductsByVendorId() {
  const response = await apiClient.get("/vendor/products/me");
  return normalizeProductList(extractApiPayload(response));
}

export async function createVendorProduct(vendorUserOrPayload, maybePayload) {
  const payload =
    maybePayload && typeof maybePayload === "object"
      ? maybePayload
      : vendorUserOrPayload;
  const response = await apiClient.post(
    "/vendor/products",
    buildProductFormData(payload),
  );
  return extractApiPayload(response);
}

export async function updateProductById(productId, updates = {}) {
  const normalizedProductId = String(productId ?? "").trim();

  if (!normalizedProductId) {
    throw new Error("Không tìm thấy sản phẩm để cập nhật.");
  }

  const roles = getCurrentRoles();

  if (isStatusOnlyUpdate(updates)) {
    const route = roles.includes("admin")
      ? `/admin/products/${normalizedProductId}/status`
      : `/vendor/products/${normalizedProductId}/status`;
    const response = await apiClient.patch(route, {
      status: updates.status,
      reason: updates.reason,
    });
    return extractApiPayload(response);
  }

  const response = await apiClient.patch(
    `/vendor/products/${normalizedProductId}`,
    buildProductFormData(updates),
  );
  return extractApiPayload(response);
}

export async function deleteProductById(productId) {
  const normalizedProductId = String(productId ?? "").trim();

  if (!normalizedProductId) {
    throw new Error("Không tìm thấy sản phẩm để xóa.");
  }

  await apiClient.delete(`/vendor/products/${normalizedProductId}`);
  return { id: normalizedProductId };
}

export async function addProductReview(productId, review = {}) {
  const normalizedProductId = String(productId ?? "").trim();

  if (!normalizedProductId) {
    throw new Error("Missing product id.");
  }

  const response = await apiClient.post(`/products/${normalizedProductId}/reviews`, {
    customerName: String(review?.customerName ?? "").trim(),
    comment: String(review?.comment ?? "").trim(),
    stars: Math.min(5, Math.max(1, Number(review?.stars ?? 0))),
  });

  return extractApiPayload(response);
}

export async function upsertVendorReply(
  productId,
  {
    reviewCreatedAt,
    customerEmail,
    replyText,
  } = {},
) {
  const normalizedProductId = String(productId ?? "").trim();

  if (!normalizedProductId) {
    throw new Error("Missing product id.");
  }

  const response = await apiClient.patch(
    `/products/${normalizedProductId}/reviews/reply`,
    {
      reviewCreatedAt: String(reviewCreatedAt ?? "").trim(),
      customerEmail: String(customerEmail ?? "")
        .trim()
        .toLowerCase(),
      replyText: String(replyText ?? "").trim(),
    },
  );

  return extractApiPayload(response);
}
