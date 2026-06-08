function toNumber(value, fallback = 0) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function normalizeText(value, fallback = "") {
  const nextValue = String(value ?? fallback).trim();
  return nextValue || fallback;
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeId(value) {
  return normalizeText(value);
}

export function normalizeOrderStatus(status) {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return "pending";
  }

  if (normalized === "delivery") {
    return "completed";
  }

  return normalized;
}

export function extractOrderItems(order) {
  if (Array.isArray(order?.items)) {
    return order.items;
  }

  if (Array.isArray(order?.products)) {
    return order.products;
  }

  if (Array.isArray(order?.orderItems)) {
    return order.orderItems;
  }

  return [];
}

export function getItemProductId(item) {
  return String(
    item?.productId ??
      item?.id ??
      item?.product?.id ??
      item?.product?._id ??
      "",
  ).trim();
}

export function isProductOwnedByVendor(product, vendorEmail, vendorId = "") {
  const normalizedVendorEmail = normalizeEmail(vendorEmail);
  const normalizedVendorId = normalizeId(vendorId);
  const productVendorEmail = normalizeEmail(
    product?.vendorEmail ?? product?.shopEmail ?? "",
  );
  const productVendorId = normalizeId(
    product?.vendorId ?? product?.vendor?._id ?? "",
  );

  if (
    normalizedVendorId &&
    productVendorId &&
    productVendorId === normalizedVendorId
  ) {
    return true;
  }

  if (
    normalizedVendorEmail &&
    productVendorEmail &&
    productVendorEmail === normalizedVendorEmail
  ) {
    return true;
  }

  return false;
}

export function isItemOfVendor(item, vendorEmail, vendorProductIds) {
  const normalizedVendorEmail = normalizeEmail(vendorEmail);
  const itemVendorEmail = normalizeEmail(
    item?.vendorEmail ?? item?.shopEmail ?? "",
  );
  const productId = getItemProductId(item);

  if (
    normalizedVendorEmail &&
    itemVendorEmail &&
    itemVendorEmail === normalizedVendorEmail
  ) {
    return true;
  }

  return vendorProductIds.has(productId);
}

export function extractVendorOrderItems(order, vendorEmail, vendorProductIds) {
  return extractOrderItems(order).filter((item) =>
    isItemOfVendor(item, vendorEmail, vendorProductIds),
  );
}

export function resolveOrderTotal(order) {
  const directTotal = toNumber(
    order?.total ?? order?.totalAmount ?? order?.amount ?? order?.grandTotal,
    Number.NaN,
  );

  if (Number.isFinite(directTotal)) {
    return directTotal;
  }

  const items = extractOrderItems(order);

  return items.reduce((sum, item) => {
    const quantity = toNumber(item?.quantity, 0);
    const price = toNumber(item?.price ?? item?.unitPrice, 0);
    return sum + quantity * price;
  }, 0);
}

export function resolveVendorSubtotal(items) {
  return items.reduce((sum, item) => {
    const quantity = toNumber(item?.quantity, 0);
    const price = toNumber(item?.price ?? item?.unitPrice, 0);
    return sum + quantity * price;
  }, 0);
}

export function resolveOrderDate(order) {
  return (
    order?.createdAt ??
    order?.orderDate ??
    order?.date ??
    order?.updatedAt ??
    null
  );
}

export function resolveOrderCustomer(order) {
  const shippingAddress =
    order?.shippingAddress && typeof order.shippingAddress === "object"
      ? order.shippingAddress
      : {};

  return {
    name:
      order?.customerName ?? order?.name ?? shippingAddress?.fullName ?? "N/A",
    email:
      normalizeEmail(
        order?.contactEmail ??
          order?.customerEmail ??
          order?.email ??
          order?.userEmail ??
          order?.customer?.email ??
          "",
      ) || "N/A",
    phone: normalizeText(
      order?.customerPhone ?? shippingAddress?.phone ?? order?.phone ?? "",
      "N/A",
    ),
  };
}

export function resolvePaymentMethodLabel(method) {
  const normalized = normalizeText(method, "cod").toLowerCase();

  if (normalized === "card") {
    return "Card";
  }

  return "COD";
}

export function resolveAddressSummary(order) {
  const shippingAddress =
    order?.shippingAddress && typeof order.shippingAddress === "object"
      ? order.shippingAddress
      : {};
  const parts = [
    shippingAddress.address,
    shippingAddress.city,
    shippingAddress.state,
  ]
    .map((part) => normalizeText(part))
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "N/A";
}

export function resolveFullAddress(order) {
  const shippingAddress =
    order?.shippingAddress && typeof order.shippingAddress === "object"
      ? order.shippingAddress
      : {};
  const parts = [
    shippingAddress.address,
    shippingAddress.city,
    shippingAddress.state,
    shippingAddress.zipCode,
    shippingAddress.country,
  ]
    .map((part) => normalizeText(part))
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "N/A";
}

export function resolveUpdatedAt(order) {
  return order?.updatedAt ?? order?.createdAt ?? null;
}

export function resolveStatusHistory(order) {
  if (!Array.isArray(order?.statusHistory)) {
    return [];
  }

  return order.statusHistory
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      fromStatus:
        entry?.fromStatus === null || entry?.fromStatus === undefined
          ? null
          : normalizeOrderStatus(entry.fromStatus),
      toStatus: normalizeOrderStatus(
        entry?.toStatus ?? entry?.status ?? "pending",
      ),
      by: normalizeText(entry?.by ?? entry?.updatedBy ?? "system", "system"),
      at: entry?.at ?? null,
    }));
}

export function isOrderOfVendor({ order, vendorEmail, vendorProductIds }) {
  const normalizedVendorEmail = String(vendorEmail ?? "")
    .trim()
    .toLowerCase();
  const orderVendorEmail = String(
    order?.vendorEmail ?? order?.shopEmail ?? order?.storeEmail ?? "",
  )
    .trim()
    .toLowerCase();

  if (
    normalizedVendorEmail &&
    orderVendorEmail &&
    orderVendorEmail === normalizedVendorEmail
  ) {
    return true;
  }

  const items = extractOrderItems(order);

  return items.some((item) =>
    isItemOfVendor(item, normalizedVendorEmail, vendorProductIds),
  );
}
