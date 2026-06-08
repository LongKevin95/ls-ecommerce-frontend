import { fetchResourceDocument, updateResourceData } from "./resourceApi";
import apiClient, { extractApiPayload } from "./apiClient";
import { buildShopFormData } from "../utils/formData";

const SHOPS_RESOURCE_NAME = "shops";
const ECOMMERCE_RESOURCE_NAME = "ecommerce-data";

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeCategory(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeShop(shop) {
  const normalizedEmail = normalizeEmail(
    shop?.email ?? shop?.contactEmail ?? shop?.vendorEmail ?? "",
  );
  const normalizedName =
    normalizeText(shop?.shopName ?? shop?.name) ||
    (normalizedEmail ? normalizedEmail.split("@")[0] : "Vendor Shop");

  return {
    ...shop,
    id: normalizeText(shop?.id ?? shop?._id),
    shopName: normalizedName,
    name: normalizeText(shop?.name ?? normalizedName) || normalizedName,
    email: normalizedEmail,
    vendorEmail: normalizedEmail,
    description: normalizeText(shop?.description),
    logo: normalizeText(shop?.logo ?? shop?.avatarUrl),
    banner: normalizeText(shop?.banner),
    avatarUrl: normalizeText(shop?.avatarUrl ?? shop?.logo),
    contactEmail: normalizeEmail(shop?.contactEmail ?? normalizedEmail),
    phone: normalizeText(shop?.phone),
    address:
      shop?.address && typeof shop.address === "object"
        ? {
            addressLine1: normalizeText(
              shop.address?.addressLine1 ?? shop.address?.address,
            ),
            city: normalizeText(shop.address?.city),
            state: normalizeText(shop.address?.state),
            zipCode: normalizeText(shop.address?.zipCode),
            country: normalizeText(shop.address?.country),
          }
        : null,
    categories: Array.isArray(shop?.categories) ? shop.categories : [],
    totalProducts: Number(shop?.totalProducts ?? 0),
    inStockProducts: Number(shop?.inStockProducts ?? 0),
    createdAt: shop?.createdAt ?? null,
    updatedAt: shop?.updatedAt ?? null,
  };
}

function resolveShopsSnapshot(
  dataItem,
  resourceName = ECOMMERCE_RESOURCE_NAME,
) {
  if (Array.isArray(dataItem?.shops)) {
    return {
      payload: dataItem,
      dataId: dataItem?._id ?? null,
      shops: dataItem.shops,
      resourceName,
      storage: "direct",
      nestedIndex: -1,
    };
  }

  const nestedList = Array.isArray(dataItem?.data) ? dataItem.data : [];
  const nestedIndex = nestedList.findIndex((item) =>
    Array.isArray(item?.shops),
  );

  if (nestedIndex < 0) {
    return null;
  }

  return {
    payload: dataItem,
    dataId: dataItem?._id ?? null,
    shops: nestedList[nestedIndex].shops,
    resourceName,
    storage: "nested",
    nestedIndex,
  };
}

function findShopsSnapshotInDocument(
  document,
  resourceName = ECOMMERCE_RESOURCE_NAME,
) {
  const dataList = Array.isArray(document?.data) ? document.data : [];

  for (let index = dataList.length - 1; index >= 0; index -= 1) {
    const snapshot = resolveShopsSnapshot(dataList[index], resourceName);

    if (snapshot) {
      return snapshot;
    }
  }

  return null;
}

function resolveProductsSnapshot(dataItem) {
  if (Array.isArray(dataItem?.products)) {
    return {
      products: dataItem.products,
    };
  }

  const nestedList = Array.isArray(dataItem?.data) ? dataItem.data : [];
  const nestedItem = nestedList.find((item) => Array.isArray(item?.products));

  if (!nestedItem) {
    return null;
  }

  return {
    products: nestedItem.products,
  };
}

async function fetchFallbackShopsFromProducts() {
  const document = await fetchResourceDocument(ECOMMERCE_RESOURCE_NAME).catch(
    () => null,
  );
  const dataList = Array.isArray(document?.data) ? document.data : [];

  for (let index = dataList.length - 1; index >= 0; index -= 1) {
    const snapshot = resolveProductsSnapshot(dataList[index]);

    if (snapshot) {
      return buildShopAggregates(snapshot.products, []);
    }
  }

  return [];
}

async function fetchShopsSnapshot() {
  const document = await fetchResourceDocument(ECOMMERCE_RESOURCE_NAME).catch(
    () => null,
  );
  const snapshot = findShopsSnapshotInDocument(
    document,
    ECOMMERCE_RESOURCE_NAME,
  );

  if (snapshot) {
    return snapshot;
  }

  return {
    payload: null,
    dataId: null,
    shops: [],
    resourceName: ECOMMERCE_RESOURCE_NAME,
    storage: "nested",
    nestedIndex: -1,
  };
}

function buildShopAggregates(products, existingShops = []) {
  const shopIdByVendorEmail = new Map();
  const createdAtByVendorEmail = new Map();
  const shopRowsByVendorEmail = new Map();

  existingShops.forEach((shop) => {
    const vendorEmail = normalizeEmail(shop?.vendorEmail);

    if (!vendorEmail) {
      return;
    }

    if (shop?.id) {
      shopIdByVendorEmail.set(vendorEmail, shop.id);
    }

    if (shop?.createdAt) {
      createdAtByVendorEmail.set(vendorEmail, shop.createdAt);
    }
  });

  products.forEach((product, index) => {
    const vendorEmail = normalizeEmail(product?.vendorEmail);

    if (!vendorEmail) {
      return;
    }

    const currentRow = shopRowsByVendorEmail.get(vendorEmail) ?? {
      id:
        shopIdByVendorEmail.get(vendorEmail) ?? `shop-${vendorEmail}-${index}`,
      shopName:
        normalizeText(product?.shopName) ||
        vendorEmail.split("@")[0] ||
        "My Shop",
      vendorEmail,
      categories: new Set(),
      totalProducts: 0,
      inStockProducts: 0,
      createdAt:
        createdAtByVendorEmail.get(vendorEmail) ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const category = normalizeCategory(product?.category);

    currentRow.totalProducts += 1;
    currentRow.inStockProducts += Number(product?.stock ?? 0) > 0 ? 1 : 0;

    if (category) {
      currentRow.categories.add(category);
    }

    if (
      !normalizeText(currentRow.shopName) &&
      normalizeText(product?.shopName)
    ) {
      currentRow.shopName = normalizeText(product.shopName);
    }

    currentRow.updatedAt = new Date().toISOString();
    shopRowsByVendorEmail.set(vendorEmail, currentRow);
  });

  return Array.from(shopRowsByVendorEmail.values())
    .map((shop) => ({
      ...shop,
      categories: Array.from(shop.categories),
    }))
    .sort((firstShop, secondShop) =>
      firstShop.vendorEmail.localeCompare(secondShop.vendorEmail),
    );
}

function buildShopsPayload(snapshot, nextShops) {
  const payload = snapshot?.payload ?? null;

  if (snapshot?.storage === "nested") {
    const currentData = Array.isArray(payload?.data) ? payload.data : [];
    const nextData =
      snapshot.nestedIndex >= 0
        ? currentData.map((item, index) =>
            index === snapshot.nestedIndex
              ? { ...item, shops: nextShops }
              : item,
          )
        : currentData;

    return {
      ...(payload ?? {}),
      data: nextData,
    };
  }

  return {
    ...(payload ?? {}),
    shops: nextShops,
  };
}

async function persistShops(snapshot, shops) {
  if (!snapshot?.payload || !snapshot?.dataId) {
    return shops;
  }

  await updateResourceData({
    resourceName: snapshot.resourceName ?? ECOMMERCE_RESOURCE_NAME,
    dataId: snapshot.dataId,
    payload: buildShopsPayload(snapshot, shops),
  });

  return shops;
}

export async function getShops() {
  try {
    const response = await apiClient.get("/shops");
    const payload = extractApiPayload(response);
    if (Array.isArray(payload)) {
      return payload.map(normalizeShop);
    }
  } catch {
    return fetchFallbackShopsFromProducts();
  }

  const { shops } = await fetchShopsSnapshot();

  if (Array.isArray(shops) && shops.length > 0) {
    return shops.map(normalizeShop);
  }

  return fetchFallbackShopsFromProducts();
}

export async function getMyShop() {
  const response = await apiClient.get("/shops/me");
  const payload = extractApiPayload(response);

  return payload ? normalizeShop(payload) : null;
}

export async function updateMyShop(updates = {}) {
  const response = await apiClient.put("/shops/me", buildShopFormData(updates));
  return normalizeShop(extractApiPayload(response));
}

export async function syncShopsFromProducts(products) {
  const snapshot = await fetchShopsSnapshot();
  const rebuiltShops = buildShopAggregates(
    Array.isArray(products) ? products : [],
    Array.isArray(snapshot?.shops) ? snapshot.shops : [],
  );

  await persistShops(snapshot, rebuiltShops).catch(() => rebuiltShops);

  return rebuiltShops;
}

export async function rebuildShopsFromCurrentProducts(products) {
  await syncShopsFromProducts(products);
}
