import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import {
  createProduct,
  PRODUCT_STATUS,
  removeProductById,
  updateProductById,
} from "../../api/productApi";
import { useAdminProductsQuery } from "../../hooks/useAdminProductsQuery";
import { useAuth } from "../../hooks/useAuth";
import { isProductOwnedByVendor } from "./vendorDataUtils";
import "./VendorProducts.css";

const defaultForm = {
  title: "",
  category: "fashion-nam",
  description: "",
  price: "",
  stock: "",
  colorsText: "",
  sizesText: "",
  brand: "",
  material: "",
  model: "",
  warrantyMonths: "",
  expiryDate: "",
  weight: "",
  thumbnailUrl: "",
  galleryUrlsText: "",
};

const categoryOptions = [
  {
    value: "fashion-nam",
    label: "Men Fashion",
    flags: {
      useSizes: false,
      useColors: false,
      useBrand: true,
      useMaterial: true,
    },
  },
  {
    value: "fashion-nu",
    label: "Women Fashion",
    flags: {
      useSizes: false,
      useColors: false,
      useBrand: true,
      useMaterial: true,
    },
  },
  {
    value: "do-gia-dung",
    label: "Furniture",
    flags: {
      useSizes: false,
      useColors: false,
      useBrand: true,
      useMaterial: false,
    },
  },
  {
    value: "dien-tu",
    label: "Electronics",
    flags: {
      useSizes: false,
      useColors: false,
      useBrand: true,
      useElectronicsFields: true,
    },
  },
  {
    value: "thuc-pham",
    label: "Food",
    flags: {
      useSizes: false,
      useColors: false,
      useBrand: true,
      useFoodFields: true,
    },
  },
  {
    value: "others",
    label: "Others",
    flags: { useSizes: false, useColors: false, useBrand: true },
  },
];

const categoryVariantFields = {
  "fashion-nam": [
    { key: "color", label: "Color" },
    { key: "size", label: "Size" },
  ],
  "fashion-nu": [
    { key: "color", label: "Color" },
    { key: "size", label: "Size" },
  ],
  "do-gia-dung": [
    { key: "color", label: "Color" },
    { key: "sizeValues", label: "Size" },
    { key: "material", label: "Material" },
  ],
  "dien-tu": [
    { key: "storage", label: "Storage" },
    { key: "color", label: "Color" },
  ],
  "thuc-pham": [{ key: "packSize", label: "Pack size" }],
  others: [{ key: "optionName", label: "Option" }],
};

const categoryVariantAttributeFields = {
  "do-gia-dung": [],
};

const CATEGORY_SKU_PREFIX = {
  "fashion-nam": "MEN",
  "fashion-nu": "WMN",
  "do-gia-dung": "FUR",
  "dien-tu": "ELE",
  "thuc-pham": "FOD",
  others: "GEN",
};

function createLocalVariantId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeVariantFields(categoryValue) {
  return categoryVariantFields[categoryValue] ?? categoryVariantFields.others;
}

function normalizeVariantOptionValues(categoryValue, optionValues = {}) {
  return normalizeVariantFields(categoryValue).reduce((result, field) => {
    result[field.key] = String(optionValues?.[field.key] ?? "");
    return result;
  }, {});
}

function normalizeVariantAttributeFields(categoryValue) {
  return categoryVariantAttributeFields[categoryValue] ?? [];
}

function hasColorVariantField(categoryValue) {
  return normalizeVariantFields(categoryValue).some((field) => field.key === "color");
}

function normalizeHexColorValue(value) {
  return String(value ?? "").trim();
}

function isValidHexColorValue(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalizeHexColorValue(value));
}

function normalizeVariantAttributeValues(categoryValue, attributes = {}) {
  const normalizedAttributes = normalizeVariantAttributeFields(categoryValue).reduce(
    (result, field) => {
      result[field.key] = String(attributes?.[field.key] ?? "");
      return result;
    },
    {},
  );

  if (hasColorVariantField(categoryValue)) {
    normalizedAttributes.colorHex = normalizeHexColorValue(attributes?.colorHex);
  }

  return normalizedAttributes;
}

function createVariantGeneratorInputs(categoryValue, overrides = {}) {
  const optionInputs = normalizeVariantFields(categoryValue).reduce(
    (result, field) => {
      result[field.key] = String(overrides?.[field.key] ?? "");
      return result;
    },
    {},
  );
  const attributeInputs = normalizeVariantAttributeFields(categoryValue).reduce(
    (result, field) => {
      result[field.key] = String(overrides?.[field.key] ?? "");
      return result;
    },
    {},
  );
  return { ...optionInputs, ...attributeInputs };
}

function createVariantDraft(categoryValue, overrides = {}) {
  return {
    localId: String(overrides.localId ?? createLocalVariantId()),
    sku: String(overrides.sku ?? ""),
    title: String(overrides.title ?? ""),
    price: String(overrides.price ?? ""),
    oldPrice: String(overrides.oldPrice ?? ""),
    stock: String(overrides.stock ?? ""),
    image: String(overrides.image ?? ""),
    isDefault: Boolean(overrides.isDefault),
    optionValues: normalizeVariantOptionValues(
      categoryValue,
      overrides.optionValues,
    ),
    attributes: normalizeVariantAttributeValues(
      categoryValue,
      overrides.attributes,
    ),
  };
}

function buildVariantSignature(categoryValue, optionValues = {}, attributes = {}) {
  const optionParts = normalizeVariantFields(categoryValue).map((field) =>
    String(optionValues?.[field.key] ?? "").trim().toLowerCase(),
  );
  const attributeParts = normalizeVariantAttributeFields(categoryValue).map(
    (field) => String(attributes?.[field.key] ?? "").trim().toLowerCase(),
  );
  return [...optionParts, ...attributeParts].join("||");
}

function buildVariantLabel(categoryValue, variant) {
  const optionParts = normalizeVariantFields(categoryValue)
    .map((field) => String(variant?.optionValues?.[field.key] ?? "").trim())
    .filter(Boolean);
  const attributeParts = normalizeVariantAttributeFields(categoryValue)
    .map((field) => String(variant?.attributes?.[field.key] ?? "").trim())
    .filter(Boolean);
  const combined = [...optionParts, ...attributeParts].join(" / ");

  if (combined) {
    return combined;
  }
  return (
    String(variant?.title ?? "").trim() ||
    String(variant?.sku ?? "").trim() ||
    "Default variant"
  );
}

function normalizeSkuText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, (character) => (character === "đ" ? "d" : "D"));
}

function createSkuSegment(value, maxLength = 6) {
  return normalizeSkuText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .join("")
    .slice(0, maxLength);
}

function getCategorySkuPrefix(categoryValue) {
  return CATEGORY_SKU_PREFIX[categoryValue] ?? CATEGORY_SKU_PREFIX.others;
}

function buildVariantSkuSegments(categoryValue, variant) {
  const optionSegments = normalizeVariantFields(categoryValue)
    .map((field) => createSkuSegment(variant?.optionValues?.[field.key], 6))
    .filter(Boolean);

  return optionSegments.length > 0 ? optionSegments : ["DEFAULT"];
}

function buildAutoVariantSku(categoryValue, productTitle, variant, variantIndex = 0) {
  const categoryPrefix = getCategorySkuPrefix(categoryValue);
  const productSegment = createSkuSegment(productTitle, 6) || "ITEM";
  const optionSegments = buildVariantSkuSegments(categoryValue, variant);
  const sequence = String(Math.max(0, Number(variantIndex) || 0) + 1).padStart(
    2,
    "0",
  );

  return [categoryPrefix, productSegment, ...optionSegments, sequence].join("-");
}

function resolveVariantSku(categoryValue, productTitle, variant, variantIndex = 0) {
  const existingSku = String(variant?.sku ?? "").trim();

  if (existingSku) {
    return existingSku;
  }

  return buildAutoVariantSku(categoryValue, productTitle, variant, variantIndex);
}

function ensureSingleDefaultVariant(variants = [], preferredLocalId = "") {
  const nextVariants = Array.isArray(variants) ? variants.filter(Boolean) : [];

  if (nextVariants.length === 0) {
    return [];
  }

  const normalizedPreferredLocalId = String(preferredLocalId ?? "").trim();
  const existingDefaultLocalId = String(
    nextVariants.find((variant) => variant?.isDefault)?.localId ?? "",
  ).trim();
  const resolvedDefaultLocalId =
    (normalizedPreferredLocalId &&
      nextVariants.some(
        (variant) => String(variant?.localId ?? "").trim() === normalizedPreferredLocalId,
      ) &&
      normalizedPreferredLocalId) ||
    existingDefaultLocalId ||
    String(nextVariants[0]?.localId ?? "").trim();

  return nextVariants.map((variant, index) => ({
    ...variant,
    isDefault:
      String(variant?.localId ?? "").trim() === resolvedDefaultLocalId ||
      (!resolvedDefaultLocalId && index === 0),
  }));
}

