import { fetchResourceDocument, updateResourceData } from "./resourceApi";
import { syncShopsFromProducts } from "./shopsApi";
import {
  createVendorProduct as createVendorProductService,
  deleteProductById as deleteProductByIdService,
  getAdminProducts as getAdminProductsService,
  getProductById as getProductByIdService,
  getProducts as getProductsService,
  getProductsByVendorId as getProductsByVendorIdService,
  updateProductById as updateProductByIdService,
} from "../services/productService";
import { readAuthSession } from "../utils/authStorage";

const PRODUCTS_RESOURCE_NAME = "ecommerce-data";

export const PRODUCT_STATUS = {
  ACTIVE: "active",
  DRAFT: "draft",
  PENDING: "pending",
  INACTIVE: "inactive",
  REJECTED: "rejected",
  OUT_OF_STOCK: "out_of_stock",
  BANNED: "banned",
};

export const PRODUCT_CATEGORIES = [
  "fashion-nam",
  "fashion-nu",
  "do-gia-dung",
  "dien-tu",
  "thuc-pham",
  "others",
];

export const PRODUCT_CATEGORY_LABELS = {
  "fashion-nam": "Men Fashion",
  "fashion-nu": "Women Fashion",
  "do-gia-dung": "Home",
  "dien-tu": "Electronics",
  "thuc-pham": "Food",
  others: "Others",
};

const PIKACHU_PRODUCT_TITLE = "gau bong pikachu";

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("đ", "d")
    .replaceAll("Đ", "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeCategory(category) {
  const normalizedValue = String(category ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replace(/\s+/g, "-");

  if (PRODUCT_CATEGORIES.includes(normalizedValue)) {
    return normalizedValue;
  }

  const mapper = {
    electronics: "dien-tu",
    home: "do-gia-dung",
    food: "thuc-pham",
    other: "others",
    others: "others",
    misc: "others",
    miscellaneous: "others",
    khac: "others",
    fashion: "fashion-nam",
    "fashion-men": "fashion-nam",
    "men-fashion": "fashion-nam",
    "fashion-women": "fashion-nu",
    "women-fashion": "fashion-nu",
  };

  return mapper[normalizedValue] ?? "fashion-nam";
}

export function formatProductCategoryLabel(category) {
  const normalizedCategory = normalizeCategory(category);
  return PRODUCT_CATEGORY_LABELS[normalizedCategory] ?? normalizedCategory;
}

function normalizeStatus(status) {
  const normalizedStatus = String(status ?? "")
    .trim()
    .toLowerCase();

  if (normalizedStatus === PRODUCT_STATUS.BANNED) {
    return PRODUCT_STATUS.REJECTED;
  }

  if (Object.values(PRODUCT_STATUS).includes(normalizedStatus)) {
    return normalizedStatus;
  }

  return PRODUCT_STATUS.PENDING;
}

function readCurrentUser() {
  return readAuthSession()?.user ?? null;
}

function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeObjectValues(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((result, [key, itemValue]) => {
    const normalizedKey = String(key ?? "").trim();
    const normalizedValue = String(itemValue ?? "").trim();

    if (normalizedKey && normalizedValue) {
      result[normalizedKey] = normalizedValue;
    }

    return result;
  }, {});
}

function normalizeFieldDefinitions(fields) {
  return Array.isArray(fields)
    ? fields
        .map((field) => ({
          key: String(field?.key ?? "").trim(),
          label: String(field?.label ?? field?.key ?? "").trim(),
          inputType: String(field?.inputType ?? "text").trim() || "text",
        }))
        .filter((field) => field.key)
    : [];
}

function normalizeCategoryConfig(config, fallbackCategory) {
  const category = normalizeCategory(config?.slug ?? fallbackCategory);

  return {
    id: String(config?.id ?? config?._id ?? "").trim(),
    slug: category,
    name:
      String(config?.name ?? formatProductCategoryLabel(category)).trim() ||
      formatProductCategoryLabel(category),
    productAttributeFields: normalizeFieldDefinitions(
      config?.productAttributeFields,
    ),
    variantOptionFields: normalizeFieldDefinitions(config?.variantOptionFields),
    variantAttributeFields: normalizeFieldDefinitions(
      config?.variantAttributeFields,
    ),
  };
}

function buildVariantLabel(variant, categoryConfig) {
  const optionValues = normalizeObjectValues(variant?.optionValues);
  const orderedOptionLabels = (categoryConfig?.variantOptionFields ?? [])
    .map((field) => optionValues[field.key])
    .filter(Boolean);

  if (orderedOptionLabels.length > 0) {
    return orderedOptionLabels.join(" / ");
  }

  return String(variant?.label ?? variant?.title ?? "Default variant").trim();
}

function normalizeVariant(variant, categoryConfig) {
  const optionValues = normalizeObjectValues(variant?.optionValues);
  const attributes = normalizeObjectValues(variant?.attributes);

  return {
    ...variant,
    id: String(variant?.id ?? variant?._id ?? "").trim(),
    sku: String(variant?.sku ?? "").trim(),
    title: String(variant?.title ?? "").trim(),
    label: buildVariantLabel(variant, categoryConfig),
    price: Number(variant?.price ?? 0),
    oldPrice: Number(variant?.oldPrice ?? 0),
    stock: Math.max(0, Number(variant?.stock ?? 0)),
    image: String(variant?.image ?? "").trim(),
    optionValues,
    attributes,
    isDefault: Boolean(variant?.isDefault),
    sortOrder: Number(variant?.sortOrder ?? 0),
  };
}

function buildProductImageList(product, thumbnail) {
  const images = Array.isArray(product?.images)
    ? product.images
    : Array.isArray(product?.gallery)
      ? product.gallery
      : [];
  const normalizedImages = images
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);

  if (thumbnail && !normalizedImages.includes(thumbnail)) {
    return [thumbnail, ...normalizedImages];
  }

  return normalizedImages;
}

