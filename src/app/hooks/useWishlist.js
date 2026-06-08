import { useContext } from "react";

import WishlistStateContext from "../../providers/wishlist-context";

export function useWishlist() {
  const context = useContext(WishlistStateContext);

  if (!context) {
    throw new Error("useWishlist must be used within WishlistProvider.");
  }

  return context;
}