function buildGeneratorInputsFromVariants(categoryValue, variants = []) {
  const optionInputs = normalizeVariantFields(categoryValue).reduce(
    (result, field) => {
      result[field.key] = [
        ...new Set(
          (Array.isArray(variants) ? variants : [])
            .map((variant) =>
              String(variant?.optionValues?.[field.key] ?? "").trim(),
            )
            .filter(Boolean),
        ),
      ].join(", ");
      return result;
    },
    {},
  );
  const attributeInputs = normalizeVariantAttributeFields(categoryValue).reduce(
    (result, field) => {
      result[field.key] = [
        ...new Set(
          (Array.isArray(variants) ? variants : [])
            .map((variant) => String(variant?.attributes?.[field.key] ?? "").trim())
            .filter(Boolean),
        ),
      ].join(", ");
      return result;
    },
    {},
  );
  return { ...optionInputs, ...attributeInputs };
}

function formatVariantCurrency(value) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "$0";
  }

  return `$${amount.toLocaleString("en-US")}`;
}

function hasMeaningfulVariantDraft(variant) {
  if (!variant || typeof variant !== "object") {
    return false;
  }

  return (
    String(variant.sku ?? "").trim() ||
    String(variant.title ?? "").trim() ||
    String(variant.price ?? "").trim() ||
    String(variant.oldPrice ?? "").trim() ||
    String(variant.stock ?? "").trim() ||
    String(variant.image ?? "").trim() ||
    Object.values(variant.optionValues ?? {}).some((value) =>
      String(value ?? "").trim(),
    ) ||
    Object.values(variant.attributes ?? {}).some((value) =>
      String(value ?? "").trim(),
    )
  );
}

