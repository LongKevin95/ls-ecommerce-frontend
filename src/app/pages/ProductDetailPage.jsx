import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getProductById } from "../../api/productApi";
import { formatCurrency } from "../../utils/formatters";
import { notifySuccess } from "../../utils/notify";
import { useCart } from "../hooks/useCart";
import { useProductsQuery } from "../hooks/useProductsQuery";
import { useWishlist } from "../hooks/useWishlist";

function buildFieldEntries(fields, values) {
  return Array.isArray(fields)
    ? fields
        .map((field) => ({
          key: String(field?.key ?? "").trim(),
          label: String(field?.label ?? field?.key ?? "").trim(),
          value: String(values?.[field?.key] ?? "").trim(),
        }))
        .filter((item) => item.key && item.value)
    : [];
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const { data: products = [] } = useProductsQuery();
  const { addToCart } = useCart();
  const { hasInWishlist, toggleWishlist } = useWishlist();
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const { data: detailProduct = null } = useQuery({
    queryKey: ["products", "detail", String(id ?? "")],
    queryFn: () => getProductById(id),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
  });

  const product = useMemo(
    () =>
      detailProduct ??
      products.find((item) => item.id === String(id ?? "").trim()) ??
      null,
    [detailProduct, id, products],
  );
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const activeVariant =
    variants.find((variant) => variant.id === selectedVariantId) ??
    product?.defaultVariant ??
    variants[0] ??
    null;
  const productAttributeEntries = buildFieldEntries(
    product?.categoryConfig?.productAttributeFields,
    product?.attributes,
  );
  const variantEntries = buildFieldEntries(
    product?.categoryConfig?.variantOptionFields,
    activeVariant?.optionValues,
  );
  const activePrice = Number(activeVariant?.price ?? product?.price ?? 0);
  const activeStock = Number(activeVariant?.stock ?? product?.stock ?? 0);

  if (!product) {
    return (
      <section className="clean-container clean-page">
        <div className="clean-empty">
          <p>Không tìm thấy sản phẩm.</p>
          <Link to="/" className="clean-link-btn">
            Back home
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="clean-container clean-page">
      <div className="clean-checkout-layout">
        <div className="clean-panel">
          <img
            src={product.thumbnail}
            alt={product.title}
            className="clean-card__media"
          />
        </div>
        <div className="clean-panel clean-page">
          <p className="clean-badge">
            {product.categoryName || product.category}
          </p>
          <h1>{product.title}</h1>
          <p className="clean-muted">{product.description}</p>
          <strong>{formatCurrency(activePrice)}</strong>
          <p>Stock: {activeStock}</p>
          {productAttributeEntries.map((item) => (
            <p key={item.key}>
              <strong>{item.label}:</strong> {item.value}
            </p>
          ))}
          {variants.length > 0 && (
            <div className="clean-stack">
              {variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  className="clean-button clean-button--ghost"
                  onClick={() => setSelectedVariantId(variant.id)}
                >
                  {variant.label} - {formatCurrency(variant.price)}
                </button>
              ))}
              {variantEntries.map((item) => (
                <p key={item.key}>
                  <strong>{item.label}:</strong> {item.value}
                </p>
              ))}
            </div>
          )}
          <div className="clean-card__actions">
            <button
              type="button"
              className="clean-button"
              onClick={() => {
                addToCart(product.id, 1, {
                  variantId: activeVariant?.id,
                  variantLabel: activeVariant?.label,
                  color: activeVariant?.optionValues?.color ?? "Default",
                  size: activeVariant?.optionValues?.size ?? "Default",
                });
                notifySuccess("Đã thêm vào giỏ hàng.");
              }}
            >
              Add to cart
            </button>
            <button
              type="button"
              className="clean-button clean-button--ghost"
              onClick={() => {
                const added = toggleWishlist(product.id);
                notifySuccess(
                  added ? "Đã thêm vào wishlist." : "Đã xóa khỏi wishlist.",
                );
              }}
            >
              {hasInWishlist(product.id) ? "Unsave" : "Wishlist"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
