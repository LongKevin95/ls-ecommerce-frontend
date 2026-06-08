import { useCallback, useMemo, useState } from "react";

import { readStorageJson, writeStorageJson } from "../utils/storage";
import WishlistStateContext from "./wishlist-context";

const WISHLIST_STORAGE_KEY = "ls-clean-fe-wishlist";

function readWishlistItems() {
  const items = readStorageJson(WISHLIST_STORAGE_KEY, []);

  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => String(item?.productId ?? item ?? "").trim())
    .filter(Boolean)
    .map((productId) => ({ productId }));
}

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(() => readWishlistItems());

  const syncItems = useCallback((updater) => {
    setItems((previousItems) => {
      const nextItems = updater(previousItems);
      writeStorageJson(WISHLIST_STORAGE_KEY, nextItems);
      return nextItems;
    });
  }, []);

  const hasInWishlist = useCallback(
    (productId) => {
      const normalizedProductId = String(productId ?? "").trim();
      return items.some((item) => item.productId === normalizedProductId);
    },
    [items],
  );

  const toggleWishlist = useCallback(
    (productId) => {
      const normalizedProductId = String(productId ?? "").trim();

      if (!normalizedProductId) {
        return false;
      }

      if (hasInWishlist(normalizedProductId)) {
        syncItems((previousItems) =>
          previousItems.filter((item) => item.productId !== normalizedProductId),
        );
        return false;
      }

      syncItems((previousItems) => [{ productId: normalizedProductId }, ...previousItems]);
      return true;
    },
    [hasInWishlist, syncItems],
  );

  const clearWishlist = useCallback(() => {
    syncItems(() => []);
  }, [syncItems]);

  const value = useMemo(
    () => ({
      items,
      totalItems: items.length,
      hasInWishlist,
      toggleWishlist,
      clearWishlist,
    }),
    [clearWishlist, hasInWishlist, items, toggleWishlist],
  );

  return <WishlistStateContext.Provider value={value}>{children}</WishlistStateContext.Provider>;
}
