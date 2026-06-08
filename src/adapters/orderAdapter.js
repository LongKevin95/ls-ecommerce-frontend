export function normalizeOrder(order) {
  return {
    id: String(order?.id ?? ""),
    customerId: String(order?.customerId ?? ""),
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
    total: Number(order?.total ?? 0),
    createdAt: order?.createdAt ?? null,
    updatedAt: order?.updatedAt ?? null,
  };
}