function deriveVendorEmail(product) {
  const explicitVendorEmail = normalizeEmail(
    product?.vendorEmail ?? product?.shopEmail,
  );

  if (explicitVendorEmail) {
    return explicitVendorEmail;
  }

  const currentUser = readCurrentUser();
  const currentUserId = String(currentUser?.id ?? "").trim();
  const productVendorId = String(
    product?.vendorId ?? product?.vendor?._id ?? "",
  ).trim();

  if (
    currentUser?.email &&
    currentUserId &&
    productVendorId === currentUserId
  ) {
    return normalizeEmail(currentUser.email);
  }

  return "";
}

function resolveProductsSnapshot(dataItem) {
  if (Array.isArray(dataItem?.products)) {
    return {
      payload: dataItem,
      products: dataItem.products,
      dataId: dataItem?._id ?? null,
    };
  }

  const nestedList = Array.isArray(dataItem?.data) ? dataItem.data : [];
  const nestedItem = nestedList.find((item) => Array.isArray(item?.products));

  if (!nestedItem) {
    return null;
  }

  return {
    payload: nestedItem,
    products: nestedItem.products,
    dataId: dataItem?._id ?? null,
  };
}

async function fetchProductsSnapshot() {
  const document = await fetchResourceDocument(PRODUCTS_RESOURCE_NAME);
  const dataList = Array.isArray(document?.data) ? document.data : [];

  for (let index = dataList.length - 1; index >= 0; index -= 1) {
    const snapshot = resolveProductsSnapshot(dataList[index]);

    if (snapshot) {
      return snapshot;
    }
  }

  return {
    products: [],
    dataId: null,
  };
}

