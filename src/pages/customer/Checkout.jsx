import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueries, useQueryClient } from "@tanstack/react-query";

import { getProductById } from "../../api/productApi";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { useFlashSaleQuery } from "../../hooks/useFlashSaleQuery";
import { createOrder } from "../../api/ordersApi";
import { initSePayCheckout } from "../../api/paymentsApi";
import { resolveVariantPriceState } from "../../utils/flashSalePricing";
import "./Checkout.css";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const DELIVERY_FEE = 5;

const initialFormData = {
  country: "Vietnam",
  firstName: "",
  lastName: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  phone: "",
  email: "",
  paymentMethod: "cod",
};

function submitHostedPaymentForm(checkoutForm) {
  const actionUrl = String(checkoutForm?.actionUrl ?? "").trim();
  const method = String(checkoutForm?.method ?? "POST").trim().toUpperCase() || "POST";
  const fields =
    checkoutForm?.fields && typeof checkoutForm.fields === "object"
      ? checkoutForm.fields
      : {};

  if (!actionUrl) {
    throw new Error("Không thể chuyển hướng tới cổng thanh toán SePay.");
  }

  const form = document.createElement("form");
  form.method = method;
  form.action = actionUrl;
  form.style.display = "none";

  Object.entries(fields).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = String(value ?? "");
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  form.remove();
}

