import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import jblSpeaker from "../../assets/Images/jbl-speaker.png";

import ProductCard from "../../components/ProductCard";
import { formatProductCategoryLabel } from "../../api/productApi";
import { useFlashSaleQuery } from "../../hooks/useFlashSaleQuery";
import { useProductsQuery } from "../../hooks/useProductsQuery";
import { useUsersQuery } from "../../hooks/useUsersQuery";
import {
  isFlashSaleCampaignLive,
  isProductInCurrentFlashSale,
} from "../../utils/flashSalePricing";
import "./Home.css";
const HOME_PRODUCTS_SNAPSHOT_KEY = "ls-home-products-snapshot";
const HOME_USERS_SNAPSHOT_KEY = "ls-home-users-snapshot";
const HOME_HERO_PRODUCT_ID_KEY = "ls-home-hero-product-id";
const HERO_BANNER_PRODUCT_TITLE = "Iphone 17 Pro Max 256GB";

function formatCountdownValue(value) {
  return String(Math.max(0, Number(value) || 0)).padStart(2, "0");
}

function buildFlashSaleTimerItems(endsAt, nowTimestamp) {
  const endsAtTimestamp = Date.parse(String(endsAt ?? "").trim());

  if (!Number.isFinite(endsAtTimestamp)) {
    return [];
  }

  const diff = Math.max(0, endsAtTimestamp - nowTimestamp);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    { label: "Days", value: formatCountdownValue(days) },
    { label: "Hours", value: formatCountdownValue(hours) },
    { label: "Minutes", value: formatCountdownValue(minutes) },
    { label: "Seconds", value: formatCountdownValue(seconds) },
  ];
}

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

function readStoredValue(storageKey) {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return String(window.localStorage.getItem(storageKey) ?? "").trim();
  } catch {
    return "";
  }
}

function writeStoredValue(storageKey, value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (!String(value ?? "").trim()) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, String(value).trim());
  } catch {
    return;
  }
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("đ", "d")
    .replaceAll("Đ", "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function buildProductSearchIndex(product) {
  const title = String(product?.title ?? "");
  const categoryValue = String(product?.category ?? "");
  const categoryLabel = formatProductCategoryLabel(categoryValue);

  return [title, categoryValue, categoryLabel]
    .map(normalizeSearchText)
    .filter(Boolean)
    .join(" ");
}

function getProductDetailLink(product) {
  const productId = String(product?.id ?? "").trim();

  return productId ? `/product/${productId}` : "/";
}

function isHeroBannerCandidate(product) {
  const normalizedTitle = normalizeSearchText(product?.title);
  const normalizedDescription = normalizeSearchText(product?.description);
  const normalizedModel = normalizeSearchText(product?.attributes?.model);

  return (
    normalizedTitle.includes("iphone17") ||
    normalizedTitle.includes("17promax") ||
    normalizedTitle.includes("iphone17promax256gb") ||
    normalizedDescription.includes("a19pro") ||
    normalizedDescription.includes("iphone17") ||
    normalizedModel.includes("iphone17") ||
    normalizedModel.includes("17series2025")
  );
}