function normalizeProduct(product) {
  const reviewsData = Array.isArray(product?.reviewsData)
    ? product.reviewsData
        .map((item) => ({
          customerEmail: String(item?.customerEmail ?? "")
            .trim()
            .toLowerCase(),
          customerName: String(item?.customerName ?? "Customer"),
          comment: String(item?.comment ?? "").trim(),
          stars: Math.min(5, Math.max(1, Number(item?.stars ?? 0))),
          createdAt: item?.createdAt ?? new Date().toISOString(),
          vendorReply:
            item?.vendorReply && typeof item.vendorReply === "object"
              ? {
                  text: String(item.vendorReply?.text ?? "").trim(),
                  at: item.vendorReply?.at ?? null,
                }
              : null,
        }))
        .filter((item) => item.customerEmail && item.stars > 0)
    : [];

  const averageRating =
    reviewsData.length > 0
      ? reviewsData.reduce((sum, item) => sum + item.stars, 0) /
        reviewsData.length
      : Number(product?.rating ?? 0);

  const stock = Number(product?.stock ?? 0);
  const normalizedStatus = normalizeStatus(product?.status);
  const resolvedCategory = normalizeCategory(product?.category);
  const normalizedTitle = normalizeSearchText(product?.title);
  const resolvedSpecialCategory =
    normalizedTitle === PIKACHU_PRODUCT_TITLE ? "others" : resolvedCategory;
  const categoryConfig = normalizeCategoryConfig(
    product?.categoryConfig,
    resolvedSpecialCategory,
  );
  const variants = Array.isArray(product?.variants)
    ? product.variants.map((variant) =>
        normalizeVariant(variant, categoryConfig),
      )
    : [];
  const defaultVariant =
    variants.find((variant) => variant.isDefault) ?? variants[0] ?? null;
  const thumbnail = String(
    product?.thumbnail ??
      product?.image ??
      defaultVariant?.image ??
      product?.gallery?.[0] ??
      product?.images?.[0] ??
      "",
  ).trim();
  const images = buildProductImageList(product, thumbnail);
  const vendorEmail = deriveVendorEmail(product);
  const oldPrice =
    variants.length > 0
      ? Math.max(
          ...variants.map((variant) => Number(variant?.oldPrice ?? 0)),
          0,
        )
      : Number(product?.oldPrice ?? 0);
  const price =
    variants.length > 0
      ? Math.min(...variants.map((variant) => Number(variant?.price ?? 0)))
      : Number(product?.price ?? 0);
  const derivedColors = [
    ...new Set(
      variants
        .map((variant) => String(variant?.optionValues?.color ?? "").trim())
        .filter(Boolean),
    ),
  ];
  const derivedSizes = [
    ...new Set(
      variants
        .map((variant) => String(variant?.optionValues?.size ?? "").trim())
        .filter(Boolean),
    ),
  ];
  const resolvedStock =
    variants.length > 0
      ? variants.reduce((sum, variant) => sum + Number(variant?.stock ?? 0), 0)
      : stock;
  const discountPercentage =
    oldPrice > price && oldPrice > 0
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : Number(product?.discountPercentage ?? 0);

  const normalizedProduct = {
    ...product,
    id: String(product?.id ?? product?._id ?? "").trim(),
    category: resolvedSpecialCategory,
    vendorId: String(product?.vendorId ?? product?.vendor?._id ?? "").trim(),
    shopId: String(product?.shopId ?? product?.shop?._id ?? "").trim(),
    vendorEmail,
    shopName:
      product?.shopName ||
      product?.shop?.name ||
      (vendorEmail ? String(vendorEmail).split("@")[0] : "L&S Store"),
    image: thumbnail,
    thumbnail,
    images,
    gallery: images,
    colors:
      derivedColors.length > 0
        ? derivedColors
        : Array.isArray(product?.colors)
          ? product.colors
          : [],
    sizes:
      derivedSizes.length > 0
        ? derivedSizes
        : Array.isArray(product?.sizes)
          ? product.sizes
          : [],
    attributes:
      product?.attributes && typeof product.attributes === "object"
        ? product.attributes
        : {},
    categoryName: String(
      product?.categoryName ?? categoryConfig?.name ?? "",
    ).trim(),
    categoryConfig,
    variants,
    defaultVariant,
    defaultVariantId: String(
      product?.defaultVariantId ?? defaultVariant?.id ?? "",
    ).trim(),
    variantCount: Number(product?.variantCount ?? variants.length),
    rating: Number(averageRating.toFixed(1)),
    reviews: reviewsData.length,
    reviewsData,
    stock: resolvedStock <= 0 ? 0 : resolvedStock,
    price,
    oldPrice,
    discountPercentage,
  };

  if (resolvedStock <= 0) {
    if (
      [
        PRODUCT_STATUS.PENDING,
        PRODUCT_STATUS.INACTIVE,
        PRODUCT_STATUS.REJECTED,
      ].includes(normalizedStatus)
    ) {
      return {
        ...normalizedProduct,
        status: normalizedStatus,
      };
    }

    return {
      ...normalizedProduct,
      status: PRODUCT_STATUS.OUT_OF_STOCK,
    };
  }

  return {
    ...normalizedProduct,
    status: normalizedStatus,
  };
}