function parseInputList(text) {
  return String(text ?? "")
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeHexColors(text) {
  const hexColorRegex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const colors = parseInputList(text).filter((item) =>
    hexColorRegex.test(item),
  );

  return [...new Set(colors)];
}

function normalizeImageSource(value) {
  return String(value ?? "").trim();
}

function isInlineImageSource(value) {
  return normalizeImageSource(value).startsWith("data:");
}

function parseImageUrls(text) {
  return [
    ...new Set(parseInputList(text).map(normalizeImageSource).filter(Boolean)),
  ];
}

function removeImageUrlFromTextList(text, imageUrl) {
  const normalizedTargetImage = normalizeImageSource(imageUrl);

  return parseImageUrls(text)
    .filter((image) => normalizeImageSource(image) !== normalizedTargetImage)
    .join("\n");
}

function getProductThumbnail(product) {
  if (product?.image) {
    return String(product.image);
  }

  if (Array.isArray(product?.images) && product.images.length > 0) {
    return String(product.images[0]);
  }

  return "";
}

function getProductGalleryImages(product) {
  const thumbnail = getProductThumbnail(product);
  const productImages = Array.isArray(product?.images) ? product.images : [];

  return productImages.filter((image, index) => {
    if (!image) {
      return false;
    }

    if (thumbnail && image === thumbnail && index === 0) {
      return false;
    }

    return true;
  });
}

function getSelectedFileKey(file) {
  return [file?.name ?? "", file?.size ?? 0, file?.lastModified ?? 0].join("-");
}

function getStoredImageLabel(image, fallbackLabel) {
  const value = String(image ?? "").trim();

  if (!value || value.startsWith("data:")) {
    return fallbackLabel;
  }

  const normalizedPath = value.split("?")[0]?.split("#")[0] ?? "";
  const pathSegments = normalizedPath.split("/").filter(Boolean);
  return pathSegments[pathSegments.length - 1] || fallbackLabel;
}

function getProductCreatedTimestamp(product) {
  const parsedCreatedAt = Date.parse(String(product?.createdAt ?? "").trim());

  if (Number.isFinite(parsedCreatedAt)) {
    return parsedCreatedAt;
  }

  const parsedUpdatedAt = Date.parse(String(product?.updatedAt ?? "").trim());

  if (Number.isFinite(parsedUpdatedAt)) {
    return parsedUpdatedAt;
  }

  return 0;
}

function isProductVisibleInPublicCache(product) {
  const status = String(product?.status ?? "")
    .trim()
    .toLowerCase();

  return [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.OUT_OF_STOCK].includes(status);
}

function upsertProductInList(list, nextProduct) {
  const products = Array.isArray(list) ? list : [];
  const normalizedId = String(nextProduct?.id ?? "").trim();

  if (!normalizedId) {
    return products;
  }

  const existingIndex = products.findIndex(
    (product) => String(product?.id ?? "").trim() === normalizedId,
  );

  if (existingIndex < 0) {
    return [nextProduct, ...products];
  }

  return products.map((product, index) =>
    index === existingIndex ? nextProduct : product,
  );
}

function removeProductFromList(list, productId) {
  const products = Array.isArray(list) ? list : [];
  const normalizedId = String(productId ?? "").trim();

  if (!normalizedId) {
    return products;
  }

  return products.filter(
    (product) => String(product?.id ?? "").trim() !== normalizedId,
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M14 5h-5a4 4 0 0 0-4 4v6a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m15 4 5 5M12 12l8-8M11 13l-1 3 3-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M3 3 21 21"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10.7 6.2A10.6 10.6 0 0 1 12 6c6.5 0 10 6 10 6a17.5 17.5 0 0 1-3.2 3.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.1 6.9A17.8 17.8 0 0 0 2 12s3.5 6 10 6c1.1 0 2.1-.2 3.1-.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.6 10.6a2 2 0 0 0 2.8 2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6 6 18 18M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function VendorProducts() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { user } = useAuth();
  const { data: products = [], isLoading, isError } = useAdminProductsQuery();

  const [form, setForm] = useState(defaultForm);
  const [existingThumbnail, setExistingThumbnail] = useState("");
  const [existingGalleryImages, setExistingGalleryImages] = useState([]);
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState(null);
  const [selectedGalleryFiles, setSelectedGalleryFiles] = useState([]);
  const [variantRows, setVariantRows] = useState([]);
  const [variantDraft, setVariantDraft] = useState(() =>
    createVariantDraft(defaultForm.category),
  );
  const [variantGeneratorInputs, setVariantGeneratorInputs] = useState(() =>
    createVariantGeneratorInputs(defaultForm.category),
  );
  const [editingVariantLocalId, setEditingVariantLocalId] = useState("");
  const [imagePendingRemoval, setImagePendingRemoval] = useState(null);
  const [editingId, setEditingId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveIntent, setSaveIntent] = useState("");
  const [processingProductId, setProcessingProductId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const vendorEmail = String(user?.email ?? "")
    .trim()
    .toLowerCase();
  const vendorId = String(user?.id ?? "").trim();
  const vendorShopName =
    user?.shopName ||
    user?.name ||
    (vendorEmail ? vendorEmail.split("@")[0] : "My Shop");

  const vendorProducts = useMemo(() => {
    return [...products]
      .filter((product) =>
        isProductOwnedByVendor(product, vendorEmail, vendorId),
      )
      .sort(
        (firstProduct, secondProduct) =>
          getProductCreatedTimestamp(secondProduct) -
          getProductCreatedTimestamp(firstProduct),
      );
  }, [products, vendorEmail, vendorId]);

  const paginatedVendorProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return vendorProducts.slice(startIndex, endIndex);
  }, [vendorProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(vendorProducts.length / itemsPerPage);

  const editingProduct = useMemo(() => {
    if (!editingId) {
      return null;
    }

    return (
      vendorProducts.find((p) => String(p?.id ?? "") === String(editingId)) ??
      null
    );
  }, [vendorProducts, editingId]);

  const editingProductStatusKey = useMemo(() => {
    return String(editingProduct?.status ?? "").trim().toLowerCase();
  }, [editingProduct]);

  const canUpdateLive = Boolean(editingId) &&
    editingProductStatusKey === PRODUCT_STATUS.ACTIVE;

  function syncProductCaches(nextProduct) {
    const normalizedId = String(nextProduct?.id ?? "").trim();

    if (!normalizedId) {
      return;
    }

    queryClient.setQueryData(["products", "admin"], (previous) =>
      upsertProductInList(previous, nextProduct),
    );
    queryClient.setQueryData(["products", "public"], (previous) => {
      const baseList = removeProductFromList(previous, normalizedId);

      if (!isProductVisibleInPublicCache(nextProduct)) {
        return baseList;
      }

      return upsertProductInList(baseList, nextProduct);
    });
  }

  function removeProductCaches(productId) {
    queryClient.setQueryData(["products", "admin"], (previous) =>
      removeProductFromList(previous, productId),
    );
    queryClient.setQueryData(["products", "public"], (previous) =>
      removeProductFromList(previous, productId),
    );
  }

  const categories = useMemo(() => {
    const fromData = products
      .map((product) =>
        String(product?.category ?? "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean);
    const predefinedValues = categoryOptions.map((item) => item.value);

    return [...new Set([...predefinedValues, ...fromData])];
  }, [products]);

  const selectedCategoryConfig = useMemo(() => {
    return (
      categoryOptions.find((item) => item.value === form.category) ??
      categoryOptions[0]
    );
  }, [form.category]);
  const selectedVariantFields = useMemo(
    () => normalizeVariantFields(form.category),
    [form.category],
  );
  const selectedVariantAttributeFields = useMemo(
    () => normalizeVariantAttributeFields(form.category),
    [form.category],
  );
  const defaultVariantLocalId = useMemo(
    () =>
      String(variantRows.find((variant) => variant?.isDefault)?.localId ?? "").trim(),
    [variantRows],
  );

  const [duplicateLocalIds, setDuplicateLocalIds] = useState(new Set());

  useEffect(() => {
    const map = {};
    const dup = new Set();
    (Array.isArray(variantRows) ? variantRows : []).forEach((v) => {
      const sig = buildVariantSignature(
        form.category,
        v.optionValues,
        v.attributes,
      );
      if (!sig) {
        return;
      }
      if (!map[sig]) {
        map[sig] = [];
      }
      map[sig].push(String(v.localId));
    });

    Object.values(map).forEach((ids) => {
      if (ids.length > 1) {
        ids.forEach((id) => dup.add(id));
      }
    });

    setDuplicateLocalIds(dup);
  }, [variantRows, form.category]);

  const editProductIdFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return String(params.get("edit") ?? "").trim();
  }, [location.search]);

  function applyEditingProduct(product) {
    const productThumbnail = getProductThumbnail(product);
    const productGalleryImages = getProductGalleryImages(product);
    const nextVariantRows =
      Array.isArray(product?.variants) && product.variants.length > 0
        ? ensureSingleDefaultVariant(
            product.variants.map((variant) =>
              createVariantDraft(product.category, {
                localId: variant.id,
                sku: variant.sku,
                title: variant.title,
                price: variant.price,
                oldPrice: variant.oldPrice,
                stock: variant.stock,
                image: variant.image,
                isDefault: variant.isDefault,
                optionValues: variant.optionValues,
                attributes: variant.attributes,
              }),
            ),
            String(
              product.variants.find((variant) => variant?.isDefault)?.id ??
                product.defaultVariantId ??
                "",
            ).trim(),
          )
        : [];

    setEditingId(String(product.id));
    setForm({
      title: product.title ?? "",
      category: product.category ?? "",
      description: product.description ?? "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? 0),
      colorsText: Array.isArray(product.colors)
        ? product.colors.join(", ")
        : "",
      sizesText: Array.isArray(product.sizes) ? product.sizes.join(", ") : "",
      brand: String(product?.attributes?.brand ?? ""),
      material: String(product?.attributes?.material ?? ""),
      model: String(product?.attributes?.model ?? ""),
      warrantyMonths: String(product?.attributes?.warrantyMonths ?? ""),
      expiryDate: String(product?.attributes?.expiryDate ?? ""),
      weight: String(product?.attributes?.weight ?? ""),
      thumbnailUrl: isInlineImageSource(productThumbnail)
        ? ""
        : productThumbnail,
      galleryUrlsText: productGalleryImages
        .filter((image) => !isInlineImageSource(image))
        .join("\n"),
    });
    setExistingThumbnail(productThumbnail);
    setExistingGalleryImages(productGalleryImages);
    setSelectedThumbnailFile(null);
    setSelectedGalleryFiles([]);
    setVariantRows(nextVariantRows);
    setVariantDraft(
      createVariantDraft(product.category, {
        price: product.price,
        oldPrice: product.oldPrice,
        stock: product.stock,
        image: productThumbnail,
      }),
    );
    setVariantGeneratorInputs(
      buildGeneratorInputsFromVariants(product.category, nextVariantRows),
    );
    setEditingVariantLocalId("");
    setImagePendingRemoval(null);
    setErrorMessage("");
  }

  async function startEditingProduct(product) {
    const normalizedProductId = String(product?.id ?? "").trim();

    if (!normalizedProductId) {
      setErrorMessage("Không tìm thấy sản phẩm để chỉnh sửa.");
      return;
    }

    applyEditingProduct(product);
  }

  useEffect(() => {
    setVariantRows((previous) => {
      if (!Array.isArray(previous) || previous.length === 0) {
        return [];
      }

      return ensureSingleDefaultVariant(
        previous.map((variant) => createVariantDraft(form.category, variant)),
      );
    });
    setVariantDraft((previous) => createVariantDraft(form.category, previous));
    setVariantGeneratorInputs((previous) =>
      createVariantGeneratorInputs(form.category, previous),
    );
    setEditingVariantLocalId("");
  }, [form.category]);

  useEffect(() => {
    if (!editProductIdFromQuery || editingId) {
      return;
    }

    const productToEdit = vendorProducts.find(
      (product) => String(product?.id ?? "") === editProductIdFromQuery,
    );

    if (!productToEdit) {
      return;
    }

    void startEditingProduct(productToEdit);
  }, [editProductIdFromQuery, editingId, vendorProducts]);

  useEffect(() => {
    const resolvedTotalPages = Math.max(totalPages, 1);

    if (currentPage <= resolvedTotalPages) {
      return;
    }

    setCurrentPage(resolvedTotalPages);
  }, [currentPage, totalPages]);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleBulkApply(fieldName) {
    const sourceValue = String(variantDraft?.[fieldName] ?? "");

    setVariantRows((previous) =>
      previous.map((variant) =>
        createVariantDraft(form.category, {
          ...variant,
          [fieldName]: sourceValue,
        }),
      ),
    );

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleInlineVariantOptionChange(localId, optionKey, nextValue) {
    const updatedRows = (Array.isArray(variantRows) ? variantRows : []).map(
      (variant) => {
        if (String(variant.localId) !== String(localId)) {
          return variant;
        }

        return createVariantDraft(form.category, {
          ...variant,
          optionValues: {
            ...(variant.optionValues ?? {}),
            [optionKey]: String(nextValue ?? ""),
          },
        });
      },
    );

    const signatureCounts = {};
    updatedRows.forEach((v) => {
      const sig = buildVariantSignature(
        form.category,
        v.optionValues,
        v.attributes,
      );
      if (!sig) {
        return;
      }
      signatureCounts[sig] = (signatureCounts[sig] || 0) + 1;
    });

    const hasDuplicate = Object.values(signatureCounts).some((c) => c > 1);

    setVariantRows(updatedRows);

    if (hasDuplicate) {
      setErrorMessage("Biến thể với tổ hợp tùy chọn này đã tồn tại.");
    } else if (errorMessage) {
      setErrorMessage("");
    }
  }

  function getVariantImageInputId(localId) {
    return `variant-image-file-${String(localId)}`;
  }

  const [invalidImageUrlByLocalId, setInvalidImageUrlByLocalId] = useState({});

  async function headCheck(url) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (!response.ok) return false;
      const contentType = response.headers.get("content-type") || "";
      return contentType.includes("image");
    } catch (_) {
      return false;
    }
  }

  function imageLoadCheck(url) {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      } catch (_) {
        resolve(false);
      }
    });
  }

  async function validateVariantImageUrl(localId, url) {
    const value = String(url ?? "").trim();

    if (!value) {
      setInvalidImageUrlByLocalId((prev) => ({ ...prev, [localId]: false }));
      return;
    }

    const looksLikeUrl = /^(https?:)?\/\//i.test(value) || value.startsWith("data:");

    if (!looksLikeUrl) {
      setInvalidImageUrlByLocalId((prev) => ({ ...prev, [localId]: true }));
      return;
    }

    if (value.startsWith("data:")) {
      setInvalidImageUrlByLocalId((prev) => ({ ...prev, [localId]: false }));
      return;
    }

    const ok = (await headCheck(value)) || (await imageLoadCheck(value));
    setInvalidImageUrlByLocalId((prev) => ({ ...prev, [localId]: !ok }));
  }

  function requestUploadVariantImage(localId) {
    const input = document.getElementById(getVariantImageInputId(localId));
    if (input) {
      input.click();
    }
  }

  function handleVariantImageFileSelected(localId, event) {
    const file = event?.target?.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type?.startsWith("image/")) {
      setErrorMessage("Vui lòng chọn file ảnh hợp lệ.");
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      setErrorMessage("Ảnh quá lớn (tối đa 5MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      handleInlineVariantChange(localId, "image", dataUrl);
      setInvalidImageUrlByLocalId((prev) => ({ ...prev, [localId]: false }));
    };
    reader.onerror = () => {
      setErrorMessage("Không thể đọc file ảnh. Vui lòng thử lại.");
    };
    reader.readAsDataURL(file);
  }

  function handleSelectThumbnailFile(event) {
    const file = event.target.files?.[0] ?? null;
    setSelectedThumbnailFile(file);

    event.target.value = "";

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleRemoveSelectedThumbnailFile() {
    setSelectedThumbnailFile(null);

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleRequestRemoveExistingThumbnail() {
    if (!existingThumbnail) {
      return;
    }

    setImagePendingRemoval({
      type: "thumbnail",
      image: existingThumbnail,
      label: getStoredImageLabel(existingThumbnail, "Thumbnail hiện tại"),
    });

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleRemoveExistingThumbnail() {
    setExistingThumbnail("");
    setForm((previous) => ({
      ...previous,
      thumbnailUrl:
        normalizeImageSource(previous.thumbnailUrl) ===
        normalizeImageSource(existingThumbnail)
          ? ""
          : previous.thumbnailUrl,
    }));
    setImagePendingRemoval(null);

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleSelectGalleryFiles(event) {
    const files = Array.from(event.target.files ?? []);
    setSelectedGalleryFiles((prev) => {
      const nextFiles = [...prev];
      const existingKeys = new Set(
        prev.map((file) => getSelectedFileKey(file)),
      );

      files.forEach((file) => {
        const fileKey = getSelectedFileKey(file);

        if (!existingKeys.has(fileKey)) {
          nextFiles.push(file);
          existingKeys.add(fileKey);
        }
      });

      return nextFiles;
    });

    event.target.value = "";

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleRemoveSelectedGalleryFile(fileToRemove) {
    const targetFileKey = getSelectedFileKey(fileToRemove);
    setSelectedGalleryFiles((prev) =>
      prev.filter((file) => getSelectedFileKey(file) !== targetFileKey),
    );

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleRequestRemoveExistingGalleryImage(imageToRemove, index) {
    setImagePendingRemoval({
      type: "gallery",
      image: imageToRemove,
      label: getStoredImageLabel(imageToRemove, `Gallery image ${index + 1}`),
    });

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleRemoveExistingGalleryImage(imageToRemove) {
    setExistingGalleryImages((prev) =>
      prev.filter((image) => image !== imageToRemove),
    );
    setForm((previous) => ({
      ...previous,
      galleryUrlsText: removeImageUrlFromTextList(
        previous.galleryUrlsText,
        imageToRemove,
      ),
    }));
    setImagePendingRemoval(null);

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleCancelImageRemoval() {
    setImagePendingRemoval(null);
  }

  function handleConfirmImageRemoval() {
    if (!imagePendingRemoval) {
      return;
    }

    if (imagePendingRemoval.type === "thumbnail") {
      handleRemoveExistingThumbnail();
      return;
    }

    handleRemoveExistingGalleryImage(imagePendingRemoval.image);
  }

  function resetForm() {
    setForm(defaultForm);
    setExistingThumbnail("");
    setExistingGalleryImages([]);
    setSelectedThumbnailFile(null);
    setSelectedGalleryFiles([]);
    setVariantRows([]);
    setVariantDraft(createVariantDraft(defaultForm.category));
    setVariantGeneratorInputs(createVariantGeneratorInputs(defaultForm.category));
    setEditingVariantLocalId("");
    setImagePendingRemoval(null);
    setEditingId("");
    setSaveIntent("");
    setErrorMessage("");
  }

  function resetVariantDraft() {
    setVariantDraft(
      createVariantDraft(form.category, {
        price: form.price,
        oldPrice: form.price,
        stock: "0",
        image: normalizeImageSource(form.thumbnailUrl) || existingThumbnail,
      }),
    );
    setEditingVariantLocalId("");
  }

  function handleRemoveVariantRow(localId) {
    setVariantRows((previous) => {
      const nextRows = ensureSingleDefaultVariant(
        previous.filter((variant) => variant.localId !== localId),
      );
      return nextRows;
    });

    if (String(editingVariantLocalId) === String(localId)) {
      resetVariantDraft();
    }

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleVariantFieldChange(fieldName, nextValue) {
    setVariantDraft((previous) => ({
      ...previous,
      [fieldName]: fieldName === "isDefault" ? Boolean(nextValue) : nextValue,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleVariantOptionChange(optionKey, nextValue) {
    setVariantDraft((previous) => ({
      ...previous,
      optionValues: {
        ...(previous.optionValues ?? {}),
        [optionKey]: nextValue,
      },
    }));

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleVariantAttributeChange(attrKey, nextValue) {
    setVariantDraft((previous) => ({
      ...previous,
      attributes: {
        ...(previous.attributes ?? {}),
        [attrKey]: nextValue,
      },
    }));

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleVariantGeneratorChange(optionKey, nextValue) {
    setVariantGeneratorInputs((previous) => ({
      ...previous,
      [optionKey]: nextValue,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleSaveVariantDraft() {
    const missingField = selectedVariantFields.find(
      (field) => !String(variantDraft?.optionValues?.[field.key] ?? "").trim(),
    );

    if (missingField) {
      setErrorMessage(`Vui lòng nhập ${missingField.label} cho biến thể.`);
      return;
    }

    if (!hasMeaningfulVariantDraft(variantDraft)) {
      setErrorMessage("Hãy nhập thông tin biến thể trước khi thêm vào danh sách.");
      return;
    }

    const nextVariant = createVariantDraft(form.category, {
      ...variantDraft,
      localId: editingVariantLocalId || variantDraft.localId,
    });
    const nextVariantIndex = editingVariantLocalId
      ? Math.max(
          variantRows.findIndex(
            (variant) => String(variant.localId) === String(editingVariantLocalId),
          ),
          0,
        )
      : variantRows.length;
    const nextVariantWithSku = {
      ...nextVariant,
      sku: resolveVariantSku(
        form.category,
        form.title,
        nextVariant,
        nextVariantIndex,
      ),
    };

    if (
      hasColorVariantField(form.category) &&
      nextVariantWithSku.attributes?.colorHex &&
      !isValidHexColorValue(nextVariantWithSku.attributes.colorHex)
    ) {
      setErrorMessage("Color HEX của biến thể không hợp lệ.");
      return;
    }

    const nextSignature = buildVariantSignature(
      form.category,
      nextVariantWithSku.optionValues,
      nextVariantWithSku.attributes,
    );

    if (
      nextSignature &&
      variantRows.some(
        (variant) =>
          String(variant.localId) !== String(nextVariantWithSku.localId) &&
          buildVariantSignature(
            form.category,
            variant.optionValues,
            variant.attributes,
          ) === nextSignature,
      )
    ) {
      setErrorMessage("Biến thể với tổ hợp tùy chọn này đã tồn tại.");
      return;
    }

    setVariantRows((previous) => {
      const nextRows = editingVariantLocalId
        ? previous.map((variant) =>
            variant.localId === editingVariantLocalId ? nextVariantWithSku : variant,
          )
        : [...previous, nextVariantWithSku];

      return ensureSingleDefaultVariant(
        nextRows,
        nextVariantWithSku.isDefault
          ? nextVariantWithSku.localId
          : defaultVariantLocalId,
      );
    });
    resetVariantDraft();

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleEditVariant(localId) {
    const targetVariant = variantRows.find(
      (variant) => String(variant.localId) === String(localId),
    );

    if (!targetVariant) {
      return;
    }

    setVariantDraft(createVariantDraft(form.category, targetVariant));
    setEditingVariantLocalId(String(localId));

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleSetDefaultVariant(localId) {
    setVariantRows((previous) => ensureSingleDefaultVariant(previous, localId));
    setVariantDraft((previous) => ({
      ...previous,
      isDefault: String(editingVariantLocalId) === String(localId),
    }));

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleInlineVariantChange(localId, fieldName, nextValue) {
    setVariantRows((previous) =>
      previous.map((variant) => {
        if (String(variant.localId) !== String(localId)) {
          return variant;
        }

        const draft = createVariantDraft(form.category, {
          ...variant,
          [fieldName]: nextValue,
        });

        return draft;
      }),
    );

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleGenerateVariants() {
    const generatorOptionFieldValues = selectedVariantFields.map((field) => ({
      ...field,
      values: [...new Set(parseInputList(variantGeneratorInputs[field.key]))],
    }));
    const generatorAttributeFieldValues = selectedVariantAttributeFields.map(
      (field) => ({
        ...field,
        values: [...new Set(parseInputList(variantGeneratorInputs[field.key]))],
      }),
    );
    const missingField =
      generatorOptionFieldValues.find((field) => field.values.length === 0) ||
      generatorAttributeFieldValues.find((field) => field.values.length === 0);

    if (missingField) {
      setErrorMessage(`Vui lòng nhập ít nhất 1 giá trị cho ${missingField.label}.`);
      return;
    }

    const optionCombinations = generatorOptionFieldValues.reduce(
      (result, field) =>
        result.flatMap((currentCombination) =>
          field.values.map((value) => ({
            ...currentCombination,
            [field.key]: value,
          })),
        ),
      [{}],
    );
    const attributeCombinations = generatorAttributeFieldValues.reduce(
      (result, field) =>
        result.flatMap((currentCombination) =>
          field.values.map((value) => ({
            ...currentCombination,
            [field.key]: value,
          })),
        ),
      [{}],
    );
    const combinations = optionCombinations.flatMap((opt) =>
      (attributeCombinations.length ? attributeCombinations : [{}]).map((attr) => ({
        optionValues: opt,
        attributes: attr,
      })),
    );
    const existingSignatures = new Set(
      variantRows
        .map((variant) =>
          buildVariantSignature(
            form.category,
            variant.optionValues,
            variant.attributes,
          ),
        )
        .filter(Boolean),
    );
    const fallbackImage =
      String(variantDraft.image ?? "").trim() ||
      normalizeImageSource(form.thumbnailUrl) ||
      existingThumbnail;
    const generatedVariants = combinations
      .map(({ optionValues, attributes }) =>
        createVariantDraft(form.category, {
          price: String(variantDraft.price ?? form.price ?? ""),
          oldPrice: String(
            variantDraft.oldPrice ?? variantDraft.price ?? form.price ?? "",
          ),
          stock: String(variantDraft.stock ?? "0"),
          image: fallbackImage,
          optionValues,
          attributes,
        }),
      )
      .filter((variant) => {
        const signature = buildVariantSignature(
          form.category,
          variant.optionValues,
          variant.attributes,
        );

        if (!signature || existingSignatures.has(signature)) {
          return false;
        }

        existingSignatures.add(signature);
        return true;
      });
    const generatedVariantsWithSku = generatedVariants.map((variant, index) => ({
      ...variant,
      sku: resolveVariantSku(
        form.category,
        form.title,
        variant,
        variantRows.length + index,
      ),
    }));

    if (generatedVariantsWithSku.length === 0) {
      setErrorMessage("Tất cả tổ hợp biến thể đã tồn tại trong danh sách.");
      return;
    }

    setVariantRows((previous) =>
      ensureSingleDefaultVariant(
        [...previous, ...generatedVariantsWithSku],
        defaultVariantLocalId || generatedVariantsWithSku[0]?.localId,
      ),
    );
    resetVariantDraft();

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  async function handleSaveProduct(targetStatus) {
    const title = form.title.trim();
    const description = form.description.trim();
    const category = form.category.trim().toLowerCase();
    const rawPrice = String(form.price ?? "").trim();
    const rawStock = String(form.stock ?? "").trim();
    const price = rawPrice ? Number(form.price) : 0;
    const stock = rawStock ? Number(form.stock) : 0;

    if (targetStatus === PRODUCT_STATUS.PENDING) {
      if (!title || !description || !category) {
        setErrorMessage("Vui lòng nhập title, category và description.");
        return;
      }

      if (!rawPrice || !Number.isFinite(price) || price <= 0) {
        setErrorMessage("Price phải là số lớn hơn 0.");
        return;
      }
    } else if (rawPrice && (!Number.isFinite(price) || price < 0)) {
      setErrorMessage("Price phải là số lớn hơn hoặc bằng 0.");
      return;
    }

    if (!Number.isFinite(stock) || stock < 0) {
      setErrorMessage("Stock phải là số lớn hơn hoặc bằng 0.");
      return;
    }

    if (!vendorEmail) {
      setErrorMessage("Không tìm thấy thông tin vendor đang đăng nhập.");
      return;
    }

    try {
      setSaveIntent(targetStatus);
      setIsSaving(true);

      const linkedThumbnail = normalizeImageSource(form.thumbnailUrl);
      const thumbnail =
        linkedThumbnail || normalizeImageSource(existingThumbnail);
      const hasUploadedGalleryFiles = selectedGalleryFiles.length > 0;
      const linkedGalleryImages = parseImageUrls(form.galleryUrlsText);
      const images = hasUploadedGalleryFiles
        ? []
        : [
            ...new Set([
              ...existingGalleryImages
                .map(normalizeImageSource)
                .filter(Boolean),
              ...linkedGalleryImages,
            ]),
          ];

      if (
        targetStatus === PRODUCT_STATUS.PENDING &&
        !thumbnail &&
        !selectedThumbnailFile
      ) {
        setErrorMessage(
          "Bạn cần upload ảnh đại diện cho sản phẩm hoặc nhập link ảnh.",
        );
        return;
      }

      const colors = selectedCategoryConfig.flags.useColors
        ? normalizeHexColors(form.colorsText)
        : [];
      const sizes = selectedCategoryConfig.flags.useSizes
        ? parseInputList(form.sizesText)
        : [];

      const variantSignatureRegistry = new Set();
      const normalizedVariants = ensureSingleDefaultVariant(
        variantRows.filter((variant) => hasMeaningfulVariantDraft(variant)),
        defaultVariantLocalId,
      )
        .map((variant, index) => {
          const variantPrice = String(variant.price ?? "").trim()
            ? Number(variant.price)
            : price;
          const variantOldPrice = String(variant.oldPrice ?? "").trim()
            ? Number(variant.oldPrice)
            : variantPrice;
          const variantStock = String(variant.stock ?? "").trim()
            ? Number(variant.stock)
            : 0;

          if (
            !Number.isFinite(variantPrice) ||
            variantPrice < 0 ||
            (targetStatus === PRODUCT_STATUS.PENDING && variantPrice <= 0)
          ) {
            throw new Error("Mỗi biến thể cần price lớn hơn 0.");
          }

          if (!Number.isFinite(variantOldPrice) || variantOldPrice < 0) {
            throw new Error("oldPrice của biến thể không hợp lệ.");
          }

          if (!Number.isFinite(variantStock) || variantStock < 0) {
            throw new Error("stock của biến thể phải lớn hơn hoặc bằng 0.");
          }

          const normalizedOptionValues = Object.entries(
            variant.optionValues ?? {},
          ).reduce((result, [key, value]) => {
            const normalizedValue = String(value ?? "").trim();

            if (normalizedValue) {
              result[key] = normalizedValue;
            }

            return result;
          }, {});
          const normalizedAttributes = Object.entries(
            variant.attributes ?? {},
          ).reduce((result, [key, value]) => {
            const normalizedValue = String(value ?? "").trim();

            if (normalizedValue) {
              result[key] = normalizedValue;
            }

            return result;
          }, {});

          if (
            normalizedAttributes.colorHex &&
            !isValidHexColorValue(normalizedAttributes.colorHex)
          ) {
            throw new Error("Color HEX của biến thể không hợp lệ.");
          }

          const variantSignature = buildVariantSignature(
            category,
            normalizedOptionValues,
            normalizedAttributes,
          );

          if (variantSignature && variantSignatureRegistry.has(variantSignature)) {
            throw new Error("Có biến thể bị trùng tổ hợp tùy chọn.");
          }

          if (variantSignature) {
            variantSignatureRegistry.add(variantSignature);
          }

          return {
            sku: resolveVariantSku(
              category,
              title,
              {
                ...variant,
                optionValues: normalizedOptionValues,
                attributes: normalizedAttributes,
              },
              index,
            ),
            title: String(variant.title ?? "").trim(),
            price: variantPrice,
            oldPrice: variantOldPrice,
            stock: variantStock,
            image: String(variant.image ?? "").trim(),
            isDefault: Boolean(variant.isDefault),
            optionValues: normalizedOptionValues,
            attributes: normalizedAttributes,
          };
        })
        .filter(Boolean);

      const resolvedPrice =
        normalizedVariants.length > 0
          ? Math.min(...normalizedVariants.map((variant) => variant.price))
          : price;
      const resolvedOldPrice =
        normalizedVariants.length > 0
          ? Math.max(
              ...normalizedVariants.map((variant) => variant.oldPrice),
              resolvedPrice,
            )
          : price;
      const resolvedStock =
        normalizedVariants.length > 0
          ? normalizedVariants.reduce((sum, variant) => sum + variant.stock, 0)
          : stock;

      if (
        targetStatus === PRODUCT_STATUS.PENDING &&
        selectedCategoryConfig.flags.useSizes &&
        sizes.length === 0 &&
        normalizedVariants.length === 0
      ) {
        setErrorMessage("Danh muc fashion can nhap it nhat 1 size.");
        return;
      }

      const attributes = {};

      if (selectedCategoryConfig.flags.useBrand) {
        attributes.brand = form.brand.trim();
      }

      if (selectedCategoryConfig.flags.useMaterial) {
        attributes.material = form.material.trim();
      }

      if (selectedCategoryConfig.flags.useElectronicsFields) {
        attributes.model = form.model.trim();
        attributes.warrantyMonths = Number(form.warrantyMonths || 0);
      }

      if (selectedCategoryConfig.flags.useFoodFields) {
        attributes.expiryDate = form.expiryDate;
        attributes.weight = form.weight.trim();
      }

      if (selectedCategoryConfig.flags.useHomeFields) {
        attributes.material = form.material.trim();
      }

      const payload = {
        title,
        category,
        description,
        price: resolvedPrice,
        oldPrice: resolvedOldPrice,
        stock: resolvedStock,
        thumbnail,
        thumbnailFile: selectedThumbnailFile,
        gallery: images,
        galleryFiles: selectedGalleryFiles,
        removeThumbnail: editingId
          ? !selectedThumbnailFile && !thumbnail
          : false,
        replaceGallery:
          Boolean(editingId) &&
          (hasUploadedGalleryFiles || images.length === 0),
        colors,
        sizes,
        variants: normalizedVariants,
        vendorEmail,
        shopName: vendorShopName,
        attributes,
        status: targetStatus,
      };

      let savedProduct = null;

      if (editingId) {
        savedProduct = await updateProductById({
          id: editingId,
          updates: {
            ...payload,
          },
        });
      } else {
        savedProduct = await createProduct({
          ...payload,
          reason: null,
          rating: 0,
          reviews: 0,
          discountPercentage: 0,
        });
      }

      if (savedProduct) {
        syncProductCaches(savedProduct);
      }

      resetForm();
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["products", "admin"] }),
        queryClient.invalidateQueries({ queryKey: ["products", "public"] }),
      ]);
    } catch (error) {
      setErrorMessage(
        error?.message ?? "Không thể lưu sản phẩm. Vui lòng thử lại.",
      );
    } finally {
      setSaveIntent("");
      setIsSaving(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    void handleSaveProduct(PRODUCT_STATUS.PENDING);
  }

  async function handleAction(product, action) {
    if (!action) {
      return;
    }

    const targetProductId = String(product?.id ?? "");
    const productStatus = String(product?.status ?? "")
      .trim()
      .toLowerCase();

    if (
      action === "delete" &&
      productStatus !== PRODUCT_STATUS.DRAFT
    ) {
      setErrorMessage("Chỉ có thể xóa sản phẩm ở trạng thái draft.");
      return;
    }

    if (
      ["hide", "show"].includes(action) &&
      productStatus === PRODUCT_STATUS.REJECTED
    ) {
      setErrorMessage("Sản phẩm đã bị admin từ chối nên không thể ẩn/hiện.");
      return;
    }

    try {
      setIsSaving(true);
      setProcessingProductId(targetProductId);
      let updatedProduct = null;

      if (action === "edit") {
        await startEditingProduct(product);
        return;
      }

      if (action === "hide") {
        updatedProduct = await updateProductById({
          id: product.id,
          updates: {
            status: PRODUCT_STATUS.INACTIVE,
            reason: "Vendor hidden",
          },
        });
      }

      if (action === "show") {
        updatedProduct = await updateProductById({
          id: product.id,
          updates: {
            status: PRODUCT_STATUS.ACTIVE,
            reason: null,
          },
        });
      }

      if (action === "delete") {
        await removeProductById(product.id);
        removeProductCaches(targetProductId);

        if (editingId === targetProductId) {
          resetForm();
        }
      } else if (updatedProduct) {
        syncProductCaches(updatedProduct);
      }

      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["products", "admin"] }),
        queryClient.invalidateQueries({ queryKey: ["products", "public"] }),
      ]);
    } catch (error) {
      setErrorMessage(error?.message ?? "Không thể xử lý action sản phẩm.");
    } finally {
      setProcessingProductId("");
      setIsSaving(false);
    }
  }

  function formatStatus(status) {
    const key = String(status ?? "")
      .trim()
      .toLowerCase();

    switch (key) {
      case PRODUCT_STATUS.ACTIVE:
        return "Active";
      case PRODUCT_STATUS.DRAFT:
        return "Draft";
      case PRODUCT_STATUS.PENDING:
        return "Pending";
      case PRODUCT_STATUS.INACTIVE:
        return "Inactive";
      case PRODUCT_STATUS.REJECTED:
        return "Rejected";
      case PRODUCT_STATUS.OUT_OF_STOCK:
        return "Out of stock";
      case PRODUCT_STATUS.BANNED:
        return "Rejected";
      default:
        return "Unknown";
    }
  }

  return (
    <div className={`vendor-products-page ${isSaving ? "is-saving" : ""}`}>
      <section className="vendor-products-card">
        <h2>{editingId ? "Cập nhật sản phẩm" : "Đăng sản phẩm mới"}</h2>
        <form onSubmit={handleSubmit}>
          <fieldset className="vendor-products-fieldset" disabled={isSaving}>
            <div className="vendor-products-two-col">
              <div className="vendor-products-left">
                <div className="vendor-products-form">
                  <label>
                    Title
                    <input
                      name="title"
                      type="text"
                      value={form.title}
                      onChange={handleInputChange}
                    />
                  </label>

                  <label>
                    Category
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleInputChange}
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {categoryOptions.find((item) => item.value === category)
                            ?.label ?? category}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="is-full">
                    Description
                    <textarea
                      name="description"
                      rows="3"
                      value={form.description}
                      onChange={handleInputChange}
                    />
                  </label>

                  <label>
                    Price
                    <input
                      name="price"
                      type="number"
                      min="1"
                      value={form.price}
                      onChange={handleInputChange}
                    />
                  </label>

                  <label>
                    Stock
                    <input
                      name="stock"
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={handleInputChange}
                    />
                  </label>

                  <label className="is-full">
                    <div>Upload thumbnail</div>
                    <div className="vendor-products-file-picker">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSelectThumbnailFile}
                      />
                      <input
                        name="thumbnailUrl"
                        type="url"
                        placeholder="https://example.com/thumbnail.jpg"
                        value={form.thumbnailUrl}
                        onChange={handleInputChange}
                      />


                      {existingThumbnail && (
                        <div className="vendor-products-image-list">
                          <button
                            type="button"
                            className="vendor-products-image-thumb"
                            onClick={handleRequestRemoveExistingThumbnail}
                            title={`Xóa ảnh ${getStoredImageLabel(
                              existingThumbnail,
                              "Thumbnail hiện tại",
                            )}`}
                          >
                            <img src={existingThumbnail} alt="Current thumbnail" />
                          </button>
                        </div>
                      )}

                      {selectedThumbnailFile && (
                        <div className="vendor-products-file-list">
                          <button
                            type="button"
                            className="vendor-products-file-chip"
                            onClick={handleRemoveSelectedThumbnailFile}
                            title={`Xóa ảnh ${selectedThumbnailFile.name}`}
                          >
                            {selectedThumbnailFile.name}
                          </button>
                        </div>
                      )}
                    </div>
                  </label>

                  <label className="is-full">
                    Upload gallery images
                    <div className="vendor-products-file-picker">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleSelectGalleryFiles}
                      />
                      <textarea
                        name="galleryUrlsText"
                        rows="3"
                        placeholder={
                          "https://example.com/gallery-1.jpg\nhttps://example.com/gallery-2.jpg"
                        }
                        value={form.galleryUrlsText}
                        onChange={handleInputChange}
                      />
                    
                      {existingGalleryImages.length > 0 && (
                        <div className="vendor-products-image-list">
                          {existingGalleryImages.map((image, index) => (
                            <button
                              key={`${String(image)}-${index}`}
                              type="button"
                              className="vendor-products-image-thumb"
                              onClick={() =>
                                handleRequestRemoveExistingGalleryImage(image, index)
                              }
                              title={`Xóa ảnh ${getStoredImageLabel(
                                image,
                                `Gallery image ${index + 1}`,
                              )}`}
                            >
                              <img src={image} alt={`Current gallery ${index + 1}`} />
                            </button>
                          ))}
                        </div>
                      )}

                      {selectedGalleryFiles.length > 0 && (
                        <div className="vendor-products-file-list">
                          {selectedGalleryFiles.map((file) => (
                            <button
                              key={getSelectedFileKey(file)}
                              type="button"
                              className="vendor-products-file-chip"
                              onClick={() => handleRemoveSelectedGalleryFile(file)}
                              title={`Xóa ảnh ${file.name}`}
                            >
                              {file.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>

                  {selectedCategoryConfig.flags.useColors && (
                    <label>
                      Colors (hex)
                      <input
                        name="colorsText"
                        type="text"
                        placeholder="#000000, #ff8800"
                        value={form.colorsText}
                        onChange={handleInputChange}
                      />
                    </label>
                  )}

                  {selectedCategoryConfig.flags.useSizes && (
                    <label>
                      Sizes
                      <input
                        name="sizesText"
                        type="text"
                        placeholder="S, M, L hoặc Standard, Combo..."
                        value={form.sizesText}
                        onChange={handleInputChange}
                      />
                    </label>
                  )}

                  {selectedCategoryConfig.flags.useBrand && (
                    <label>
                      Brand
                      <input
                        name="brand"
                        type="text"
                        placeholder={
                          form.category === "fashion-nam" ||
                          form.category === "fashion-nu"
                            ? "VD: Zara, H&M"
                            : "VD: Samsung, Lock&Lock, Orion"
                        }
                        value={form.brand}
                        onChange={handleInputChange}
                      />
                    </label>
                  )}

                  {selectedCategoryConfig.flags.useMaterial && (
                    <label>
                      Material
                      <input
                        name="material"
                        type="text"
                        placeholder={
                          form.category === "do-gia-dung"
                            ? "Nhựa, gỗ, inox..."
                            : "Cotton, Linen..."
                        }
                        value={form.material}
                        onChange={handleInputChange}
                      />
                    </label>
                  )}

                  {selectedCategoryConfig.flags.useElectronicsFields && (
                    <>
                      <label>
                        Model
                        <input
                          name="model"
                          type="text"
                          placeholder="VD: X200 Pro"
                          value={form.model}
                          onChange={handleInputChange}
                        />
                      </label>

                      <label>
                        Warranty (months)
                        <input
                          name="warrantyMonths"
                          type="number"
                          min="0"
                          value={form.warrantyMonths}
                          onChange={handleInputChange}
                        />
                      </label>
                    </>
                  )}

                  {selectedCategoryConfig.flags.useFoodFields && (
                    <>
                      <label>
                        Expiry date
                        <input
                          name="expiryDate"
                          type="date"
                          value={form.expiryDate}
                          onChange={handleInputChange}
                        />
                      </label>

                      <label>
                        Weight / Volume
                        <input
                          name="weight"
                          type="text"
                          placeholder="500g, 1L..."
                          value={form.weight}
                          onChange={handleInputChange}
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>

              <div className="vendor-products-right">
                <div className="vendor-products-variants">
                  <div className="vendor-products-variants__header">
                    <div>
                      <strong>Variants</strong>
                      <p>
                        Dùng Generate variants để sinh nhanh các tổ hợp. Sau đó bạn có
                        thể chỉnh từng biến thể và lưu toàn bộ cùng sản phẩm.
                      </p>
                    </div>
                  </div>

                  <div className="vendor-products-variant-generator">
                    <div className="vendor-products-variant-generator__grid">
                      {selectedVariantFields.map((field) => (
                        <label key={`generator-${field.key}`}>
                          {field.label} values
                          <input
                            type="text"
                            placeholder={`VD: ${field.label} 1, ${field.label} 2`}
                            value={variantGeneratorInputs[field.key] ?? ""}
                            onChange={(event) =>
                              handleVariantGeneratorChange(field.key, event.target.value)
                            }
                          />
                        </label>
                      ))}
                      {selectedVariantAttributeFields.map((field) => (
                        <label key={`generator-attr-${field.key}`}>
                          {field.label}
                          <input
                            type="text"
                            placeholder={`VD: ${field.label} 1, ${field.label} 2`}
                            value={variantGeneratorInputs[field.key] ?? ""}
                            onChange={(event) =>
                              handleVariantGeneratorChange(field.key, event.target.value)
                            }
                          />
                        </label>
                      ))}
                    </div>

                    <div className="vendor-products-variant-generator__actions">
                      <button
                        type="button"
                        className="vendor-products-variants__generate-btn"
                        onClick={handleGenerateVariants}
                      >
                        Generate variants
                      </button>
                    </div>
                  </div>

                  <div className="vendor-products-variant-card">
                    <div className="vendor-products-variant-card__header">
                      <strong>
                        {editingVariantLocalId ? "Edit variant" : "Variant editor"}
                      </strong>
                      {editingVariantLocalId && (
                        <button
                          type="button"
                          className="vendor-products-variant-card__remove-btn"
                          onClick={resetVariantDraft}
                        >
                          Cancel edit
                        </button>
                      )}
                    </div>

                    <div className="vendor-products-variant-grid">
                      {selectedVariantFields.map((field) => (
                        <label key={`draft-${field.key}`}>
                          {field.label}
                          <input
                            type="text"
                            value={variantDraft.optionValues?.[field.key] ?? ""}
                            onChange={(event) =>
                              handleVariantOptionChange(field.key, event.target.value)
                            }
                          />
                        </label>
                      ))}

                      {hasColorVariantField(form.category) && (
                        <label key="draft-color-hex">
                          Color HEX (optional)
                          <input
                            type="text"
                            placeholder="#ff0000"
                            value={variantDraft.attributes?.colorHex ?? ""}
                            onChange={(event) =>
                              handleVariantAttributeChange("colorHex", event.target.value)
                            }
                          />
                        </label>
                      )}

                      {selectedVariantAttributeFields.map((field) => (
                        <label key={`draft-attr-${field.key}`}>
                          {field.label}
                          <input
                            type="text"
                            value={variantDraft.attributes?.[field.key] ?? ""}
                            onChange={(event) =>
                              handleVariantAttributeChange(field.key, event.target.value)
                            }
                          />
                        </label>
                      ))}

                      <label>
                        SKU
                        <input
                          type="text"
                          value={variantDraft.sku}
                          onChange={(event) =>
                            handleVariantFieldChange("sku", event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Variant title
                        <input
                          type="text"
                          value={variantDraft.title}
                          onChange={(event) =>
                            handleVariantFieldChange("title", event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Price
                        <input
                          type="number"
                          min="0"
                          value={variantDraft.price}
                          onChange={(event) =>
                            handleVariantFieldChange("price", event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Old price
                        <input
                          type="number"
                          min="0"
                          value={variantDraft.oldPrice}
                          onChange={(event) =>
                            handleVariantFieldChange("oldPrice", event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Stock
                        <input
                          type="number"
                          min="0"
                          value={variantDraft.stock}
                          onChange={(event) =>
                            handleVariantFieldChange("stock", event.target.value)
                          }
                        />
                      </label>

                      <label className="is-full">
                        Variant image URL
                        <input
                          type="url"
                          placeholder="https://example.com/variant-image.jpg"
                          value={variantDraft.image}
                          onChange={(event) =>
                            handleVariantFieldChange("image", event.target.value)
                          }
                        />
                      </label>

                      <label className="vendor-products-checkbox">
                        <input
                          type="checkbox"
                          checked={Boolean(variantDraft.isDefault)}
                          onChange={(event) =>
                            handleVariantFieldChange("isDefault", event.target.checked)
                          }
                        />
                        <span>Set as default variant</span>
                      </label>
                    </div>

                    <div className="vendor-products-variant-editor__actions">
                      <button
                        type="button"
                        className="vendor-products-variants__add-btn"
                        onClick={handleSaveVariantDraft}
                      >
                        {editingVariantLocalId ? "Update variant" : "Add to list"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="vendor-products-variant-summary">
              <div className="vendor-products-variant-summary__header">
                <strong>Variant list</strong>
                <span>{variantRows.length} variants</span>
              </div>

              <div>
                <span>Bulk apply from editor:</span>
                <div className="vendor-products-variant-summary__bulk-actions">
                  <button
                    type="button"
                    className="vendor-products-variant-summary__action-btn vendor-products-variant-summary__action-btn--secondary"
                    onClick={() => handleBulkApply("price")}
                  >
                    Apply price
                  </button>
                  <button
                    type="button"
                    className="vendor-products-variant-summary__action-btn vendor-products-variant-summary__action-btn--secondary"
                    onClick={() => handleBulkApply("oldPrice")}
                  >
                    Apply old price
                  </button>
                  <button
                    type="button"
                    className="vendor-products-variant-summary__action-btn vendor-products-variant-summary__action-btn--secondary"
                    onClick={() => handleBulkApply("stock")}
                  >
                    Apply stock
                  </button>
                  <button
                    type="button"
                    className="vendor-products-variant-summary__action-btn vendor-products-variant-summary__action-btn--secondary"
                    onClick={() => handleBulkApply("image")}
                  >
                    Apply image
                  </button>
                </div>
              </div>

              {variantRows.length === 0 ? (
                <p className="vendor-products-variant-summary__empty">
                  Chưa có biến thể nào trong danh sách. Bạn có thể generate hoặc
                  thêm thủ công từ editor phía trên.
                </p>
              ) : (
                <div className="vendor-products-variant-table-wrapper">
                  <div className="vendor-products-variant-table">
                    <div className="vendor-products-variant-table__row vendor-products-variant-table__head">
                      <span>Image</span>
                      <span>Variant</span>
                      <span>SKU</span>
                      <span>Price</span>
                      <span>Old price</span>
                      <span>Stock</span>
                      <span>Status</span>
                      <span>Default</span>
                      <span>Actions</span>
                    </div>
                    {variantRows.map((variant, index) => {
                      const variantImage =
                        normalizeImageSource(variant.image) ||
                        normalizeImageSource(form.thumbnailUrl) ||
                        existingThumbnail;
                      const displayedSku = resolveVariantSku(
                        form.category,
                        form.title,
                        variant,
                        index,
                      );
                      const variantPrice = Number(
                        String(variant.price ?? "").trim() || form.price || 0,
                      );
                      const variantOldPrice = Number(
                        String(variant.oldPrice ?? "").trim() ||
                          variant.price ||
                          form.price ||
                          0,
                      );
                      const variantStock = Number(
                        String(variant.stock ?? "").trim() || 0,
                      );

                      const isDuplicate = duplicateLocalIds.has(
                        String(variant.localId),
                      );

                      return (
                        <div
                          key={variant.localId}
                          className={`vendor-products-variant-table__row ${isDuplicate ? "is-duplicate" : ""}`}
                        >
                          <span className="vendor-products-variant-table__media">
                            <div className="vendor-products-variant-summary__media">
                              {variantImage ? (
                                <img src={variantImage} alt={buildVariantLabel(form.category, variant)} />
                              ) : (
                                <span>No image</span>
                              )}
                            </div>
                          </span>
                          <span>{buildVariantLabel(form.category, variant)}</span>
                          <span>{displayedSku}</span>
                          <span>
                            <input
                              type="number"
                              min="0"
                              value={String(variant.price ?? "")}
                              onChange={(e) =>
                                handleInlineVariantChange(
                                  variant.localId,
                                  "price",
                                  e.target.value,
                                )
                              }
                            />
                          </span>
                          <span>
                            <input
                              type="number"
                              min="0"
                              value={String(variant.oldPrice ?? "")}
                              onChange={(e) =>
                                handleInlineVariantChange(
                                  variant.localId,
                                  "oldPrice",
                                  e.target.value,
                                )
                              }
                            />
                          </span>
                          <span>
                            <input
                              type="number"
                              min="0"
                              value={String(variant.stock ?? "")}
                              onChange={(e) =>
                                handleInlineVariantChange(
                                  variant.localId,
                                  "stock",
                                  e.target.value,
                                )
                              }
                            />
                          </span>
                          <span>
                            <span
                              className={`vendor-products-variant-summary__badge ${
                                variantStock > 0
                                  ? "vendor-products-variant-summary__badge--stock"
                                  : "vendor-products-variant-summary__badge--out"
                              }`}
                            >
                              {variantStock > 0 ? "In stock" : "Out of stock"}
                            </span>
                          </span>
                          <span>
                            <input
                              type="radio"
                              name="vendor-default-variant"
                              checked={!!variant.isDefault}
                              onChange={() => handleSetDefaultVariant(variant.localId)}
                              aria-label="Set as default variant"
                            />
                          </span>
                          <span className="vendor-products-variant-table__actions">
                            <span className="vendor-action-control">
                              <button
                                type="button"
                                className="vendor-action-btn vendor-action-btn--icon vendor-action-btn--edit"
                                onClick={() => handleEditVariant(variant.localId)}
                                title="Edit variant"
                                aria-label="Edit variant"
                              >
                                <EditIcon />
                              </button>
                              <button
                                type="button"
                                className="vendor-action-btn vendor-action-btn--icon vendor-action-btn--delete"
                                onClick={() => handleRemoveVariantRow(variant.localId)}
                                title="Delete variant"
                                aria-label="Delete variant"
                              >
                                <XIcon />
                              </button>
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {errorMessage && (
              <p className="vendor-products-error">{errorMessage}</p>
            )}

            <div className="vendor-products-actions is-full">
              <button type="button" onClick={resetForm} disabled={isSaving}>
                Reset
              </button>
              {canUpdateLive && (
                <button
                  type="button"
                  disabled={isSaving}
                  className="vendor-products-actions__live-btn"
                  onClick={() => {
                    void handleSaveProduct(PRODUCT_STATUS.ACTIVE);
                  }}
                >
                  Update live (keep Active)
                </button>
              )}
              <button
                type="button"
                disabled={isSaving}
                className="vendor-products-actions__draft-btn"
                onClick={() => {
                  void handleSaveProduct(PRODUCT_STATUS.DRAFT);
                }}
              >
                {isSaving && saveIntent === PRODUCT_STATUS.DRAFT
                  ? "Saving draft..."
                  : "Save draft"}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={isSaving ? "is-saving" : ""}
              >
                {isSaving && saveIntent === PRODUCT_STATUS.PENDING
                  ? "Submitting..."
                  : "Submit product"}
              </button>
            </div>
          </fieldset>
        </form>
      </section>
      <section className="vendor-products-card">
        <h2>Danh sách sản phẩm</h2>

        {isLoading && <p>Đang tải dữ liệu...</p>}
        {isError && <p>Không thể tải danh sách sản phẩm.</p>}

        {!isLoading && !isError && (
          <div className="vendor-products-table">
            <div className="vendor-products-table__row vendor-products-table__head">
              <span>#</span>
              <span>Item</span>
              <span>Price</span>
              <span>Stock</span>
              <span>Status</span>
              <span>Reason</span>
              <span>Action</span>
            </div>

            {paginatedVendorProducts.map((product, index) => {
              const isRowUpdating =
                processingProductId &&
                String(processingProductId) === String(product.id);
              const isRejected =
                String(product?.status ?? "")
                  .trim()
                  .toLowerCase() === PRODUCT_STATUS.REJECTED;
              const isInactive =
                String(product?.status ?? "")
                  .trim()
                  .toLowerCase() === PRODUCT_STATUS.INACTIVE;
              const isDraft =
                String(product?.status ?? "")
                  .trim()
                  .toLowerCase() === PRODUCT_STATUS.DRAFT;

              return (
                <div className="vendor-products-table__row" key={product.id}>
                  <span>{(currentPage - 1) * itemsPerPage + index + 1}</span>
                  <span>
                    <Link to={`/product/${product.id}`} state={{ product }}>
                      {product.title}
                    </Link>
                  </span>
                  <span>${Number(product.price ?? 0)}</span>
                  <span>{product.stock ?? 0}</span>
                  <span>
                    <span
                      className={`vendor-status-pill vendor-status-pill--${String(
                        product.status,
                      ).replaceAll("_", "-")}`}
                    >
                      {formatStatus(product.status)}
                    </span>
                  </span>
                  <span className="vendor-reason-text">
                    {product.reason ? String(product.reason) : "-"}
                  </span>
                  <span>
                    <span className="vendor-action-control">
                      {isRowUpdating && (
                        <span className="vendor-action-spinner" />
                      )}

                      <button
                        type="button"
                        className="vendor-action-btn vendor-action-btn--icon vendor-action-btn--edit"
                        disabled={isSaving}
                        onClick={() => handleAction(product, "edit")}
                        title="Edit"
                        aria-label="Edit product"
                      >
                        <EditIcon />
                      </button>

                      <button
                        type="button"
                        className={`vendor-action-btn vendor-action-btn--icon ${
                          isInactive
                            ? "vendor-action-btn--show"
                            : "vendor-action-btn--hide"
                        }`}
                        disabled={isSaving || isRejected}
                        onClick={() =>
                          handleAction(product, isInactive ? "show" : "hide")
                        }
                        title={
                          isRejected
                            ? "Sản phẩm bị admin từ chối nên không thể ẩn/hiện"
                            : isInactive
                              ? "Show"
                              : "Hide"
                        }
                        aria-label={
                          isRejected
                            ? "Hide show disabled for rejected product"
                            : isInactive
                              ? "Show product"
                              : "Hide product"
                        }
                      >
                        {isInactive ? <EyeIcon /> : <EyeOffIcon />}
                      </button>

                      <button
                        type="button"
                        className="vendor-action-btn vendor-action-btn--icon vendor-action-btn--delete"
                        disabled={isSaving || !isDraft}
                        onClick={() => handleAction(product, "delete")}
                        title={
                          isDraft
                            ? "Delete"
                            : "Chỉ có thể xóa sản phẩm ở trạng thái draft"
                        }
                        aria-label={
                          isDraft
                            ? "Delete product"
                            : "Delete disabled for non-draft product"
                        }
                      >
                        <XIcon />
                      </button>
                    </span>
                  </span>
                </div>
              );
            })}

            {paginatedVendorProducts.length === 0 &&
              vendorProducts.length > 0 && (
                <p className="vendor-products-empty">
                  Không có sản phẩm nào ở trang này.
                </p>
              )}

            {vendorProducts.length === 0 && (
              <p className="vendor-products-empty">
                Bạn chưa có sản phẩm nào. Hãy đăng sản phẩm đầu tiên.
              </p>
            )}

            {totalPages > 1 && (
              <div className="vendor-pagination">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="vendor-pagination-btn"
                >
                  Previous
                </button>

                <span className="vendor-pagination-info">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="vendor-pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </section>
      {imagePendingRemoval && (
        <div className="vendor-products-modal" role="dialog" aria-modal="true">
          <div
            className="vendor-products-modal__backdrop"
            onClick={handleCancelImageRemoval}
          />
          <div className="vendor-products-modal__card">
            <p className="vendor-products-modal__title">
              Bạn muốn xóa ảnh này?
            </p>
            <div className="vendor-products-modal__actions">
              <button
                type="button"
                className="vendor-products-modal__button vendor-products-modal__button--danger"
                onClick={handleConfirmImageRemoval}
              >
                Xóa
              </button>
              <button
                type="button"
                className="vendor-products-modal__button vendor-products-modal__button--neutral"
                onClick={handleCancelImageRemoval}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
