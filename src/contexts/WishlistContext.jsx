import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  addWishlistItem as addWishlistItemApi,
  getMyWishlist,
  removeWishlistItem as removeWishlistItemApi,
} from "../api/wishlistApi";
import AuthContext from "./auth-context";
import WishlistContext from "./wishlist-context";

const WISHLIST_STORAGE_KEY_PREFIX = "ls-ecommerce-wishlist-items";

function buildWishlistStorageKey(userEmail) {
  const normalizedEmail = String(userEmail ?? "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    return `${WISHLIST_STORAGE_KEY_PREFIX}::guest`;
  }

  return `${WISHLIST_STORAGE_KEY_PREFIX}::${normalizedEmail}`;
}

function readStoredWishlist(storageKey) {
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

function writeStoredWishlist(storageKey, items) {
  window.localStorage.setItem(storageKey, JSON.stringify(items));
}

function clearStoredWishlist(storageKey) {
  window.localStorage.removeItem(storageKey);
}

function normalizeWishlistProduct(product) {
  if (!product || typeof product !== "object") {
    return null;
  }

  const productId = String(product?.id ?? product?.productId ?? "").trim();

  if (!productId) {
    return null;
  }

  return {
    productId,
    title: String(product?.title ?? "Product"),
    price: Number(product?.price ?? 0),
    oldPrice: Number(product?.oldPrice ?? 0),
    regularPrice: Number(product?.regularPrice ?? product?.price ?? 0),
    regularOldPrice: Number(
      product?.regularOldPrice ?? product?.oldPrice ?? product?.price ?? 0,
    ),
    regularDiscountPercentage: Number(
      product?.regularDiscountPercentage ?? 0,
    ),
    displayPrice: Number(product?.displayPrice ?? product?.price ?? 0),
    displayOldPrice: Number(
      product?.displayOldPrice ?? product?.oldPrice ?? product?.price ?? 0,
    ),
    displayDiscountPercentage: Number(
      product?.displayDiscountPercentage ?? product?.discountPercentage ?? 0,
    ),
    discountPercentage: Number(product?.discountPercentage ?? 0),
    flashSaleDiscountPercent: Number(
      product?.flashSaleDiscountPercent ?? product?.flashSale?.discountPercent ?? 0,
    ),
    flashSaleCampaignId: String(
      product?.flashSaleCampaignId ?? product?.flashSale?.campaignId ?? "",
    ).trim(),
    isFlashSaleActive: Boolean(product?.isFlashSaleActive),
    image:
      product?.image ||
      (Array.isArray(product?.images) ? product.images[0] : "") ||
      "/favicon.svg",
    rating: Number(product?.rating ?? 0),
    reviews: Number(product?.reviews ?? 0),
    category: String(product?.category ?? ""),
    vendorEmail: String(product?.vendorEmail ?? "")
      .trim()
      .toLowerCase(),
    shopName:
      product?.shopName ||
      product?.vendorName ||
      (product?.vendorEmail
        ? String(product.vendorEmail).split("@")[0]
        : "L&S Store"),
  };
}

function normalizeWishlistApiItem(item) {
  const product = item?.product && typeof item.product === "object"
    ? item.product
    : item;
  const normalizedProduct = normalizeWishlistProduct(product);

  if (!normalizedProduct) {
    const fallbackProductId = String(item?.productId ?? "").trim();

    if (!fallbackProductId) {
      return null;
    }

    return {
      productId: fallbackProductId,
      title: "Product",
      price: 0,
      oldPrice: 0,
      regularPrice: 0,
      regularOldPrice: 0,
      regularDiscountPercentage: 0,
      displayPrice: 0,
      displayOldPrice: 0,
      displayDiscountPercentage: 0,
      discountPercentage: 0,
      flashSaleDiscountPercent: 0,
      flashSaleCampaignId: "",
      isFlashSaleActive: false,
      image: "/favicon.svg",
      rating: 0,
      reviews: 0,
      category: "",
      vendorEmail: "",
      shopName: "L&S Store",
    };
  }

  return normalizedProduct;
}

function normalizeWishlistItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => normalizeWishlistApiItem(item))
    .filter(Boolean);
}

function mergeWishlistItems(...lists) {
  const itemMap = new Map();

  lists.flat().forEach((item) => {
    const normalizedItem = normalizeWishlistApiItem(item);

    if (!normalizedItem?.productId) {
      return;
    }

    if (!itemMap.has(normalizedItem.productId)) {
      itemMap.set(normalizedItem.productId, normalizedItem);
    }
  });

  return Array.from(itemMap.values());
}