function _hasShopAggregationImpact(currentProduct, nextProduct) {
  const currentVendorEmail = String(currentProduct?.vendorEmail ?? "")
    .trim()
    .toLowerCase();
  const nextVendorEmail = String(nextProduct?.vendorEmail ?? "")
    .trim()
    .toLowerCase();
  const currentCategory = String(currentProduct?.category ?? "")
    .trim()
    .toLowerCase();
  const nextCategory = String(nextProduct?.category ?? "")
    .trim()
    .toLowerCase();
  const currentShopName = String(currentProduct?.shopName ?? "").trim();
  const nextShopName = String(nextProduct?.shopName ?? "").trim();
  const currentStock = Number(currentProduct?.stock ?? 0);
  const nextStock = Number(nextProduct?.stock ?? 0);

  return (
    currentVendorEmail !== nextVendorEmail ||
    currentCategory !== nextCategory ||
    currentShopName !== nextShopName ||
    currentStock !== nextStock
  );
}

async function writeProductsSnapshot(
  snapshot,
  nextProducts,
  { syncShops = true } = {},
) {
  const { payload, dataId } = snapshot;

  await updateResourceData({
    resourceName: PRODUCTS_RESOURCE_NAME,
    dataId,
    payload: {
      ...(payload ?? {}),
      products: nextProducts,
    },
  });

  if (syncShops) {
    void syncShopsFromProducts(nextProducts).catch(() => null);
  }
}

async function persistProducts(nextProducts, snapshot, options) {
  const resolvedSnapshot = snapshot ?? (await fetchProductsSnapshot());
  await writeProductsSnapshot(resolvedSnapshot, nextProducts, options);
}

export const getAllProducts = async () => {
  const roles = Array.isArray(readCurrentUser()?.roles)
    ? readCurrentUser().roles
    : [];

  if (roles.includes("admin")) {
    const products = await getAdminProductsService();
    return products.map(normalizeProduct);
  }

  if (roles.includes("vendor")) {
    const products = await getProductsByVendorIdService();
    return products.map(normalizeProduct);
  }

  const products = await getProductsService();
  return products.map(normalizeProduct);
};

export const getProducts = async () => {
  const products = await getProductsService();
  return products.map(normalizeProduct);
};

export const getProductById = async (productId) => {
  const product = await getProductByIdService(productId);
  return product ? normalizeProduct(product) : null;
};

export const createProduct = async (payload) => {
  const nextProduct = await createVendorProductService(payload);
  return normalizeProduct({
    ...payload,
    ...nextProduct,
  });
};

export const updateProductById = async ({ id, updates }) => {
  const nextProduct = await updateProductByIdService(id, updates);
  return normalizeProduct({
    ...updates,
    ...nextProduct,
  });
};

export const deductProductStocksForCheckout = async ({ items }) => {
  const cartItems = Array.isArray(items) ? items : [];

  if (cartItems.length === 0) {
    throw new Error("Cart is empty.");
  }

  const products = await getProducts();
  const productById = new Map(
    products.map((product) => [String(product?.id ?? "").trim(), product]),
  );

  cartItems.forEach((item) => {
    const productId = String(item?.productId ?? item?.id ?? "").trim();
    const quantityToDeduct = Number(item?.quantity ?? 0);

    if (!productId || quantityToDeduct <= 0) {
      throw new Error("Dữ liệu giỏ hàng không hợp lệ. Vui lòng thử lại.");
    }

    const currentProduct = productById.get(productId);

    if (!currentProduct) {
      throw new Error(
        `Không tìm thấy sản phẩm với mã ${productId}. Vui lòng thử lại.`,
      );
    }

    if (Number(currentProduct?.stock ?? 0) < quantityToDeduct) {
      throw new Error(
        `Sản phẩm ${currentProduct.title || productId} không đủ tồn kho.`,
      );
    }
  });

  return products;
};

