import { useCallback, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import ProductCard from "../../components/ProductCard";
import {
  formatProductCategoryLabel,
  getProductById,
  upsertVendorReply,
} from "../../api/productApi";
import { useAdminProductsQuery } from "../../hooks/useAdminProductsQuery";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { useFlashSaleQuery } from "../../hooks/useFlashSaleQuery";
import { useProductsQuery } from "../../hooks/useProductsQuery";
import { useUsersQuery } from "../../hooks/useUsersQuery";
import { useWishlist } from "../../hooks/useWishlist";
import { resolveVariantPriceState } from "../../utils/flashSalePricing";
import { syncProductCaches } from "../../utils/productCache";
import "./ProductDetail.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const fallbackImage = "/favicon.svg";

function normalizeImageSource(value) {
  return String(value ?? "").trim();
}

function isValidImageSource(value) {
  const normalizedValue = normalizeImageSource(value);

  if (!normalizedValue) {
    return false;
  }

  if (!normalizedValue.startsWith("data:")) {
    return true;
  }

  const separatorIndex = normalizedValue.indexOf(",");

  if (separatorIndex < 0) {
    return false;
  }

  return (
    normalizeImageSource(normalizedValue.slice(separatorIndex + 1)).length > 0
  );
}

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

function normalizeOptionValue(value) {
  return String(value ?? "").trim();
}

function normalizeHexColorValue(value) {
  return String(value ?? "").trim();
}

function isValidHexColorValue(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalizeHexColorValue(value));
}

function getVariantColorHex(variant) {
  const colorHex = normalizeHexColorValue(variant?.attributes?.colorHex);
  return isValidHexColorValue(colorHex) ? colorHex : "";
}

function getVariantOptionValue(variant, key) {
  return normalizeOptionValue(variant?.optionValues?.[key]);
}

function variantMatchesSelections(variant, selections, ignoredKey = "") {
  return Object.entries(selections ?? {}).every(([key, value]) => {
    if (key === ignoredKey) {
      return true;
    }

    const normalizedValue = normalizeOptionValue(value);

    if (!normalizedValue) {
      return true;
    }

    return getVariantOptionValue(variant, key) === normalizedValue;
  });
}

function findBestMatchingVariant(
  variants,
  currentSelections,
  targetFieldKey,
  targetFieldValue,
) {
  const normalizedFieldKey = String(targetFieldKey ?? "").trim();
  const normalizedFieldValue = normalizeOptionValue(targetFieldValue);
  const variantList = Array.isArray(variants) ? variants : [];

  if (!normalizedFieldKey || !normalizedFieldValue || variantList.length === 0) {
    return null;
  }

  const nextSelections = {
    ...(currentSelections ?? {}),
    [normalizedFieldKey]: normalizedFieldValue,
  };

  return (
    variantList.find(
      (variant) =>
        Number(variant?.stock ?? 0) > 0 &&
        variantMatchesSelections(variant, nextSelections),
    ) ??
    variantList.find((variant) => variantMatchesSelections(variant, nextSelections)) ??
    variantList.find(
      (variant) =>
        Number(variant?.stock ?? 0) > 0 &&
        getVariantOptionValue(variant, normalizedFieldKey) === normalizedFieldValue,
    ) ??
    variantList.find(
      (variant) =>
        getVariantOptionValue(variant, normalizedFieldKey) === normalizedFieldValue,
    ) ??
    null
  );
}