function Checkout() {
  const { user, isCustomer } = useAuth();
  const queryClient = useQueryClient();
  const { items, deleteAllItems, buildCartItemKey } = useCart();
  const { data: flashSaleState } = useFlashSaleQuery();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
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
  const pricedItems = useMemo(
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

  const canPurchase = isCustomer;
  const shipping = items.length > 0 ? DELIVERY_FEE : 0;
  const subtotal = useMemo(
    () =>
      pricedItems.reduce(
        (sum, item) =>
          sum + Number(item.livePrice ?? item.price ?? 0) * Number(item.quantity ?? 0),
        0,
      ),
    [pricedItems],
  );
  const total = subtotal + shipping;
  const normalizedCustomerEmail = String(user?.email ?? "")
    .trim()
    .toLowerCase();

  const requireAccess = () => {
    if (!user) {
      navigate("/login", { state: { from: "/checkout" } });
      return false;
    }

    if (!canPurchase) {
      window.alert("Chi tai khoan customer moi co the checkout.");
      return false;
    }

    return true;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleBackToHomepage = () => {
    setIsSuccessModalOpen(false);
    navigate("/");
  };

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: "/checkout" }, replace: true });
      return;
    }

    if (!canPurchase) {
      navigate("/", { replace: true });
    }
  }, [canPurchase, navigate, user]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!requireAccess()) return;

    if (items.length === 0) {
      window.alert("Giỏ hàng đang trống, không thể checkout.");
      navigate("/cart");
      return;
    }

    const requiredFields = [
      "country",
      "firstName",
      "lastName",
      "address",
      "city",
      "state",
      "zipCode",
      "phone",
      "email",
    ];

    const hasEmptyField = requiredFields.some(
      (field) => !String(formData[field] ?? "").trim(),
    );

    if (hasEmptyField) {
      window.alert("Vui lòng nhập đầy đủ thông tin để thanh toán.");
      return;
    }

    const shippingAddress = {
      fullName:
        `${String(formData.firstName ?? "").trim()} ${String(formData.lastName ?? "").trim()}`.trim(),
      phone: String(formData.phone ?? "").trim(),
      address: String(formData.address ?? "").trim(),
      city: String(formData.city ?? "").trim(),
      state: String(formData.state ?? "").trim(),
      zipCode: String(formData.zipCode ?? "").trim(),
      country: String(formData.country ?? "").trim(),
    };

    const orderItems = pricedItems.map((item) => ({
      productId: String(item?.productId ?? ""),
      variantId: String(item?.variantId ?? ""),
      variantLabel: String(item?.variantLabel ?? "").trim(),
      title: item?.title ?? "Product",
      image: item?.image ?? "/favicon.svg",
      quantity: Number(item?.quantity ?? 0),
      price: Number(item?.livePrice ?? item?.price ?? 0),
      vendorEmail: String(item?.vendorEmail ?? "")
        .trim()
        .toLowerCase(),
      shopName: item?.shopName ?? "Shop",
      sku: item?.sku ?? "",
      color: item?.color ?? "Default",
      size: item?.size ?? "M",
    }));

    setIsSubmitting(true);

    try {
      const createdOrder = await createOrder({
        customerEmail: normalizedCustomerEmail,
        customerName:
          shippingAddress.fullName || user?.name || user?.email || "Customer",
        contactEmail: String(formData.email ?? "")
          .trim()
          .toLowerCase(),
        customerPhone: shippingAddress.phone,
        status: "pending",
        paymentMethod: formData.paymentMethod,
        shippingAddress,
        items: orderItems,
        total,
      });

      deleteAllItems();
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["products", "admin"] }),
        queryClient.invalidateQueries({ queryKey: ["products", "public"] }),
      ]);

      if (createdOrder?.paymentMethod === "sepay") {
        try {
          const paymentSession = await initSePayCheckout(createdOrder.id);
          submitHostedPaymentForm(paymentSession?.checkoutForm);
          return;
        } catch (paymentError) {
          console.error("Lỗi khi khởi tạo SePay:", paymentError);
          window.alert(
            paymentError?.message ??
              "Đơn hàng đã được tạo nhưng chưa khởi tạo được phiên thanh toán SePay.",
          );
          navigate(
            `/payment/result?result=error&provider=sepay&orderId=${encodeURIComponent(createdOrder.id)}`,
          );
          return;
        }
      }
    } catch (error) {
      console.error("Lỗi khi checkout:", error);
      window.alert(
        error?.message ?? "Có lỗi xảy ra khi checkout. Vui lòng thử lại.",
      );
      return;
    } finally {
      setIsSubmitting(false);
    }

    setIsSuccessModalOpen(true);
  };

  return (
    <>
      <main className="checkout-page o-container">
        <form className="checkout-layout" onSubmit={handleSubmit}>
          <section className="checkout-form">
            <h1>Checkout</h1>

            <label>
              Country/Region
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="Country/Region"
              />
            </label>

            <div className="checkout-grid-two">
              <label>
                First name
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                />
              </label>
              <label>
                Last name
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                />
              </label>
            </div>

            <label>
              Address
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Address"
              />
            </label>

            <div className="checkout-grid-three">
              <label>
                City
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                />
              </label>
              <label>
                State
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="State"
                />
              </label>
              <label>
                ZIP code
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  placeholder="ZIP code"
                />
              </label>
            </div>

            <div className="checkout-grid-two">
              <label>
                Phone
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone"
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                />
              </label>
            </div>

            <h2>Payment</h2>

            <div className="checkout-payment-options">
              <label className="checkout-payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={formData.paymentMethod === "cod"}
                  onChange={handleChange}
                />
                <span>Cash on Delivery (COD)</span>
              </label>

              <label className="checkout-payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="sepay"
                  checked={formData.paymentMethod === "sepay"}
                  onChange={handleChange}
                />
                <span>Thanh toán online qua SePay</span>
              </label>
            </div>

            <p className="checkout-payment-note">
              Với SePay, bạn sẽ được chuyển sang cổng thanh toán để chọn QR hoặc
              nhập thông tin thẻ an toàn.
            </p>

            <button
              type="submit"
              className="checkout-submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="checkout-submit__spinner"
                    aria-hidden="true"
                  />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Place Order</span>
              )}
            </button>
          </section>

          <aside className="checkout-summary">
            <h3>Order Summary</h3>

            <div className="checkout-product-list">
              {items.length === 0 ? (
                <div className="checkout-empty">
                  <p>Giỏ hàng trống.</p>
                  <Link to="/cart">Về giỏ hàng</Link>
                </div>
              ) : (
                pricedItems.map((item) => (
                  <article
                    key={buildCartItemKey(item)}
                    className="checkout-product-item"
                  >
                    <div className="checkout-product-item__image">
                      <img src={item.image} alt={item.title} />
                      <span>{item.quantity}</span>
                    </div>
                    <div className="checkout-product-item__content">
                      <h4>{item.title}</h4>
                      <small>
                        {item.variantLabel || `${item.size} / ${item.color}`}
                      </small>
                    </div>
                    <strong>
                      {currency.format(
                        Number(item.livePrice ?? item.price ?? 0) * item.quantity,
                      )}
                    </strong>
                  </article>
                ))
              )}
            </div>

            <div className="checkout-summary__row">
              <span>Subtotal</span>
              <strong>{currency.format(subtotal)}</strong>
            </div>
            <div className="checkout-summary__row">
              <span>Shipping</span>
              <strong>{currency.format(shipping)}</strong>
            </div>
            <div className="checkout-summary__row checkout-summary__row--total">
              <span>Total</span>
              <strong>{currency.format(total)}</strong>
            </div>
          </aside>
        </form>
      </main>

      {isSuccessModalOpen && (
        <div className="checkout-success-modal" role="dialog" aria-modal="true">
          <div className="checkout-success-modal__backdrop" />
          <div className="checkout-success-modal__card">
            <span>
              <img
                src="https://i.ibb.co/PsmBjJXY/successfully-icon.png"
                alt="success"
              />{" "}
              <h2>Your order has been placed successfully!</h2>
            </span>

            <button
              type="button"
              className="checkout-success-modal__button"
              onClick={handleBackToHomepage}
            >
              ← Back to Homepage
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Checkout;
