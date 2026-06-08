import { memo, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";

import { formatProductCategoryLabel } from "../../api/productApi";
import { useShopsQuery } from "../../hooks/useShopsQuery";
import { useProductsQuery } from "../../hooks/useProductsQuery";
import "./Shop.css";

const SHOPS_SNAPSHOT_KEY = "ls-shops-vendors-snapshot";

function readStoredArray(storageKey) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawData = window.localStorage.getItem(storageKey);

    if (!rawData) {
      return [];
    }

    const parsedData = JSON.parse(rawData);
    return Array.isArray(parsedData) ? parsedData : [];
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }
}

function writeStoredArray(storageKey, items) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    return;
  }
}

function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeCategory(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

const ShopCard = memo(({ vendor }) => {
  return (
    <article className="shop-card">
      <div className="shop-card__head">
        <div className="shop-card__avatar" aria-hidden="true">
          {vendor.avatarUrl ? (
            <img src={vendor.avatarUrl} alt={vendor.shopName} />
          ) : (
            <span>{String(vendor.shopName).charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="shop-card__identity">
          <h3>{vendor.shopName}</h3>
          <small>{vendor.name}</small>
        </div>
      </div>
      <p className="shop-card__email">{vendor.email}</p>
      <div className="shop-card__categories">
        <strong className="shop-card__categories-title">Categories</strong>
        <div className="shop-card__categories-list">
          {vendor.categories.length > 0 ? (
            vendor.categories.map((category) => (
              <span
                key={`${vendor.email}-${category}`}
                className="shop-card__meta"
              >
                {category}
              </span>
            ))
          ) : (
            <small className="shop-card__categories-empty">
              No categories yet
            </small>
          )}
        </div>
      </div>
      <small className="shop-card__meta shop-card__meta--products">
        {vendor.totalProducts} products
      </small>
      <Link
        className="shop-card__action"
        to={`/shops/${encodeURIComponent(vendor.id)}`}
      >
        View shop
      </Link>
    </article>
  );
});

const ShopCardSkeleton = () => {
  return (
    <article className="shop-card shop-card--skeleton">
      <div className="shop-card__head">
        <div className="shop-card__avatar" aria-hidden="true">
          <span />
        </div>
        <div className="shop-card__identity">
          <h3 />
          <small />
        </div>
      </div>
      <p className="shop-card__email" />
      <div className="shop-card__categories">
        <strong className="shop-card__categories-title" />
        <div className="shop-card__categories-list">
          {Array.from({ length: 3 }).map((_, index) => (
            <span
              key={`skeleton-category-${index}`}
              className="shop-card__meta"
            />
          ))}
        </div>
      </div>
      <small className="shop-card__meta shop-card__meta--products" />
      <Link className="shop-card__action" to="#" />
    </article>
  );
};

export default function ShopDirectory() {
  const storedVendorRows = useMemo(
    () => readStoredArray(SHOPS_SNAPSHOT_KEY),
    [],
  );

  const {
    data: shopsData,
    isLoading: isShopsLoading,
    isError: isShopsError,
    error: shopsError,
  } = useShopsQuery();
  const {
    data: productsData,
    isLoading: isProductsLoading,
    isError: isProductsError,
    error: productsError,
  } = useProductsQuery();

  const shops = useMemo(
    () => (Array.isArray(shopsData) ? shopsData : []),
    [shopsData],
  );
  const products = useMemo(
    () => (Array.isArray(productsData) ? productsData : []),
    [productsData],
  );
  const hasFreshData = useMemo(
    () => Array.isArray(shopsData) && Array.isArray(productsData),
    [shopsData, productsData],
  );

  const productSummaryByShop = useMemo(() => {
    const summaryMap = new Map();

    products.forEach((product) => {
      const shopId = String(product?.shopId ?? "").trim();

      if (!shopId) {
        return;
      }

      const currentSummary = summaryMap.get(shopId) ?? {
        totalProducts: 0,
        categories: new Set(),
      };

      currentSummary.totalProducts += 1;

      const category = normalizeCategory(product?.category);
      if (category) {
        currentSummary.categories.add(category);
      }

      summaryMap.set(shopId, currentSummary);
    });

    return summaryMap;
  }, [products]);

  const liveVendorRows = useMemo(() => {
    return shops
      .map((item) => {
        const shopId = String(item?.id ?? "").trim();
        const email = normalizeEmail(item?.email);
        const productSummary = productSummaryByShop.get(shopId);

        return {
          id: shopId,
          name: item?.name ?? (email ? email.split("@")[0] : "Vendor"),
          shopName:
            item?.shopName ||
            item?.name ||
            (email ? email.split("@")[0] : "Vendor Shop"),
          avatarUrl: String(item?.avatarUrl ?? "").trim(),
          email,
          totalProducts: productSummary?.totalProducts ?? 0,
          categories:
            productSummary?.categories && productSummary.categories.size > 0
              ? Array.from(productSummary.categories).map((category) =>
                  formatProductCategoryLabel(category),
                )
              : Array.isArray(item?.categories)
                ? item.categories.map((category) =>
                    formatProductCategoryLabel(category),
                  )
                : [],
        };
      })
      .filter((item) => item.id);
  }, [productSummaryByShop, shops]);

  useEffect(() => {
    if (!hasFreshData) {
      return;
    }

    writeStoredArray(SHOPS_SNAPSHOT_KEY, liveVendorRows);
  }, [hasFreshData, liveVendorRows]);

  const vendorRows = hasFreshData ? liveVendorRows : storedVendorRows;
  const hasSnapshotRows = storedVendorRows.length > 0;
  const isPageLoading = !hasFreshData && (isShopsLoading || isProductsLoading);
  const shouldShowSkeletons = isPageLoading && !hasSnapshotRows;
  const shouldShowError =
    !vendorRows.length && !isPageLoading && (isShopsError || isProductsError);
  const shouldShowEmpty =
    !vendorRows.length && !isPageLoading && !isShopsError && !isProductsError;
  const headerCountLabel = shouldShowSkeletons
    ? "..."
    : `${vendorRows.length} vendors`;
  const errorMessage =
    shopsError?.message ??
    productsError?.message ??
    "Khong the tai danh sach shop.";

  return (
    <main className="shop-page o-container">
      <nav className="shop-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>&gt;</span>
        <strong>Shops</strong>
      </nav>

      <div className="shop-header">
        <h1>All Vendor Shops</h1>
        <span>{headerCountLabel}</span>
      </div>

      {shouldShowError ? (
        <p className="shop-empty">{errorMessage}</p>
      ) : shouldShowEmpty ? (
        <p className="shop-empty">Chua co shop nao kha dung.</p>
      ) : (
        <section
          className={`shop-grid ${shouldShowSkeletons ? "shop-grid--loading" : ""}`}
        >
          {vendorRows.map((vendor) => (
            <ShopCard key={vendor.id ?? vendor.email} vendor={vendor} />
          ))}
          {shouldShowSkeletons
            ? Array.from({ length: 6 }).map((_, index) => (
                <ShopCardSkeleton key={`shop-skeleton-${index}`} />
              ))
            : null}
        </section>
      )}
    </main>
  );
}