function ProductDetail() {
  const { id } = useParams();
  const { user, isAdmin, isCustomer, isVendor } = useAuth();
  const { addToCart } = useCart();
  const { hasInWishlist, toggleWishlistItem } = useWishlist();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const canInspectHiddenProducts = isAdmin || isVendor;

  const { data: products = [], isLoading, isError } = useProductsQuery();
  const {
    data: adminProducts = [],
    isLoading: isAdminProductsLoading,
    isError: isAdminProductsError,
  } = useAdminProductsQuery({
    enabled: canInspectHiddenProducts,
  });
  const { data: users = [] } = useUsersQuery();
  const { data: flashSaleState } = useFlashSaleQuery();

  const userMapByEmail = useMemo(
    () =>
      new Map(
        users.map((item) => [
          String(item?.email ?? "")
            .trim()
            .toLowerCase(),
          item,
        ]),
      ),
    [users],
  );

  const withVendorDisplay = useCallback(
    (productItem) => {
      const vendorEmail = String(productItem?.vendorEmail ?? "")
        .trim()
        .toLowerCase();
      const vendorProfile = userMapByEmail.get(vendorEmail);

      if (!vendorProfile) {
        return productItem;
      }

      return {
        ...productItem,
        shopName:
          vendorProfile?.shopName ||
          vendorProfile?.name ||
          productItem?.shopName,
        vendorAvatarUrl:
          vendorProfile?.avatarUrl || productItem?.vendorAvatarUrl,
      };
    },
    [userMapByEmail],
  );

  const getReviewCustomerName = useCallback(
    (reviewItem) => {
      const reviewCustomerEmail = String(reviewItem?.customerEmail ?? "")
        .trim()
        .toLowerCase();
      const latestUserName = String(
        userMapByEmail.get(reviewCustomerEmail)?.name ?? "",
      ).trim();
      const storedCustomerName = String(reviewItem?.customerName ?? "").trim();

      return (
        latestUserName ||
        storedCustomerName ||
        reviewCustomerEmail ||
        "Customer"
      );
    },
    [userMapByEmail],
  );

  const [quantity, setQuantity] = useState(1);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockMessage, setStockMessage] = useState("");
  const [selectedColorByProduct, setSelectedColorByProduct] = useState({});
  const [selectedGalleryImageByProduct, setSelectedGalleryImageByProduct] =
    useState({});
  const [selectedVariantIdByProduct, setSelectedVariantIdByProduct] = useState(
    {},
  );
  const [selectedSizeByProduct, setSelectedSizeByProduct] = useState({});
  const [replyTextByReview, setReplyTextByReview] = useState({});
  const [processingReplyKey, setProcessingReplyKey] = useState("");
  const previewProduct = useMemo(() => {
    const locationProduct = location.state?.product;

    if (!locationProduct) {
      return null;
    }

    if (String(locationProduct?.id) !== String(id)) {
      return null;
    }

    return locationProduct;
  }, [id, location.state]);
  const resolvedProductFromLists = useMemo(() => {
    const matched =
      products.find((item) => String(item.id) === String(id)) ?? null;

    if (matched) {
      return withVendorDisplay(matched);
    }

    if (!canInspectHiddenProducts) {
      return null;
    }

    const adminMatched =
      adminProducts.find((item) => String(item.id) === String(id)) ?? null;

    if (!adminMatched) {
      return null;
    }

    if (isAdmin) {
      return withVendorDisplay(adminMatched);
    }

    const productVendorEmail = String(adminMatched?.vendorEmail ?? "")
      .trim()
      .toLowerCase();
    const currentUserEmail = String(user?.email ?? "")
      .trim()
      .toLowerCase();

    if (isVendor && productVendorEmail === currentUserEmail) {
      return withVendorDisplay(adminMatched);
    }

    return null;
  }, [
    adminProducts,
    canInspectHiddenProducts,
    id,
    isAdmin,
    isVendor,
    products,
    user?.email,
    withVendorDisplay,
  ]);
  const {
    data: detailProduct = null,
    isLoading: isDetailLoading,
    isError: isDetailError,
  } = useQuery({
    queryKey: ["products", "detail", String(id ?? "")],
    queryFn: () => getProductById(id),
    enabled: Boolean(id) && !(canInspectHiddenProducts && resolvedProductFromLists),
    staleTime: 1000 * 60 * 5,
  });

  const product = detailProduct ?? resolvedProductFromLists ?? previewProduct;
  const productVariants = useMemo(
    () => (Array.isArray(product?.variants) ? product.variants : []),
    [product?.variants],
  );
  const selectedVariantId =
    selectedVariantIdByProduct[id] ??
    product?.defaultVariantId ??
    product?.defaultVariant?.id ??
    productVariants[0]?.id ??
    "";
  const selectedVariant =
    productVariants.find((variant) => variant.id === selectedVariantId) ??
    product?.defaultVariant ??
    productVariants[0] ??
    null;
  const selectedVariantOptionValues = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(selectedVariant?.optionValues ?? {}).filter(
          ([key, value]) => normalizeOptionValue(key) && normalizeOptionValue(value),
        ),
      ),
    [selectedVariant],
  );
  const productAttributeEntries = buildFieldEntries(
    product?.categoryConfig?.productAttributeFields,
    product?.attributes,
  );
  const variantOptionGroups = useMemo(
    () =>
      (Array.isArray(product?.categoryConfig?.variantOptionFields)
        ? product.categoryConfig.variantOptionFields
        : []
      )
        .map((field) => {
          const values = [
            ...new Set(
              productVariants
                .map((variant) => getVariantOptionValue(variant, field.key))
                .filter(Boolean),
            ),
          ];

          return {
            ...field,
            values,
          };
        })
        .filter((field) => field.values.length > 0),
    [product?.categoryConfig?.variantOptionFields, productVariants],
  );

  const relatedProducts = useMemo(
    () =>
      products
        .filter((item) => String(item.id) !== String(id))
        .map((item) => withVendorDisplay(item))
        .slice(0, 4),
    [products, id, withVendorDisplay],
  );

  const selectedColor =
    selectedVariant?.optionValues?.color ??
    selectedColorByProduct[id] ??
    product?.colors?.[0] ??
    "Default";

  const selectedSize =
    selectedVariant?.optionValues?.size ??
    selectedSizeByProduct[id] ??
    product?.sizes?.[2] ??
    product?.sizes?.[0] ??
    "M";

  const galleryImages = useMemo(() => {
    if (!product) return [];

    const images = [
      selectedVariant?.image,
      product.image,
      ...(Array.isArray(product.images) ? product.images : []),
    ]
      .map(normalizeImageSource)
      .filter(isValidImageSource);

    const uniqueImages = [...new Set(images)];

    if (uniqueImages.length === 0) {
      return [fallbackImage];
    }

    return uniqueImages.slice(0, 4);
  }, [product, selectedVariant?.image]);

  const selectedGalleryImage =
    galleryImages.find(
      (image) => image === selectedGalleryImageByProduct[id],
    ) ??
    galleryImages[0] ??
    fallbackImage;

  const productColors = Array.isArray(product?.colors) ? product.colors : [];
  const productSizes = Array.isArray(product?.sizes) ? product.sizes : [];
  const activePriceState = useMemo(
    () => resolveVariantPriceState(selectedVariant, product, flashSaleState),
    [flashSaleState, product, selectedVariant],
  );
  const activePrice = Number(activePriceState.currentPrice ?? 0);
  const activeOldPrice = Number(activePriceState.currentOldPrice ?? 0);
  const activeDiscountPercentage = Number(
    activePriceState.currentDiscountPercentage ?? 0,
  );
  const activeStock = Number(selectedVariant?.stock ?? product?.stock ?? 0);
  const normalizedStatus = String(product?.status ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");
  const isOutOfStock = activeStock <= 0 || normalizedStatus === "out_of_stock";

  const isCustomerAccount = isCustomer && !isVendor;
  const canPurchase = isCustomerAccount;
  const isFashionProduct = ["fashion-nam", "fashion-nu"].includes(
    String(product?.category ?? "").trim().toLowerCase(),
  );
  const vendorShopLabel =
    product?.shopName ||
    product?.vendorName ||
    (product?.vendorEmail
      ? String(product.vendorEmail).split("@")[0]
      : "L&S Store");
  const normalizedUserEmail = String(user?.email ?? "")
    .trim()
    .toLowerCase();
  const normalizedUserId = String(user?.id ?? "").trim();
  const normalizedProductVendorEmail = String(product?.vendorEmail ?? "")
    .trim()
    .toLowerCase();
  const normalizedProductVendorId = String(product?.vendorId ?? "").trim();
  const isVendorOwnerOfProduct =
    isVendor &&
    ((normalizedUserId &&
      normalizedProductVendorId &&
      normalizedUserId === normalizedProductVendorId) ||
      (normalizedUserEmail &&
        normalizedProductVendorEmail &&
        normalizedUserEmail === normalizedProductVendorEmail));
  const isPurchaseDisabled = isOutOfStock || isAdmin || isVendorOwnerOfProduct;
  const isFavorite = hasInWishlist(product?.id);
  const isPrimaryProductLoading =
    !product &&
    (isDetailLoading ||
      isLoading ||
      (canInspectHiddenProducts && isAdminProductsLoading));
  const isPrimaryProductSettled =
    !isDetailLoading &&
    !isLoading &&
    (!canInspectHiddenProducts || !isAdminProductsLoading);
  const hasPrimaryProductError =
    isError || (canInspectHiddenProducts && isAdminProductsError);
  const shouldShowProductError =
    !product &&
    (hasPrimaryProductError || isDetailError) &&
    isPrimaryProductSettled;
  const shouldShowProductNotFound =
    !product && !shouldShowProductError && isPrimaryProductSettled;
  const areRelatedProductsLoading = isLoading && products.length === 0;
  const shouldShowReviewsLoading =
    Boolean(product) &&
    !Array.isArray(product?.reviewsData) &&
    (isLoading || (canInspectHiddenProducts && isAdminProductsLoading));
  const shouldShowProductInformation =
    productAttributeEntries.length > 0 && !isFashionProduct;

  const handleVariantOptionSelect = useCallback(
    (fieldKey, fieldValue) => {
      const normalizedFieldKey = String(fieldKey ?? "").trim();
      const normalizedFieldValue = normalizeOptionValue(fieldValue);

      if (!normalizedFieldKey || !normalizedFieldValue || productVariants.length === 0) {
        return;
      }

      const nextVariant =
        findBestMatchingVariant(
          productVariants,
          selectedVariantOptionValues,
          normalizedFieldKey,
          normalizedFieldValue,
        ) ??
        selectedVariant ??
        productVariants[0] ??
        null;

      if (!nextVariant?.id) {
        return;
      }

      setSelectedVariantIdByProduct((previous) => ({
        ...previous,
        [id]: nextVariant.id,
      }));
    },
    [id, productVariants, selectedVariant, selectedVariantOptionValues],
  );

  const requireCustomerAccess = () => {
    if (!user) {
      navigate("/login", { state: { from: location } });
      return false;
    }

    if (!canPurchase) {
      window.alert(
        "Chi tai khoan customer moi co the mua hang, them gio va wishlist.",
      );
      return false;
    }

    return true;
  };

  const handleAddToCart = () => {
    if (!requireCustomerAccess()) return;

    if (isOutOfStock) {
      window.alert("Sản phẩm hiện đang hết hàng.");
      return;
    }

    addToCart(product, quantity, {
      variantId: selectedVariant?.id,
      variantLabel: selectedVariant?.label,
      sku: selectedVariant?.sku,
      price: activePrice,
      color: selectedColor,
      size: selectedSize,
    });

    window.alert("Đã thêm vào giỏ hàng.");
  };

  const handleBuyNow = () => {
    if (!requireCustomerAccess()) return;

    if (isOutOfStock) {
      window.alert("Sản phẩm hiện đang hết hàng.");
      return;
    }

    addToCart(product, quantity, {
      variantId: selectedVariant?.id,
      variantLabel: selectedVariant?.label,
      sku: selectedVariant?.sku,
      price: activePrice,
      color: selectedColor,
      size: selectedSize,
    });

    navigate("/checkout");
  };

  const handleWishlist = async () => {
    if (!requireCustomerAccess()) return;

    try {
      const added = await toggleWishlistItem(product);
      window.alert(
        added ? "Đã thêm vào wishlist." : "Đã xóa khỏi wishlist.",
      );
    } catch (error) {
      window.alert(error?.message ?? "Khong the cap nhat wishlist.");
    }
  };

  const handleVendorReply = async (reviewItem) => {
    if (!isVendorOwnerOfProduct) {
      return;
    }

    const reviewKey = `${reviewItem?.customerEmail ?? ""}-${reviewItem?.createdAt ?? ""}`;
    const replyText = String(replyTextByReview[reviewKey] ?? "").trim();

    if (!replyText) {
      window.alert("Vui long nhap noi dung phan hoi.");
      return;
    }

    try {
      setProcessingReplyKey(reviewKey);

      const updatedProduct = await upsertVendorReply({
        productId: product.id,
        reviewCreatedAt: reviewItem.createdAt,
        customerEmail: reviewItem.customerEmail,
        vendorEmail: user?.email,
        replyText,
      });

      syncProductCaches(queryClient, updatedProduct);

      setReplyTextByReview((previous) => ({
        ...previous,
        [reviewKey]: "",
      }));

      await queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error) {
      window.alert(error?.message ?? "Khong the gui phan hoi.");
    } finally {
      setProcessingReplyKey("");
    }
  };

  return (
    <main className="product-detail-page o-container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Account</Link>
        <span>&gt;</span>
        <span>
          {product ? formatProductCategoryLabel(product.category) : "Product"}
        </span>
        <span>&gt;</span>
        <strong>{product?.title || "Product Detail"}</strong>
      </nav>

      {product ? (
        <>
          <section className="product-detail-layout">
            <div className="product-gallery">
              <div className="product-gallery__thumbs">
                {galleryImages.map((image, index) => (
                  <button
                    key={`thumb-${index}`}
                    type="button"
                    className={`product-gallery__thumb ${
                      selectedGalleryImage === image ? "is-active" : ""
                    }`}
                    onClick={() =>
                      setSelectedGalleryImageByProduct((previous) => ({
                        ...previous,
                        [id]: image,
                      }))
                    }
                    aria-pressed={selectedGalleryImage === image}
                  >
                    <img src={image} alt="" />
                  </button>
                ))}
              </div>

              <div className="product-gallery__main">
                <img src={selectedGalleryImage} alt={product.title} />
              </div>
            </div>

            <div className="product-info">
              <div className="product-info-card">
                <h1>{product.title}</h1>

                <div className="product-info__rating-row">
                  <span className="rating-stars">
                    {"★".repeat(Math.max(1, Math.round(product.rating || 0)))}
                  </span>
                  <span className="rating-count">
                    ({product.reviews || 0} Reviews)
                  </span>
                  <span className="rating-count">
                    Da ban {Number(product?.soldCount ?? 0)}
                  </span>
                  <span
                    className={`stock-state ${
                      isOutOfStock ? "stock-state--out" : "stock-state--in"
                    }`}
                  >
                    {isOutOfStock ? "Hết hàng" : "Còn hàng"}
                  </span>
                </div>

                {(isDetailLoading || isPrimaryProductLoading) && (
                  <p className="product-detail-helper">
                    Đang tải thông tin biến thể...
                  </p>
                )}

                <div className="product-info__price-line">
                  <div className="product-info__price">
                    {currency.format(activePrice)}
                  </div>

                    {activeDiscountPercentage > 0 && (
                      <span className="product-info__sale-badge">
                        {activePriceState.isFlashSaleActive ? "Flash Sale" : "Sale"} -
                      {activeDiscountPercentage}%
                    </span>
                  )}
                </div>

                {activeOldPrice > activePrice && (
                  <p className="product-info__old-price">
                    {currency.format(activeOldPrice)}
                  </p>
                )}

                <p className="product-info__description">
                  {product.description}
                </p>
                <p className="product-shop-label">Shop: {vendorShopLabel}</p>

                {shouldShowProductInformation && (
                  <div className="product-meta-card">
                    <h3>Product information</h3>
                    <div className="product-meta-list">
                      {productAttributeEntries.map((item) => (
                        <div className="product-meta-list__item" key={item.key}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {productVariants.length > 0 &&
                  variantOptionGroups.map((group) => {
                    const isColorGroup = group.key === "color";
                    const isSizeGroup = isFashionProduct && group.key === "size";
                    const groupLabel = String(
                      group.label ?? group.key ?? "Option",
                    ).trim();

                    return (
                      <div
                        className={`option-row ${
                          isColorGroup ? "option-row--colors" : "option-row--stacked"
                        }`}
                        key={group.key}
                      >
                        <h3>{groupLabel}:</h3>

                        {isColorGroup ? (
                          <div className="color-options">
                            {group.values.map((optionValue) => {
                              const isActive = selectedColor === optionValue;
                              const matchedVariant = findBestMatchingVariant(
                                productVariants,
                                selectedVariantOptionValues,
                                group.key,
                                optionValue,
                              );
                              const isAvailable = Boolean(matchedVariant);
                              const swatchColor = getVariantColorHex(matchedVariant);
                              const hasColorSwatch = Boolean(swatchColor);

                              return (
                                <button
                                  key={optionValue}
                                  type="button"
                                  className={hasColorSwatch
                                    ? `color-option ${isActive ? "is-active" : ""}`
                                    : `color-option-label ${isActive ? "is-active" : ""}`}
                                  style={
                                    hasColorSwatch
                                      ? { "--swatch-color": swatchColor }
                                      : undefined
                                  }
                                  onClick={() =>
                                    handleVariantOptionSelect(group.key, optionValue)
                                  }
                                  aria-pressed={isActive}
                                  disabled={!isAvailable}
                                  title={optionValue}
                                >
                                  {hasColorSwatch ? (
                                    <span className="sr-only">{optionValue}</span>
                                  ) : (
                                    optionValue
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div
                            className={
                              isSizeGroup
                                ? "size-options"
                                : "variant-option-buttons"
                            }
                          >
                            {group.values.map((optionValue) => {
                              const isActive =
                                selectedVariantOptionValues[group.key] === optionValue;
                              const matchedVariant = findBestMatchingVariant(
                                productVariants,
                                selectedVariantOptionValues,
                                group.key,
                                optionValue,
                              );
                              const isAvailable = Boolean(matchedVariant);

                              return (
                                <button
                                  key={optionValue}
                                  type="button"
                                  className={isActive ? "is-active" : ""}
                                  onClick={() =>
                                    handleVariantOptionSelect(group.key, optionValue)
                                  }
                                  aria-pressed={isActive}
                                  disabled={!isAvailable}
                                >
                                  {optionValue}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                {productVariants.length === 0 && productColors.length > 0 && (
                  <div className="option-row">
                    <h3>Colours:</h3>
                    <div className="color-options">
                      {productColors.map((colorValue) => (
                        <button
                          key={colorValue}
                          type="button"
                          className={`color-option ${
                            selectedColor === colorValue ? "is-active" : ""
                          }`}
                          style={{ "--swatch-color": colorValue }}
                          onClick={() =>
                            setSelectedColorByProduct((prevState) => ({
                              ...prevState,
                              [id]: colorValue,
                            }))
                          }
                          title={colorValue}
                        >
                          <span className="sr-only">{colorValue}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {productVariants.length === 0 && productSizes.length > 0 && (
                  <div className="option-row">
                    <h3>Size:</h3>
                    <div className="size-options">
                      {productSizes.map((size) => (
                        <button
                          key={size}
                          type="button"
                          className={selectedSize === size ? "is-active" : ""}
                          onClick={() =>
                            setSelectedSizeByProduct((prevState) => ({
                              ...prevState,
                              [id]: size,
                            }))
                          }
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="actions-row">
                  <div
                    className="quantity-box"
                    role="group"
                    aria-label="Quantity selector"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((value) => Math.max(1, value - 1))
                      }
                    >
                      -
                    </button>
                    <span>{quantity}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const currentStock = Number(
                          selectedVariant?.stock ?? product?.stock ?? 0,
                        );
                        if (quantity >= currentStock) {
                          setStockMessage(`Chỉ còn ${currentStock} sản phẩm.`);
                          setShowStockModal(true);
                        } else {
                          setQuantity((value) => value + 1);
                        }
                      }}
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    className="action-btn action-btn--primary"
                    disabled={isPurchaseDisabled}
                    onClick={handleBuyNow}
                  >
                    Mua ngay
                  </button>

                  <button
                    type="button"
                    className="action-btn action-btn--primary"
                    disabled={isPurchaseDisabled}
                    onClick={handleAddToCart}
                  >
                    Thêm vào giỏ
                  </button>

                  {isCustomerAccount ? (
                    <button
                      type="button"
                      className="action-btn action-btn--icon"
                      onClick={handleWishlist}
                    >
                      {isFavorite ? "Unfav" : "Fav"}
                    </button>
                  ) : isVendorOwnerOfProduct ? (
                    <Link
                      className="action-btn action-btn--primary action-btn--link"
                      to={`/vendor/products?edit=${product.id}`}
                    >
                      Sửa sản phẩm
                    </Link>
                  ) : null}
                </div>

                {!user && (
                  <p className="product-detail-helper">
                    Bạn có thể xem chi tiết trước. Hãy đăng nhập customer để mua
                    hàng, thêm vào giỏ hoặc lưu vào danh sách yêu thích.
                  </p>
                )}

                {user && !canPurchase && (
                  <p className="product-detail-helper product-detail-helper--warning">
                    Tai khoan{" "}
                    {(user.roles ?? []).join(", ") || "khong xac dinh"} khong co
                    quyen mua hang. Vendor chi duoc xem chi tiet va quan ly san
                    pham cua shop minh.
                  </p>
                )}

                <div className="delivery-box">
                  <div className="delivery-box__item">
                    <h4>Giao hàng</h4>
                    <p>Kiểm tra khu vực nhận hàng và thời gian giao dự kiến.</p>
                  </div>
                  <div className="delivery-box__item">
                    <h4>Đổi trả</h4>
                    <p>Hỗ trợ đổi trả theo chính sách của shop.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="product-reviews">
            <h3>Đánh giá từ khách hàng</h3>

            <div className="product-reviews__layout">
              <div className="product-reviews__list-wrap">
                {shouldShowReviewsLoading ? (
                  <div className="product-reviews__list">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <article
                        key={`review-skeleton-${index}`}
                        className="product-review-item"
                        aria-hidden="true"
                      >
                        <div className="product-detail-skeleton product-detail-skeleton--review-title" />
                        <div className="product-detail-skeleton product-detail-skeleton--review-line" />
                        <div className="product-detail-skeleton product-detail-skeleton--review-line product-detail-skeleton--review-line-short" />
                      </article>
                    ))}
                  </div>
                ) : Array.isArray(product?.reviewsData) &&
                  product.reviewsData.length > 0 ? (
                  <div className="product-reviews__list">
                    {product.reviewsData.map((reviewItem, index) => (
                      <article
                        key={`${reviewItem.customerEmail}-${reviewItem.createdAt}-${index}`}
                        className="product-review-item"
                      >
                        <header>
                          <strong>{getReviewCustomerName(reviewItem)}</strong>
                          <span>
                            {"★".repeat(Number(reviewItem.stars ?? 0))}
                          </span>
                        </header>
                        <p>{reviewItem.comment}</p>
                        {reviewItem?.vendorReply?.text && (
                          <div className="product-review-reply">
                            <strong>Phản hồi từ shop</strong>
                            <p>{reviewItem.vendorReply.text}</p>
                          </div>
                        )}

                        {isVendorOwnerOfProduct && (
                          <div className="product-review-reply-form">
                            <textarea
                              rows="2"
                              placeholder="Nhập phản hồi cho khách hàng..."
                              value={
                                replyTextByReview[
                                  `${reviewItem.customerEmail}-${reviewItem.createdAt}`
                                ] ?? ""
                              }
                              onChange={(event) =>
                                setReplyTextByReview((previous) => ({
                                  ...previous,
                                  [`${reviewItem.customerEmail}-${reviewItem.createdAt}`]:
                                    event.target.value,
                                }))
                              }
                            />
                            <button
                              type="button"
                              onClick={() => handleVendorReply(reviewItem)}
                              disabled={
                                processingReplyKey ===
                                `${reviewItem.customerEmail}-${reviewItem.createdAt}`
                              }
                            >
                              {processingReplyKey ===
                              `${reviewItem.customerEmail}-${reviewItem.createdAt}`
                                ? "Đang gửi..."
                                : "Gửi phản hồi"}
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="product-detail-helper">
                    Chua co danh gia nao cho san pham nay.
                  </p>
                )}
              </div>
            </div>
          </section>
        </>
      ) : isPrimaryProductLoading ? (
        <section className="product-detail-layout product-detail-layout--loading">
          <div className="product-gallery" aria-hidden="true">
            <div className="product-gallery__thumbs">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`thumb-skeleton-${index}`}
                  className="product-gallery__thumb product-gallery__thumb--skeleton product-detail-skeleton"
                />
              ))}
            </div>

            <div className="product-gallery__main product-gallery__main--skeleton product-detail-skeleton" />
          </div>

          <div className="product-info">
            <div
              className="product-info-card product-info-card--loading"
              aria-hidden="true"
            >
              <div className="product-info__loading">
                <div className="product-detail-skeleton product-detail-skeleton--title" />
                <div className="product-detail-skeleton product-detail-skeleton--meta" />
                <div className="product-detail-skeleton product-detail-skeleton--price" />
                <div className="product-detail-skeleton product-detail-skeleton--line" />
                <div className="product-detail-skeleton product-detail-skeleton--line" />
                <div className="product-detail-skeleton product-detail-skeleton--line product-detail-skeleton--line-short" />
                <div className="product-detail-skeleton product-detail-skeleton--actions" />
                <div className="product-detail-skeleton product-detail-skeleton--delivery" />
              </div>
            </div>
          </div>
        </section>
      ) : shouldShowProductError ? (
        <div className="product-detail-loader product-detail-loader--error">
          Unable to load product data.
        </div>
      ) : shouldShowProductNotFound ? (
        <div className="product-detail-loader">
          Product not found. Data source:
          /api/resources/ecommerce-products?apiKey=...
        </div>
      ) : null}

      <section className="related-section">
        <h2>Related Item</h2>

        {areRelatedProductsLoading ? (
          <div
            className="related-grid related-grid--loading"
            aria-hidden="true"
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`related-skeleton-${index}`}
                className="product-detail-card-skeleton"
              />
            ))}
          </div>
        ) : relatedProducts.length === 0 ? (
          <p className="related-section__empty">No related items yet.</p>
        ) : (
            <div className="related-grid">
              {relatedProducts.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  flashSaleState={flashSaleState}
                />
              ))}
            </div>
        )}
      </section>

      {showStockModal && (
        <div
          className="stock-modal-overlay"
          onClick={() => setShowStockModal(false)}
        >
          <div className="stock-modal" onClick={(e) => e.stopPropagation()}>
            <p>{stockMessage}</p>
            <button onClick={() => setShowStockModal(false)}>Đóng</button>
          </div>
        </div>
      )}
    </main>
  );
}

export default ProductDetail;
