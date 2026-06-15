import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";

import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { useUsersQuery } from "../../hooks/useUsersQuery";
import { useWishlist } from "../../hooks/useWishlist";
import "./Wishlist.css";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function Wishlist() {
  const navigate = useNavigate();
  const { user, isCustomer, isVendor } = useAuth();
  const { data: users = [] } = useUsersQuery();
  const { addToCart } = useCart();
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const canUseWishlist = isCustomer && !isVendor;

  const vendorMapByEmail = useMemo(
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

  const enrichedItems = useMemo(() => {
    return items.map((item) => {
      const vendorEmail = String(item?.vendorEmail ?? "")
        .trim()
        .toLowerCase();
      const vendorProfile = vendorMapByEmail.get(vendorEmail);
      const shopName =
        vendorProfile?.shopName ||
        vendorProfile?.name ||
        item?.shopName ||
        (vendorEmail ? vendorEmail.split("@")[0] : "L&S Store");
      const shopAvatar = String(vendorProfile?.avatarUrl ?? "").trim();
      const shopInitial =
        String(shopName ?? "S")
          .trim()
          .charAt(0)
          .toUpperCase() || "S";

      return {
        ...item,
        shopName,
        shopAvatar,
        shopInitial,
      };
    });
  }, [items, vendorMapByEmail]);

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: "/wishlist" }, replace: true });
      return;
    }

    if (!canUseWishlist) {
      window.alert("Tai khoan vendor khong duoc su dung wishlist.");
      navigate("/");
    }
  }, [canUseWishlist, navigate, user]);

  const handleMoveToCart = async (item) => {
    if (!canUseWishlist) {
      return;
    }

    addToCart(
      {
        id: item.productId,
        title: item.title,
        price: item.price,
        image: item.image,
        vendorEmail: item.vendorEmail,
        shopName: item.shopName,
      },
      1,
      {
        color: "Default",
        size: "M",
      },
    );

    try {
      await removeFromWishlist(item.productId);
    } catch (error) {
      window.alert(error?.message ?? "Khong the cap nhat wishlist.");
    }
  };

  const handleClearWishlist = async () => {
    try {
      await clearWishlist();
    } catch (error) {
      window.alert(error?.message ?? "Khong the xoa wishlist.");
    }
  };

  const handleRemoveWishlistItem = async (productId) => {
    try {
      await removeFromWishlist(productId);
    } catch (error) {
      window.alert(error?.message ?? "Khong the xoa san pham khoi wishlist.");
    }
  };

  return (
    <main className="wishlist-page o-container">
      <nav className="wishlist-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>&gt;</span>
        <strong>Wishlist</strong>
      </nav>

      <div className="wishlist-header">
        <h1>Your Wishlist</h1>
        {enrichedItems.length > 0 && (
          <button
            type="button"
            className="wishlist-clear-btn"
            onClick={handleClearWishlist}
          >
            Clear all
          </button>
        )}
      </div>

      {enrichedItems.length === 0 ? (
        <div className="wishlist-empty">
          <p>Your wishlist is empty.</p>
          <Link to="/">Continue shopping</Link>
        </div>
      ) : (
        <section className="wishlist-grid">
          {enrichedItems.map((item) => (
            <article key={item.productId} className="wishlist-card">
              <Link
                to={`/product/${item.productId}`}
                className="wishlist-card__media"
                state={{ product: { ...item, id: item.productId } }}
              >
                <img src={item.image} alt={item.title} />
              </Link>
              <div className="wishlist-card__content">
                <Link
                  to={`/product/${item.productId}`}
                  className="wishlist-card__title"
                  state={{ product: { ...item, id: item.productId } }}
                >
                  {item.title}
                </Link>
                <p className="wishlist-card__shop">
                  <span
                    className="wishlist-card__shop-avatar"
                    aria-hidden="true"
                  >
                    {item.shopAvatar ? (
                      <img src={item.shopAvatar} alt="" loading="lazy" />
                    ) : (
                      <span>{item.shopInitial}</span>
                    )}
                  </span>
                  Shop: {item.shopName}
                </p>
                <strong>{currency.format(item.price)}</strong>
                <button
                  type="button"
                  className="wishlist-card__move"
                  onClick={() => handleMoveToCart(item)}
                >
                  Move to cart
                </button>
                <button
                  type="button"
                  className="wishlist-card__remove"
                  onClick={() => handleRemoveWishlistItem(item.productId)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