export const removeProductById = async (id) => {
  await deleteProductByIdService(id);
};

export const addProductReview = async ({ productId, review }) => {
  const normalizedProductId = String(productId ?? "").trim();

  if (!normalizedProductId) {
    throw new Error("Missing product id.");
  }

  const normalizedReview = {
    customerEmail: String(review?.customerEmail ?? "")
      .trim()
      .toLowerCase(),
    customerName:
      String(review?.customerName ?? "Customer").trim() || "Customer",
    comment: String(review?.comment ?? "").trim(),
    stars: Math.min(5, Math.max(1, Number(review?.stars ?? 0))),
    createdAt: new Date().toISOString(),
  };

  if (!normalizedReview.customerEmail || !normalizedReview.comment) {
    throw new Error("Review is missing required fields.");
  }

  const snapshot = await fetchProductsSnapshot();
  const { products } = snapshot;
  let updatedProduct = null;

  const nextProducts = products.map((product) => {
    if (String(product?.id) !== normalizedProductId) {
      return product;
    }

    const previousReviews = Array.isArray(product?.reviewsData)
      ? product.reviewsData
      : [];

    const existedReview = previousReviews.some(
      (item) =>
        String(item?.customerEmail ?? "")
          .trim()
          .toLowerCase() === normalizedReview.customerEmail,
    );

    if (existedReview) {
      throw new Error("Moi tai khoan chi duoc review san pham nay 1 lan.");
    }

    const nextItem = normalizeProduct({
      ...product,
      reviewsData: [...previousReviews, normalizedReview],
      updatedAt: new Date().toISOString(),
    });

    updatedProduct = nextItem;
    return nextItem;
  });

  if (!updatedProduct) {
    throw new Error("Product not found.");
  }

  await persistProducts(nextProducts, snapshot, {
    syncShops: false,
  });
  return updatedProduct;
};

export const upsertVendorReply = async ({
  productId,
  reviewCreatedAt,
  customerEmail,
  vendorEmail,
  replyText,
}) => {
  const normalizedProductId = String(productId ?? "").trim();
  const normalizedReviewCreatedAt = String(reviewCreatedAt ?? "").trim();
  const normalizedCustomerEmail = String(customerEmail ?? "")
    .trim()
    .toLowerCase();
  const normalizedVendorEmail = String(vendorEmail ?? "")
    .trim()
    .toLowerCase();
  const normalizedReplyText = String(replyText ?? "").trim();

  if (
    !normalizedProductId ||
    !normalizedReviewCreatedAt ||
    !normalizedCustomerEmail ||
    !normalizedVendorEmail ||
    !normalizedReplyText
  ) {
    throw new Error("Missing required fields for vendor reply.");
  }

  const snapshot = await fetchProductsSnapshot();
  const { products } = snapshot;
  let updatedProduct = null;

  const nextProducts = products.map((product) => {
    if (String(product?.id) !== normalizedProductId) {
      return product;
    }

    const productVendorEmail = String(product?.vendorEmail ?? "")
      .trim()
      .toLowerCase();

    if (productVendorEmail !== normalizedVendorEmail) {
      throw new Error("Vendor khong co quyen tra loi review san pham nay.");
    }

    const previousReviews = Array.isArray(product?.reviewsData)
      ? product.reviewsData
      : [];

    const nextReviews = previousReviews.map((reviewItem) => {
      const isMatchedReview =
        String(reviewItem?.createdAt ?? "") === normalizedReviewCreatedAt &&
        String(reviewItem?.customerEmail ?? "")
          .trim()
          .toLowerCase() === normalizedCustomerEmail;

      if (!isMatchedReview) {
        return reviewItem;
      }

      return {
        ...reviewItem,
        vendorReply: {
          text: normalizedReplyText,
          at: new Date().toISOString(),
        },
      };
    });

    const nextItem = normalizeProduct({
      ...product,
      reviewsData: nextReviews,
      updatedAt: new Date().toISOString(),
    });

    updatedProduct = nextItem;
    return nextItem;
  });

  if (!updatedProduct) {
    throw new Error("Product not found.");
  }

  await persistProducts(nextProducts, snapshot, {
    syncShops: false,
  });
  return updatedProduct;
};
