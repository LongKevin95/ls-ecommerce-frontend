import {
  cancelMyOrder as cancelMyOrderService,
  createOrder as createOrderService,
  getAllOrders as getAllOrdersService,
  getOrdersByCustomerId as getOrdersByCustomerIdService,
  getVendorOrders as getVendorOrdersService,
  updateOrderStatus as updateOrderStatusService,
} from "../services/orderService";
import {
  getAdminProducts as getAdminProductsService,
  getProducts as getProductsService,
  getProductsByVendorId as getProductsByVendorIdService,
} from "../services/productService";
import { readAuthSession } from "../utils/authStorage";

const FINAL_STATUSES = new Set(["completed", "cancelled"]);

function normalizeText(value, fallback = "") {
  const nextValue = String(value ?? fallback).trim();
  return nextValue || fallback;
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function getCurrentRoles() {
  return Array.isArray(readAuthSession()?.user?.roles)
    ? readAuthSession().user.roles
    : [];
}

function buildProductById(products) {
  return new Map(
    (Array.isArray(products) ? products : []).map((product) => [
      normalizeText(product?.id ?? product?._id ?? ""),
      product,
    ]),
  );
}

function enrichOrderWithProducts(order, productById, fallbackItems = []) {
  const orderItems = Array.isArray(order?.items) ? order.items : [];
  const fallbackItemByProductId = new Map(
    (Array.isArray(fallbackItems) ? fallbackItems : []).map((item) => [
      normalizeText(item?.productId ?? item?.id ?? ""),
      item,
    ]),
  );

  const nextItems = orderItems.map((item) => {
    const productId = normalizeText(item?.productId ?? item?.id ?? "");
    const matchedProduct = productById.get(productId);
    const fallbackItem = fallbackItemByProductId.get(productId);

    return {
      ...matchedProduct,
      ...fallbackItem,
      ...item,
      productId,
      title:
        item?.title ??
        fallbackItem?.title ??
        matchedProduct?.title ??
        "Product",
      image:
        item?.image ??
        fallbackItem?.image ??
        matchedProduct?.image ??
        matchedProduct?.thumbnail ??
        "/favicon.svg",
      price: Number(
        item?.price ?? fallbackItem?.price ?? matchedProduct?.price ?? 0,
      ),
      vendorEmail: normalizeEmail(
        item?.vendorEmail ??
          fallbackItem?.vendorEmail ??
          matchedProduct?.vendorEmail ??
          "",
      ),
      shopName: normalizeText(
        item?.shopName ??
          fallbackItem?.shopName ??
          matchedProduct?.shopName ??
          "Shop",
        "Shop",
      ),
    };
  });

  return {
    ...order,
    items: nextItems,
  };
}

async function getProductsForOrderEnrichment(roles) {
  if (roles.includes("admin")) {
    return getAdminProductsService();
  }

  if (roles.includes("vendor")) {
    return getProductsByVendorIdService();
  }

  return getProductsService();
}

function normalizeOrderStatusValue(status) {
  const rawStatus = String(status ?? "pending")
    .trim()
    .toLowerCase();

  if (!rawStatus) {
    return "pending";
  }

  if (rawStatus === "delivery") {
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

function normalizePaymentMethod(method) {
  const rawMethod = String(method ?? "cod")
    .trim()
    .toLowerCase();

  if (rawMethod === "cash") {
    return "cod";
  }

  if (["cod", "card"].includes(rawMethod)) {
    return rawMethod;
  }

  return "cod";
}

function normalizeShippingAddress(address, order) {
  const source = address && typeof address === "object" ? address : {};
  const fallbackName = normalizeText(order?.customerName ?? order?.name ?? "");
  const firstName = normalizeText(order?.firstName ?? source?.firstName ?? "");
  const lastName = normalizeText(order?.lastName ?? source?.lastName ?? "");
  const derivedFullName = normalizeText(`${firstName} ${lastName}`.trim());
  const preferredFullName = source?.fullName ?? derivedFullName;
  const fullName = normalizeText(preferredFullName, fallbackName);

  return {
    fullName,
    phone: normalizeText(source?.phone ?? order?.phone ?? ""),
    address: normalizeText(source?.address ?? order?.address ?? ""),
    city: normalizeText(source?.city ?? order?.city ?? ""),
    state: normalizeText(source?.state ?? order?.state ?? ""),
    zipCode: normalizeText(source?.zipCode ?? order?.zipCode ?? ""),
    country: normalizeText(source?.country ?? order?.country ?? ""),
  };
}

function normalizeStatusHistoryEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  return {
    fromStatus:
      entry?.fromStatus === null || entry?.fromStatus === undefined
        ? null
        : normalizeOrderStatusValue(entry.fromStatus),
    toStatus: normalizeOrderStatusValue(
      entry?.toStatus ?? entry?.status ?? "pending",
    ),
    by: normalizeText(entry?.by ?? entry?.updatedBy ?? "system"),
    at: entry?.at ?? new Date().toISOString(),
  };
}

function buildInitialStatusHistory(order, status) {
  const createdAt = order?.createdAt ?? new Date().toISOString();
  return [
    {
      fromStatus: null,
      toStatus: status,
      by: normalizeText(order?.createdBy ?? order?.updatedBy ?? "customer"),
      at: createdAt,
    },
  ];
}

function normalizeStatusHistory(order, status) {
  const history = Array.isArray(order?.statusHistory)
    ? order.statusHistory
        .map((entry) => normalizeStatusHistoryEntry(entry))
        .filter(Boolean)
    : [];

  if (history.length > 0) {
    return history;
  }

  return buildInitialStatusHistory(order, status);
}

function _validateStatusTransition(currentStatus, nextStatus) {
  if (!nextStatus || currentStatus === nextStatus) {
    return;
  }

  if (FINAL_STATUSES.has(currentStatus)) {
    throw new Error("Order status is finalized and cannot be updated.");
  }

  const allowedTransitions = {
    pending: new Set(["processing", "cancelled"]),
    processing: new Set(["completed", "cancelled"]),
  };

  if (!allowedTransitions[currentStatus]?.has(nextStatus)) {
    throw new Error("Invalid order status transition.");
  }
}

function _appendStatusHistory(order, nextStatus, actor, updatedAt) {
  const currentStatus = normalizeOrderStatusValue(order?.status);

  if (!nextStatus || currentStatus === nextStatus) {
    return normalizeStatusHistory(order, currentStatus);
  }

  return [
    ...normalizeStatusHistory(order, currentStatus),
    {
      fromStatus: currentStatus,
      toStatus: nextStatus,
      by: normalizeText(actor ?? "system"),
      at: updatedAt,
    },
  ];
}

function normalizeOrder(order) {
  const items = Array.isArray(order?.items)
    ? order.items
    : Array.isArray(order?.vendorItems)
      ? order.vendorItems
      : [];
  const normalizedStatus = normalizeOrderStatusValue(order?.status);
  const shippingAddress = normalizeShippingAddress(
    order?.shippingAddress,
    order,
  );
  const customerName = normalizeText(
    order?.customerName ?? shippingAddress.fullName ?? "N/A",
    "N/A",
  );
  const customerEmail = normalizeEmail(
    order?.customerEmail ?? order?.userEmail ?? "",
  );
  const contactEmail = normalizeEmail(
    order?.contactEmail ?? order?.email ?? order?.shippingAddress?.email ?? "",
  );

  return {
    id: String(order?.id ?? order?._id ?? `o-${Date.now()}`),
    customerId: normalizeText(order?.customerId ?? ""),
    customerEmail,
    customerName,
    contactEmail,
    customerPhone: normalizeText(
      order?.customerPhone ?? shippingAddress.phone ?? "",
    ),
    status: normalizedStatus || "pending",
    items: items.map((item) => ({
      productId: normalizeText(item?.productId ?? item?.id ?? ""),
      variantId: normalizeText(item?.variantId ?? ""),
      variantLabel: normalizeText(item?.variantLabel ?? ""),
      title: normalizeText(item?.title ?? "Product", "Product"),
      image: normalizeText(item?.image ?? "/favicon.svg", "/favicon.svg"),
      quantity: Number(item?.quantity ?? 0),
      price: Number(item?.price ?? 0),
      vendorEmail: normalizeEmail(item?.vendorEmail ?? ""),
      shopName: normalizeText(item?.shopName ?? "Shop", "Shop"),
      sku: normalizeText(item?.sku ?? item?.productSku ?? ""),
      color: normalizeText(item?.color ?? "Default", "Default"),
      size: normalizeText(item?.size ?? "M", "M"),
    })),
    total: Number(order?.total ?? 0),
    paymentMethod: normalizePaymentMethod(order?.paymentMethod),
    shippingAddress,
    cancellation:
      order?.cancellation && typeof order.cancellation === "object"
        ? {
            by: normalizeText(order.cancellation?.by ?? "").toLowerCase(),
            reason: normalizeText(order.cancellation?.reason ?? ""),
            at: order.cancellation?.at ?? null,
          }
        : null,
    statusHistory: normalizeStatusHistory(order, normalizedStatus),
    createdAt: order?.createdAt ?? new Date().toISOString(),
    updatedAt: order?.updatedAt ?? order?.createdAt ?? new Date().toISOString(),
  };
}

export const getOrders = async () => {
  const roles = getCurrentRoles();
  const products = await getProductsForOrderEnrichment(roles).catch(() => []);
  const productById = buildProductById(products);

  if (roles.includes("admin")) {
    const orders = await getAllOrdersService();
    return orders.map((order) =>
      normalizeOrder(enrichOrderWithProducts(order, productById)),
    );
  }

  if (roles.includes("vendor")) {
    const orders = await getVendorOrdersService();
    return orders.map((order) =>
      normalizeOrder(enrichOrderWithProducts(order, productById)),
    );
  }

  if (roles.includes("customer")) {
    const orders = await getOrdersByCustomerIdService();
    return orders.map((order) =>
      normalizeOrder(enrichOrderWithProducts(order, productById)),
    );
  }

  return [];
};

export const createOrder = async (payload) => {
  const currentUser = readAuthSession()?.user;
  const products = await getProductsService().catch(() => []);
  const productById = buildProductById(products);
  const nextOrder = await createOrderService({
    customerId: currentUser?.id,
    shippingAddress: payload?.shippingAddress,
    paymentMethod: payload?.paymentMethod,
    items: Array.isArray(payload?.items)
      ? payload.items.map((item) => ({
          productId: String(item?.productId ?? "").trim(),
          variantId: String(item?.variantId ?? "").trim(),
          variantLabel: String(item?.variantLabel ?? "").trim(),
          title: String(item?.title ?? "Product").trim(),
          image: String(item?.image ?? "/favicon.svg").trim(),
          quantity: Number(item?.quantity ?? 1),
          price: Number(item?.price ?? 0),
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

  return normalizeOrder(
    enrichOrderWithProducts(nextOrder, productById, payload?.items),
  );
};

export const updateOrderById = async ({ id, updates, actor }) => {
  const normalizedStatus = normalizeOrderStatusValue(updates?.status);
  const normalizedActor = normalizeText(actor ?? "system").toLowerCase();

  if (!normalizedStatus) {
    throw new Error("Thiếu trạng thái đơn hàng để cập nhật.");
  }

  if (normalizedActor === "customer") {
    throw new Error(
      "Backend hiện chưa hỗ trợ khách hàng tự huỷ đơn từ giao diện này.",
    );
  }

  const nextOrder = await updateOrderStatusService(
    id,
    normalizedStatus,
    updates?.reason ?? updates?.cancellation?.reason,
  );
  return normalizeOrder({
    ...updates,
    ...nextOrder,
  });
};

export const cancelMyOrder = async ({ id, reason }) => {
  const normalizedOrderId = normalizeText(id);
  const normalizedReason = normalizeText(reason);

  if (!normalizedOrderId) {
    throw new Error("Missing order id.");
  }

  if (!normalizedReason) {
    throw new Error("Missing cancellation reason.");
  }

  const nextOrder = await cancelMyOrderService(
    normalizedOrderId,
    normalizedReason,
  );

  return normalizeOrder(nextOrder);
};
