import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import AuthContext from "./auth-context";
import CartContext from "./cart-context";

const CART_STORAGE_KEY_PREFIX = "ls-ecommerce-cart-items";

function buildCartStorageKey(userEmail) {
  const normalizedEmail = String(userEmail ?? "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    return `${CART_STORAGE_KEY_PREFIX}::guest`;
  }

  return `${CART_STORAGE_KEY_PREFIX}::${normalizedEmail}`;
}

function readStoredCartItems(storageKey) {
  try {
    const storedItems = window.localStorage.getItem(storageKey);

    if (!storedItems) {
      return [];
    }

    const parsedItems = JSON.parse(storedItems);

    if (!Array.isArray(parsedItems)) {
      return [];
    }

    return parsedItems.filter(
      (item) =>
        item &&
        item.productId &&
        item.title &&
        Number(item.price) >= 0 &&
        Number(item.quantity) > 0,
    );
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }
}

function normalizeCartItem(product, quantity, selectedOptions = {}) {
  const nextQuantity = Math.max(1, Number(quantity) || 1);
  const normalizedColor = selectedOptions.color || "Default";
  const normalizedSize = selectedOptions.size || "M";
  const normalizedVariantId = String(selectedOptions.variantId ?? "").trim();
  const normalizedVariantLabel = String(selectedOptions.variantLabel ?? "").trim();
  const normalizedSku = String(selectedOptions.sku ?? "").trim();
  const resolvedPrice = Number(
    selectedOptions.price ??
      product.displayPrice ??
      product.price ??
      0,
  ) || 0;

  return {
    productId: String(product.id),
    variantId: normalizedVariantId,
    variantLabel: normalizedVariantLabel,
    title: product.title,
    price: resolvedPrice,
    quantity: nextQuantity,
    vendorEmail: String(product.vendorEmail ?? "")
      .trim()
      .toLowerCase(),
    shopName:
      product.shopName ||
      product.vendorName ||
      (product.vendorEmail ? String(product.vendorEmail).split("@")[0] : "L&S Store"),
    image:
      product.image ||
      (Array.isArray(product.images) ? product.images[0] : "") ||
      "/favicon.svg",
    sku: normalizedSku,
    color: normalizedColor,
    size: normalizedSize,
  };
}

function buildCartItemKey(item) {
  return `${item.productId}-${item.variantId || "default"}-${item.color}-${item.size}`;
}

export function CartProvider({ children }) {
  const auth = useContext(AuthContext);
  const userEmail = auth?.user?.email;
  const storageKey = useMemo(() => buildCartStorageKey(userEmail), [userEmail]);

  const [items, setItems] = useState(() => readStoredCartItems(storageKey));

  useEffect(() => {
    setItems(readStoredCartItems(storageKey));
  }, [storageKey]);

  const syncItems = useCallback((updater) => {
    setItems((previousItems) => {
      const nextItems = updater(previousItems);
      window.localStorage.setItem(storageKey, JSON.stringify(nextItems));
      return nextItems;
    });
  }, [storageKey]);

  const addToCart = useCallback(
    (product, quantity = 1, selectedOptions = {}) => {
      if (!product?.id) return;

      const nextItem = normalizeCartItem(product, quantity, selectedOptions);
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

  const setItemQuantity = useCallback(
    (itemKey, quantity) => {
      const nextQuantity = Math.max(1, Number(quantity) || 1);

      syncItems((previousItems) =>
        previousItems.map((item) =>
          buildCartItemKey(item) === itemKey
            ? { ...item, quantity: nextQuantity }
            : item,
        ),
      );
    },
    [syncItems],
  );

  const increaseItemQuantity = useCallback(
    (itemKey) => {
      syncItems((previousItems) =>
        previousItems.map((item) =>
          buildCartItemKey(item) === itemKey
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    },
    [syncItems],
  );

  const decreaseItemQuantity = useCallback(
    (itemKey) => {
      syncItems((previousItems) =>
        previousItems.map((item) =>
          buildCartItemKey(item) === itemKey
            ? { ...item, quantity: Math.max(1, item.quantity - 1) }
            : item,
        ),
      );
    },
    [syncItems],
  );

  const removeItem = useCallback(
    (itemKey) => {
      syncItems((previousItems) =>
        previousItems.filter((item) => buildCartItemKey(item) !== itemKey),
      );
    },
    [syncItems],
  );

  const deleteAllItems = useCallback(() => {
    syncItems(() => []);
  }, [syncItems]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      ),
    [items],
  );

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      totalItems,
      subtotal,
      addToCart,
      setItemQuantity,
      increaseItemQuantity,
      decreaseItemQuantity,
      removeItem,
      deleteAllItems,
      buildCartItemKey,
    }),
    [
      addToCart,
      decreaseItemQuantity,
      deleteAllItems,
      increaseItemQuantity,
      items,
      removeItem,
      setItemQuantity,
      subtotal,
      totalItems,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export default CartProvider;
