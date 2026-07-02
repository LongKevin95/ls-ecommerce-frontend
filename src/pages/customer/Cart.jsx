import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";

import { getProductById } from "../../api/productApi";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { useFlashSaleQuery } from "../../hooks/useFlashSaleQuery";
import { useUsersQuery } from "../../hooks/useUsersQuery";
import { resolveVariantPriceState } from "../../utils/flashSalePricing";
import "./Cart.css";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const DELIVERY_FEE = 5;

function Cart() {
  const { user, isCustomer, isVendor } = useAuth();
  const { data: users = [] } = useUsersQuery();
  const { data: flashSaleState } = useFlashSaleQuery();
  const {
    items,
    increaseItemQuantity,
    decreaseItemQuantity,
    removeItem,
    deleteAllItems,
    buildCartItemKey,
  } = useCart();
  const navigate = useNavigate();
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockMessage, setStockMessage] = useState("");
  const cartProductIds = useMemo(
    () =>
      [
        ...new Set(items.map((item) => String(item?.productId ?? "").trim())),
      ].filter(Boolean),
    [items],
  );
  const cartProductDetailQueries = useQueries({
    queries: cartProductIds.map((productId) => ({
      queryKey: ["products", "detail", productId],
      queryFn: () => getProductById(productId),
      enabled: Boolean(productId),
      staleTime: 1000 * 60 * 5,
    })),
  });
  const cartProductDetailById = useMemo(
    () =>
      new Map(
        cartProductIds.map((productId, index) => [
          productId,
          cartProductDetailQueries[index]?.data ?? null,
        ]),
      ),
    [cartProductDetailQueries, cartProductIds],
  );
  const cartProductDetailQueryById = useMemo(
    () =>
      new Map(
        cartProductIds.map((productId, index) => [
          productId,
          cartProductDetailQueries[index] ?? null,
        ]),
      ),
    [cartProductDetailQueries, cartProductIds],
  );
  const stockStateByItemKey = useMemo(
    () =>
      new Map(
        items.map((item) => {
          const itemKey = buildCartItemKey(item);
          const productId = String(item?.productId ?? "").trim();
          const variantId = String(item?.variantId ?? "").trim();
          const productDetail = cartProductDetailById.get(productId) ?? null;
          const detailQuery = cartProductDetailQueryById.get(productId);
          const variants = Array.isArray(productDetail?.variants)
            ? productDetail.variants
            : [];
          const selectedVariant = variantId
            ? (variants.find(
                (variant) => String(variant?.id ?? "") === variantId,
              ) ?? null)
            : null;
          const hasLoadedDetail =
            Boolean(productDetail) && !detailQuery?.isLoading;
          const currentStock = variantId
            ? hasLoadedDetail
              ? Math.max(0, Number(selectedVariant?.stock ?? 0))
              : null
            : hasLoadedDetail
              ? Math.max(0, Number(productDetail?.stock ?? 0))
              : null;
          const variantLabel =
            String(item?.variantLabel ?? "").trim() ||
            String(selectedVariant?.label ?? "").trim();

          return [
            itemKey,
            {
              currentStock,
              isStockChecking:
                Boolean(detailQuery?.isLoading) || !hasLoadedDetail,
              hasStockError: Boolean(detailQuery?.isError),
              variantLabel,
            },
          ];
        }),
      ),
    [
      buildCartItemKey,
      cartProductDetailById,
      cartProductDetailQueryById,
      items,
    ],
  );

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

  const pricedCartItems = useMemo(
    () =>
      items.map((item) => {
        const productId = String(item?.productId ?? "").trim();
        const variantId = String(item?.variantId ?? "").trim();
        const productDetail = cartProductDetailById.get(productId) ?? null;
        const variants = Array.isArray(productDetail?.variants)
          ? productDetail.variants
          : [];
        const selectedVariant = variantId
          ? (variants.find(
              (variant) => String(variant?.id ?? "").trim() === variantId,
            ) ?? null)
          : null;
        const priceState = productDetail
          ? resolveVariantPriceState(selectedVariant, productDetail, flashSaleState)
          : {
              currentPrice: Number(item?.price ?? 0),
            };

        return {
          ...item,
          livePrice: Number(priceState.currentPrice ?? item?.price ?? 0),
        };
      }),
    [cartProductDetailById, flashSaleState, items],
  );
  const subtotal = useMemo(
    () =>
      pricedCartItems.reduce(
        (sum, item) =>
          sum + Number(item.livePrice ?? item.price ?? 0) * Number(item.quantity ?? 0),
        0,
      ),
    [pricedCartItems],
  );
  const canPurchase = isCustomer && !isVendor;
  const total = subtotal + (items.length > 0 ? DELIVERY_FEE : 0);

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: "/cart" }, replace: true });
      return;
    }

    if (!canPurchase) {
      navigate("/", { replace: true });
    }
  }, [canPurchase, navigate, user]);

  const requireAccess = () => {
    if (!user) {
      navigate("/login", { state: { from: "/cart" } });
      return false;
    }

    if (!canPurchase) {
      window.alert("Chi tai khoan customer moi co the dung gio hang.");
      return false;
    }

    return true;
  };

  const handleCheckout = () => {
    if (!requireAccess()) return;

    if (items.length === 0) {
      window.alert("Giỏ hàng đang trống.");
      return;
    }

    const invalidStockItem = pricedCartItems.find((item) => {
      const itemKey = buildCartItemKey(item);
      const stockState = stockStateByItemKey.get(itemKey);

      if (
        !stockState ||
        stockState.hasStockError ||
        stockState.isStockChecking
      ) {
        return true;
      }

      return Number(item?.quantity ?? 0) > Number(stockState.currentStock ?? 0);
    });

    if (invalidStockItem) {
      const itemKey = buildCartItemKey(invalidStockItem);
      const stockState = stockStateByItemKey.get(itemKey);

      if (stockState?.hasStockError || stockState?.isStockChecking) {
        setStockMessage(
          "Đang kiểm tra tồn kho sản phẩm trong giỏ. Vui lòng thử lại sau vài giây.",
        );
      } else {
        setStockMessage(
          `Sản phẩm ${invalidStockItem.title} chỉ còn ${stockState?.currentStock ?? 0} sản phẩm.`,
        );
      }

      setShowStockModal(true);
      return;
    }

    navigate("/checkout");
  };

  return (
    <main className="cart-page o-container">
      <nav className="cart-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>&gt;</span>
        <strong>Cart</strong>
      </nav>

      <h1 className="cart-title">YOUR CART</h1>

      <section className="cart-layout">
        <div className="cart-list">
          {items.length === 0 ? (
            <div className="cart-empty">
              <p>Giỏ hàng của bạn đang trống.</p>
              <Link to="/" className="cart-empty__btn">
                Về trang chủ
              </Link>
            </div>
          ) : (
            pricedCartItems.map((item) => {
              const itemKey = buildCartItemKey(item);
              const stockState = stockStateByItemKey.get(itemKey);
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
              const currentStock = stockState?.currentStock;
              const isStockChecking = Boolean(stockState?.isStockChecking);
              const hasStockError = Boolean(stockState?.hasStockError);
              const isReachedStockLimit =
                typeof currentStock === "number" &&
                item.quantity >= currentStock;
              const resolvedVariantLabel =
                stockState?.variantLabel ||
                String(item?.variantLabel ?? "").trim();

              return (
                <article key={itemKey} className="cart-item">
                  <button
                    type="button"
                    className="cart-item__remove"
                    aria-label="Remove item"
                    onClick={() => removeItem(itemKey)}
                  >
                    <span aria-hidden="true">Xóa</span>
                  </button>

                  <div className="cart-item__media">
                    <img src={item.image} alt={item.title} />
                  </div>

                  <div className="cart-item__content">
                    <h2>{item.title}</h2>
                    {resolvedVariantLabel ? (
                      <p>
                        Variant: <span>{resolvedVariantLabel}</span>
                      </p>
                    ) : (
                      <>
                        <p>
                          Size: <span>{item.size}</span>
                        </p>
                        <p>
                          Color: <span>{item.color}</span>
                        </p>
                      </>
                    )}
                    <p className="cart-item__shop">
                      <span
                        className="cart-item__shop-avatar"
                        aria-hidden="true"
                      >
                        {shopAvatar ? (
                          <img src={shopAvatar} alt="" loading="lazy" />
                        ) : (
                          <span>{shopInitial}</span>
                        )}
                      </span>
                      Shop: <span>{shopName}</span>
                    </p>
                    <p
                      className={`cart-item__stock ${
                        hasStockError || currentStock === 0
                          ? "cart-item__stock--warning"
                          : ""
                      }`}
                    >
                      {hasStockError
                        ? "Không tải được tồn kho hiện tại."
                        : isStockChecking
                          ? "Đang kiểm tra tồn kho..."
                          : currentStock === 0
                            ? "Biến thể này đã hết hàng."
                            : `Còn ${currentStock} sản phẩm.`}
                    </p>
                    <strong>{currency.format(item.livePrice ?? item.price ?? 0)}</strong>
                  </div>

                  <div className="cart-item__actions">
                    <div
                      className="cart-item__quantity"
                      role="group"
                      aria-label="Quantity"
                    >
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => decreaseItemQuantity(itemKey)}
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        aria-disabled={isStockChecking || isReachedStockLimit}
                        onClick={() => {
                          if (hasStockError || isStockChecking) {
                            setStockMessage(
                              "Đang kiểm tra tồn kho của sản phẩm này. Vui lòng thử lại sau vài giây.",
                            );
                            setShowStockModal(true);
                          } else if (
                            currentStock === 0 ||
                            item.quantity >= currentStock
                          ) {
                            setStockMessage(
                              `Chỉ còn ${currentStock} sản phẩm.`,
                            );
                            setShowStockModal(true);
                          } else {
                            increaseItemQuantity(itemKey);
                          }
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <aside className="cart-summary">
          <h3>Order Summary</h3>

          <div className="cart-summary__row">
            <span>Subtotal</span>
            <strong>{currency.format(subtotal)}</strong>
          </div>

          <div className="cart-summary__row">
            <span>Delivery Fee</span>
            <strong>
              {currency.format(items.length > 0 ? DELIVERY_FEE : 0)}
            </strong>
          </div>

          <div className="cart-summary__row cart-summary__row--total">
            <span>Total</span>
            <strong>{currency.format(total)}</strong>
          </div>

          <div className="cart-summary__actions">
            <button
              type="button"
              className="btn-delete"
              onClick={deleteAllItems}
            >
              Delete All
            </button>
            <button
              type="button"
              className="btn-checkout"
              onClick={handleCheckout}
            >
              Checkout
            </button>
            <Link to="/" className="btn-home">
              Home
            </Link>
          </div>
        </aside>
      </section>

      {showStockModal && (
        <div
          className="stock-modal-overlay"
          onClick={() => setShowStockModal(false)}
        >
          <div className="stock-modal" onClick={(e) => e.stopPropagation()}>
            <p>{stockMessage}</p>
            <button onClick={() => setShowStockModal(false)}>Đóng</button>
          </div>
        </div>
      )}
    </main>
  );
}

export default Cart;