function Home() {
  const [searchParams] = useSearchParams();
  const [storedProducts] = useState(() =>
    readStoredArray(HOME_PRODUCTS_SNAPSHOT_KEY),
  );
  const [storedUsers] = useState(() =>
    readStoredArray(HOME_USERS_SNAPSHOT_KEY),
  );
  const [storedHeroProductId] = useState(() =>
    readStoredValue(HOME_HERO_PRODUCT_ID_KEY),
  );
  const [countdownNow, setCountdownNow] = useState(() => Date.now());

  const { data: productsData, isLoading, isError, error } = useProductsQuery();
  const { data: usersData } = useUsersQuery();
  const { data: flashSaleState } = useFlashSaleQuery();
  const isFlashSaleLive = useMemo(
    () => isFlashSaleCampaignLive(flashSaleState, countdownNow),
    [countdownNow, flashSaleState],
  );

  useEffect(() => {
    if (!Array.isArray(productsData)) {
      return;
    }

    writeStoredArray(HOME_PRODUCTS_SNAPSHOT_KEY, productsData);
  }, [productsData]);

  useEffect(() => {
    if (!Array.isArray(usersData)) {
      return;
    }

    writeStoredArray(HOME_USERS_SNAPSHOT_KEY, usersData);
  }, [usersData]);

  useEffect(() => {
    if (!isFlashSaleLive || !flashSaleState?.endsAt) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [flashSaleState?.endsAt, isFlashSaleLive]);

  const products = Array.isArray(productsData) ? productsData : storedProducts;
  const users = Array.isArray(usersData) ? usersData : storedUsers;

  const errorMessage = error?.message ?? "Unable to load products.";

  const keyword = (searchParams.get("q") ?? "").trim().toLowerCase();
  const category = searchParams.get("category") ?? "";
  const normalizedKeyword = useMemo(
    () => normalizeSearchText(keyword),
    [keyword],
  );
  const normalizedCategory = useMemo(
    () =>
      String(category ?? "")
        .trim()
        .toLowerCase(),
    [category],
  );

  const vendorMap = useMemo(
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

  const preparedProducts = useMemo(
    () =>
      products.map((product) => {
        const vendorEmail = String(product?.vendorEmail ?? "")
          .trim()
          .toLowerCase();
        const vendorProfile = vendorMap.get(vendorEmail);
        const resolvedShopName =
          vendorProfile?.shopName || vendorProfile?.name || product?.shopName;
        const resolvedVendorAvatarUrl =
          vendorProfile?.avatarUrl || product?.vendorAvatarUrl;
        const hasVendorOverrides =
          resolvedShopName !== product?.shopName ||
          resolvedVendorAvatarUrl !== product?.vendorAvatarUrl;

        return {
          product: hasVendorOverrides
            ? {
                ...product,
                shopName: resolvedShopName,
                vendorAvatarUrl: resolvedVendorAvatarUrl,
              }
            : product,
          normalizedCategory: String(product?.category ?? "").toLowerCase(),
          searchIndex: buildProductSearchIndex(product),
        };
      }),
    [products, vendorMap],
  );

  const filteredProducts = useMemo(() => {
    return preparedProducts
      .filter(({ normalizedCategory: productCategory, searchIndex }) => {
        const keywordMatch = normalizedKeyword
          ? searchIndex.includes(normalizedKeyword)
          : true;
        const categoryMatch = normalizedCategory
          ? productCategory === normalizedCategory
          : true;

        return keywordMatch && categoryMatch;
      })
      .map(({ product }) => product);
  }, [preparedProducts, normalizedKeyword, normalizedCategory]);

  const storedHeroBannerProductId = useMemo(() => {
    if (storedHeroProductId) {
      return storedHeroProductId;
    }

    const previousFeaturedProduct = storedProducts.find(
      (product) =>
        normalizeSearchText(product?.title) ===
        normalizeSearchText(HERO_BANNER_PRODUCT_TITLE),
    );

    return String(previousFeaturedProduct?.id ?? "").trim();
  }, [storedHeroProductId, storedProducts]);

  const heroBannerProduct = useMemo(() => {
    const exactMatch = products.find(
      (product) =>
        normalizeSearchText(product?.title) ===
        normalizeSearchText(HERO_BANNER_PRODUCT_TITLE),
    );

    if (exactMatch) {
      return exactMatch;
    }

    const rememberedProduct = products.find(
      (product) =>
        String(product?.id ?? "").trim() === storedHeroBannerProductId,
    );

    if (rememberedProduct && isHeroBannerCandidate(rememberedProduct)) {
      return rememberedProduct;
    }

    const iphoneCandidate = products.find((product) =>
      isHeroBannerCandidate(product),
    );

    if (iphoneCandidate) {
      return iphoneCandidate;
    }

    return products[0] ?? filteredProducts[0] ?? null;
  }, [filteredProducts, products, storedHeroBannerProductId]);

  useEffect(() => {
    const nextHeroProductId = String(heroBannerProduct?.id ?? "").trim();

    if (!nextHeroProductId) {
      return;
    }

    writeStoredValue(HOME_HERO_PRODUCT_ID_KEY, nextHeroProductId);
  }, [heroBannerProduct]);

  const heroBannerProductLink = getProductDetailLink(heroBannerProduct);

  const flashSalesProducts = useMemo(
    () =>
      filteredProducts
        .filter((product) =>
          isProductInCurrentFlashSale(product, flashSaleState, countdownNow),
        )
        .slice(0, 8),
    [countdownNow, filteredProducts, flashSaleState],
  );
  const bestSellingProducts = useMemo(
    () =>
      [...filteredProducts]
        .sort((firstProduct, secondProduct) => {
          const soldCountDiff =
            Number(secondProduct?.soldCount ?? 0) -
            Number(firstProduct?.soldCount ?? 0);

          if (soldCountDiff !== 0) {
            return soldCountDiff;
          }

          return Number(secondProduct?.reviews ?? 0) - Number(firstProduct?.reviews ?? 0);
        })
        .slice(0, 4),
    [filteredProducts],
  );
  const exploreProducts = filteredProducts.slice(0, 8);
  const flashSaleTimerItems = useMemo(
    () =>
      isFlashSaleLive
        ? buildFlashSaleTimerItems(flashSaleState?.endsAt, countdownNow)
        : [],
    [countdownNow, flashSaleState?.endsAt, isFlashSaleLive],
  );

  const searchSummary = useMemo(() => {
    if (!keyword && !category) return "";

    const labels = [];
    if (keyword) labels.push(`keyword "${keyword}"`);
    if (category)
      labels.push(`category "${formatProductCategoryLabel(category)}"`);

    return labels.join(" | ");
  }, [keyword, category]);

  const renderProductGrid = (items, expectedCount) => {
    if (isError && items.length === 0) {
      return <p className="home-message home-message--error">{errorMessage}</p>;
    }

    if (items.length === 0 && !isLoading) {
      return (
        <div className="home-message">
          <p>No product yet.</p>
          <small>
            Data source: /api/resources/ecommerce-products?apiKey=...
          </small>
        </div>
      );
    }

    const skeletonCount =
      isLoading && items.length < expectedCount
        ? expectedCount - items.length
        : 0;

    return (
      <div
        className={`home-grid ${
          items.length === 0 && skeletonCount > 0 ? "home-grid--loading" : ""
        }`}
      >
        {items.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            flashSaleState={flashSaleState}
          />
        ))}
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div
            key={`skeleton-${expectedCount}-${index}`}
            className="home-card-skeleton"
            aria-hidden="true"
          ></div>
        ))}
      </div>
    );
  };

  return (
    <main className="home-page o-container">
      <section className="hero-banner">
        <div className="hero-banner__content">
          <div className="hero-banner__label">iPhone 17 Series</div>
          <h1>Up to 10% off Voucher</h1>
          <Link className="hero-banner__cta" to={heroBannerProductLink}>
            Shop Now
          </Link>
        </div>

        <Link
          className="hero-banner__visual"
          to={heroBannerProductLink}
          aria-label={`View ${heroBannerProduct?.title || "featured product"} details`}
        >
          <img
            src="https://www.apple.com/v/iphone-17-pro/e/images/meta/iphone-17-pro_overview__eumhhclcpuaa_og.png"
            alt={heroBannerProduct?.title || "Featured product"}
          />
        </Link>
        <div className="hero-dots" aria-hidden="true">
          <span></span>
          <span className="is-active"></span>
          <span></span>
        </div>
      </section>

      {searchSummary && (
        <p className="home-search-summary">Filtering by: {searchSummary}</p>
      )}

      {isFlashSaleLive && flashSalesProducts.length > 0 && (
        <section className="home-section">
          <div className="section-title-row">
            <div>
              <p className="section-subtitle">Today's</p>
              <h2 className="section-title">Flash Sales</h2>
            </div>

            <div className="sale-timer" aria-label="Countdown">
              {flashSaleTimerItems.map((item, index) => (
                <div className="sale-timer__group" key={item.label}>
                  <div className="sale-timer__item">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>

                  {index < flashSaleTimerItems.length - 1 && (
                    <span className="sale-timer__separator" aria-hidden="true">
                      :
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {renderProductGrid(flashSalesProducts, 8)}

          <div className="section-actions">
            <button type="button" className="btn-view-all">
              View All Products
            </button>
          </div>
        </section>
      )}

      <section className="home-section">
        <div className="section-title-row">
          <div>
            <p className="section-subtitle">This Month</p>
            <h2 className="section-title">Best Selling Products</h2>
          </div>

          <button type="button" className="btn-compact">
            View All
          </button>
        </div>

        {renderProductGrid(bestSellingProducts, 4)}
      </section>

      <section className="music-banner">
        <div className="music-banner__content">
          <p>Categories</p>
          <h3>Enhance Your Music Experience</h3>

          <div className="music-banner__countdown" aria-hidden="true">
            <span>23h</span>
            <span>05m</span>
            <span>59s</span>
          </div>

          <button type="button" className="btn-buy-now">
            Buy Now
          </button>
        </div>

        <div className="music-banner__visual" aria-hidden="true">
          <img src={jblSpeaker} alt="JBL Speaker" />
        </div>
      </section>

      <section className="home-section">
        <div className="section-title-row">
          <div>
            <p className="section-subtitle">Our Products</p>
            <h2 className="section-title">Explore Our Products</h2>
          </div>
        </div>

        {renderProductGrid(exploreProducts, 8)}

        <div className="section-actions">
          <button type="button" className="btn-view-all">
            View All Products
          </button>
        </div>
      </section>

      <section className="home-section">
        <div className="section-title-row">
          <div>
            <p className="section-subtitle">Featured</p>
            <h2 className="section-title">New Arrival</h2>
          </div>
        </div>

        <div className="arrival-layout">
          <article className="arrival-card arrival-card--large">
            <div className="arrival-card__content">
              <h3>PlayStation 5</h3>
              <p>Black and White version of the PS5 coming out on sale.</p>
              <a href="#">Shop Now</a>
            </div>
            <img
              className="arrival-card__image arrival-card__image--large"
              src="https://i.ibb.co/BH917f3C/playstation-5.jpg"
              alt="PlayStation 5"
              loading="lazy"
            />
          </article>

          <article className="arrival-card arrival-card--medium">
            <div className="arrival-card__content">
              <h3>Women's Collections</h3>
              <p>Featured woman collections that give you another vibe.</p>
              <a href="#">Shop Now</a>
            </div>
            <img
              className="arrival-card__image arrival-card__image--medium"
              src="https://i.ibb.co/HDnjtfYM/woman-hat.jpg"
              alt="Women's Collections"
              loading="lazy"
            />
          </article>

          <article className="arrival-card">
            <div className="arrival-card__content">
              <h3>Speakers</h3>
              <p>Amazon wireless speakers.</p>
              <a href="#">Shop Now</a>
            </div>
            <img
              className="arrival-card__image"
              src="https://i.ibb.co/d4y3bHvP/speakers-jpg.jpg"
              alt="Speakers"
              loading="lazy"
            />
          </article>

          <article className="arrival-card">
            <div className="arrival-card__content">
              <h3>Perfume</h3>
              <p>Gucci intense oud perfume.</p>
              <a href="#">Shop Now</a>
            </div>
            <img
              className="arrival-card__image"
              src="https://i.ibb.co/M5tdHQDb/perfume.jpg"
              alt="Perfume"
              loading="lazy"
            />
          </article>
        </div>
      </section>

      <section className="service-list" aria-label="Services">
        <article>
          <h4>FREE AND FAST DELIVERY</h4>
          <p>Free delivery for all orders over $140</p>
        </article>

        <article>
          <h4>24/7 CUSTOMER SERVICE</h4>
          <p>Friendly 24/7 customer support</p>
        </article>

        <article>
          <h4>MONEY BACK GUARANTEE</h4>
          <p>We return money within 30 days</p>
        </article>
      </section>
    </main>
  );
}

export default Home;