export function WishlistProvider({ children }) {
  const auth = useContext(AuthContext);
  const userEmail = auth?.user?.email;
  const canUseServerWishlist = Boolean(auth?.isCustomer && !auth?.isVendor);
  const storageKey = useMemo(
    () => buildWishlistStorageKey(userEmail),
    [userEmail],
  );
  const guestStorageKey = useMemo(() => buildWishlistStorageKey(""), []);

  const [items, setItems] = useState(() => readStoredWishlist(storageKey));
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let isSubscribed = true;

    async function syncWishlistFromServer() {
      const localItems = readStoredWishlist(storageKey);
      const guestItems =
        storageKey === guestStorageKey ? [] : readStoredWishlist(guestStorageKey);
      const seedItems = mergeWishlistItems(localItems, guestItems);

      setIsSyncing(true);

      try {
        if (seedItems.length > 0) {
          await Promise.allSettled(
            seedItems.map((item) => addWishlistItemApi(item.productId)),
          );
        }

        const serverItems = normalizeWishlistItems(await getMyWishlist());

        if (!isSubscribed) {
          return;
        }

        setItems(serverItems);
        writeStoredWishlist(storageKey, serverItems);

        if (guestItems.length > 0 && storageKey !== guestStorageKey) {
          clearStoredWishlist(guestStorageKey);
        }
      } catch {
        if (!isSubscribed) {
          return;
        }

        const fallbackItems = mergeWishlistItems(localItems, guestItems);
        setItems(fallbackItems);
        writeStoredWishlist(storageKey, fallbackItems);
      } finally {
        if (isSubscribed) {
          setIsSyncing(false);
        }
      }
    }

    if (!canUseServerWishlist) {
      const nextItems = readStoredWishlist(storageKey);
      setItems(nextItems);
      setIsSyncing(false);
      return () => {
        isSubscribed = false;
      };
    }

    void syncWishlistFromServer();

    return () => {
      isSubscribed = false;
    };
  }, [canUseServerWishlist, guestStorageKey, storageKey]);

  const persistItems = useCallback(
    (nextItems) => {
      setItems(nextItems);
      writeStoredWishlist(storageKey, nextItems);
    },
    [storageKey],
  );

  const hasInWishlist = useCallback(
    (productId) => {
      const normalizedProductId = String(productId ?? "").trim();

      if (!normalizedProductId) {
        return false;
      }

      return items.some((item) => item.productId === normalizedProductId);
    },
    [items],
  );

  const addToWishlist = useCallback(
    async (product) => {
      const nextItem = normalizeWishlistProduct(product);

      if (!nextItem?.productId) {
        return false;
      }

      if (hasInWishlist(nextItem.productId)) {
        return false;
      }

      const optimisticItems = [nextItem, ...items];
      persistItems(optimisticItems);

      if (!canUseServerWishlist) {
        return true;
      }

      try {
        const serverItems = normalizeWishlistItems(
          await addWishlistItemApi(nextItem.productId),
        );
        persistItems(serverItems);
        return true;
      } catch (error) {
        persistItems(items);
        throw error;
      }
    },
    [canUseServerWishlist, hasInWishlist, items, persistItems],
  );

  const removeFromWishlist = useCallback(
    async (productId) => {
      const normalizedProductId = String(productId ?? "").trim();

      if (!normalizedProductId) {
        return false;
      }

      const optimisticItems = items.filter(
        (item) => item.productId !== normalizedProductId,
      );

      if (optimisticItems.length === items.length) {
        return false;
      }

      persistItems(optimisticItems);

      if (!canUseServerWishlist) {
        return true;
      }

      try {
        const serverItems = normalizeWishlistItems(
          await removeWishlistItemApi(normalizedProductId),
        );
        persistItems(serverItems);
        return true;
      } catch (error) {
        persistItems(items);
        throw error;
      }
    },
    [canUseServerWishlist, items, persistItems],
  );

  const toggleWishlistItem = useCallback(
    async (product) => {
      const productId = String(product?.id ?? product?.productId ?? "").trim();

      if (!productId) {
        return false;
      }

      if (hasInWishlist(productId)) {
        await removeFromWishlist(productId);
        return false;
      }

      await addToWishlist(product);
      return true;
    },
    [addToWishlist, hasInWishlist, removeFromWishlist],
  );

  const clearWishlist = useCallback(async () => {
    const previousItems = items;

    persistItems([]);

    if (!canUseServerWishlist) {
      return;
    }

    try {
      await Promise.all(
        previousItems.map((item) => removeWishlistItemApi(item.productId)),
      );
    } catch (error) {
      persistItems(previousItems);
      throw error;
    }
  }, [canUseServerWishlist, items, persistItems]);

  const value = useMemo(
    () => ({
      items,
      totalItems: items.length,
      hasInWishlist,
      addToWishlist,
      removeFromWishlist,
      toggleWishlistItem,
      clearWishlist,
      isSyncing,
    }),
    [
      addToWishlist,
      clearWishlist,
      hasInWishlist,
      isSyncing,
      items,
      removeFromWishlist,
      toggleWishlistItem,
    ],
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export default WishlistProvider;
