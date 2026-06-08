export function normalizeProduct(product) {
  return {
    id: String(product?.id ?? ""),
    title: String(product?.title ?? "Product").trim(),
    slug: String(product?.slug ?? "").trim(),
    category: String(product?.category ?? "others").trim().toLowerCase(),
    description: String(product?.description ?? "").trim(),
    price: Number(product?.price ?? 0),
    oldPrice: Number(product?.oldPrice ?? 0),
    stock: Number(product?.stock ?? 0),
    thumbnail: String(product?.thumbnail ?? product?.image ?? "").trim(),
    gallery: Array.isArray(product?.gallery)
      ? product.gallery
      : Array.isArray(product?.images)
        ? product.images
        : [],
    status: String(product?.status ?? "draft").trim().toLowerCase(),
    vendorId: String(product?.vendorId ?? ""),
    shopId: String(product?.shopId ?? ""),
    shopName: String(product?.shopName ?? "").trim(),
    createdAt: product?.createdAt ?? null,
    updatedAt: product?.updatedAt ?? null,
  };
}
