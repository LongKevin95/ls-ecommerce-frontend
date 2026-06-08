import { useContext } from "react";

import CartStateContext from "../../providers/cart-context";

export function useCart() {
  const context = useContext(CartStateContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider.");
  }

  return context;
}
