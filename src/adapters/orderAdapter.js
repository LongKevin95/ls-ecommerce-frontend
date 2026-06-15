export function normalizeOrder(order) {
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
    paymentMethod: String(order?.paymentMethod ?? "cod")
      .trim()
      .toLowerCase(),
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
