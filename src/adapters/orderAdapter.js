function normalizePaymentMethod(value) {
  const nextValue = String(value ?? "cod")
    .trim()
    .toLowerCase();

  if (nextValue === "cash") {
    return "cod";
  }

  if (nextValue === "card") {
    return "sepay";
  }

  return nextValue || "cod";
}

function normalizePaymentStatus(value, paymentMethod) {
  const nextValue = String(value ?? "")
    .trim()
    .toLowerCase();

  if (nextValue) {
    return nextValue;
  }

  return paymentMethod === "sepay" ? "pending" : "unpaid";
}

export function normalizeOrder(order) {
  const paymentMethod = normalizePaymentMethod(order?.paymentMethod);

  return {
    id: String(order?.id ?? ""),
    customerId: String(order?.customerId ?? ""),
    customerEmail: String(order?.customerEmail ?? "")
      .trim()
      .toLowerCase(),
    customerName: String(order?.customerName ?? "").trim(),
    contactEmail: String(order?.contactEmail ?? "")
      .trim()
      .toLowerCase(),
    customerPhone: String(order?.customerPhone ?? "").trim(),
    status: String(order?.status ?? "pending")
      .trim()
      .toLowerCase(),
    paymentMethod,
    paymentProvider: String(order?.paymentProvider ?? "manual")
      .trim()
      .toLowerCase(),
    paymentStatus: normalizePaymentStatus(order?.paymentStatus, paymentMethod),
    paymentCode: String(order?.paymentCode ?? "").trim(),
    paymentInvoiceNumber: String(order?.paymentInvoiceNumber ?? "").trim(),
    paymentExpiresAt: order?.paymentExpiresAt ?? null,
    paidAt: order?.paidAt ?? null,
    paymentMeta:
      order?.paymentMeta && typeof order.paymentMeta === "object"
        ? {
            sepayOrderId: String(order.paymentMeta?.sepayOrderId ?? "").trim(),
            sepayTransactionId: String(
              order.paymentMeta?.sepayTransactionId ?? "",
            ).trim(),
            providerTransactionId: String(
              order.paymentMeta?.providerTransactionId ?? "",
            ).trim(),
            providerStatus: String(order.paymentMeta?.providerStatus ?? "").trim(),
            gateway: String(order.paymentMeta?.gateway ?? "").trim(),
            referenceCode: String(order.paymentMeta?.referenceCode ?? "").trim(),
            paymentChannel: String(order.paymentMeta?.paymentChannel ?? "").trim(),
            cardBrand: String(order.paymentMeta?.cardBrand ?? "").trim(),
            cardNumberMasked: String(
              order.paymentMeta?.cardNumberMasked ?? "",
            ).trim(),
            lastWebhookAt: order.paymentMeta?.lastWebhookAt ?? null,
          }
        : null,
    shippingAddress: {
      fullName: String(order?.shippingAddress?.fullName ?? "").trim(),
      phone: String(order?.shippingAddress?.phone ?? "").trim(),
      address: String(order?.shippingAddress?.address ?? "").trim(),
      city: String(order?.shippingAddress?.city ?? "").trim(),
      state: String(order?.shippingAddress?.state ?? "").trim(),
      zipCode: String(order?.shippingAddress?.zipCode ?? "").trim(),
      country: String(order?.shippingAddress?.country ?? "").trim(),
    },
    items: Array.isArray(order?.items)
      ? order.items.map((item) => ({
          productId: String(item?.productId ?? ""),
          variantId: String(item?.variantId ?? ""),
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
    cancellation:
      order?.cancellation && typeof order.cancellation === "object"
        ? {
            by: String(order.cancellation?.by ?? "").trim().toLowerCase(),
            reason: String(order.cancellation?.reason ?? "").trim(),
            at: order.cancellation?.at ?? null,
          }
        : null,
    statusHistory: Array.isArray(order?.statusHistory)
      ? order.statusHistory.map((entry) => ({
          fromStatus:
            entry?.fromStatus === null || entry?.fromStatus === undefined
              ? null
              : String(entry.fromStatus).trim().toLowerCase(),
          toStatus: String(entry?.toStatus ?? entry?.status ?? "pending")
            .trim()
            .toLowerCase(),
          by: String(entry?.by ?? entry?.updatedBy ?? "system")
            .trim()
            .toLowerCase(),
          at: entry?.at ?? null,
        }))
      : [],
    total: Number(order?.total ?? 0),
    createdAt: order?.createdAt ?? null,
    updatedAt: order?.updatedAt ?? null,
  };
}
