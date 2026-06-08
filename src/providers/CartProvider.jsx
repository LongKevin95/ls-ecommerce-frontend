import { useCallback, useMemo, useState } from "react";

import { readStorageJson, writeStorageJson } from "../utils/storage";
import CartStateContext from "./cart-context";

const CART_STORAGE_KEY = "ls-clean-fe-cart";

function readCartItems() {
  const items = readStorageJson(CART_STORAGE_KEY, []);

  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      productId: String(item?.productId ?? "").trim(),
      quantity: Math.max(1, Number(item?.quantity ?? 1)),
      variantId: String(item?.variantId ?? "").trim(),
      variantLabel: String(item?.variantLabel ?? "").trim(),
      color: String(item?.color ?? "Default").trim(),
      size: String(item?.size ?? "Default").trim(),
    }))
    .filter((item) => item.productId);
}

function buildCartItemKey(item) {
  const variantId = String(item?.variantId ?? "").trim();

  if (variantId) {
    return `${item.productId}::${variantId}`;
  }

  return `${item.productId}::${item.color}::${item.size}`;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readCartItems());

  const syncItems = useCallback((updater) => {
    setItems((previousItems) => {
      const nextItems = updater(previousItems);
      writeStorageJson(CART_STORAGE_KEY, nextItems);
      return nextItems;
    });
  }, []);

  const addToCart = useCallback(
    (productId, quantity = 1, options = {}) => {
      const nextItem = {
        productId: String(productId ?? "").trim(),
        quantity: Math.max(1, Number(quantity ?? 1)),
        variantId: String(options?.variantId ?? "").trim(),
        variantLabel: String(options?.variantLabel ?? "").trim(),
        color: String(options?.color ?? "Default").trim(),
        size: String(options?.size ?? "Default").trim(),
      };

      if (!nextItem.productId) {
        return;
      }

      const nextItemKey = buildCartItemKey(nextItem);

      syncItems((previousItems) => {
        const targetIndex = previousItems.findIndex(
          (item) => buildCartItemKey(item) === nextItemKey,
        );

        if (targetIndex < 0) {
          return [...previousItems, nextItem];
        }

        return previousItems.map((item, index) =>
          index === targetIndex
            ? {
                ...item,
                quantity: item.quantity + nextItem.quantity,
              }
            : item,
        );
      });
    },
    [syncItems],
  );

  const updateQuantity = useCallback(
    (cartItemKey, quantity) => {
      const nextQuantity = Number(quantity ?? 0);

      if (!cartItemKey) {
        return;
      }

      if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
        syncItems((previousItems) =>
          previousItems.filter(
            (item) => buildCartItemKey(item) !== cartItemKey,
          ),
        );
        return;
      }

      syncItems((previousItems) =>
        previousItems.map((item) =>
          buildCartItemKey(item) === cartItemKey
            ? { ...item, quantity: nextQuantity }
            : item,
        ),
      );
    },
    [syncItems],
  );

  const removeFromCart = useCallback(
    (cartItemKey) => {
      syncItems((previousItems) =>
        previousItems.filter((item) => buildCartItemKey(item) !== cartItemKey),
      );
    },
    [syncItems],
  );

  const clearCart = useCallback(() => {
    syncItems(() => []);
  }, [syncItems]);

  const value = useMemo(
    () => ({
      items,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      buildCartItemKey,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    }),
    [addToCart, clearCart, items, removeFromCart, updateQuantity],
  );

  return (
    <CartStateContext.Provider value={value}>
      {children}
    </CartStateContext.Provider>
  );
}
