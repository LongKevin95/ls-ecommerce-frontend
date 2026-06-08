import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { formatCurrency } from "../../utils/formatters";
import { notifyError, notifySuccess } from "../../utils/notify";
import { checkoutSchema } from "../../utils/validation";
import { createOrder } from "../../services/orderService";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useProductsQuery } from "../hooks/useProductsQuery";

const initialForm = {
  firstName: "",
  lastName: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  country: "Vietnam",
  phone: "",
  email: "",
  paymentMethod: "cod",
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const { data: products = [] } = useProductsQuery();
  const [form, setForm] = useState(initialForm);

  const checkoutItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        product:
          products.find((product) => product.id === item.productId) ?? null,
      })),
    [items, products],
  );

  const total = checkoutItems.reduce(
    (sum, item) =>
      sum + (Number(item.product?.price ?? 0) || 0) * item.quantity,
    0,
  );

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      checkoutSchema.parse(form);

      return createOrder({
        customerId: user?.id,
        paymentMethod: form.paymentMethod,
        shippingAddress: {
          fullName: `${form.firstName} ${form.lastName}`.trim(),
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          country: form.country,
        },
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          variantLabel: item.variantLabel,
          title: item.product?.title ?? "Product",
          image:
            item.product?.thumbnail ?? item.product?.image ?? "/favicon.svg",
          quantity: item.quantity,
          price: Number(item.product?.price ?? 0),
          vendorEmail: item.product?.vendorEmail ?? "",
          shopName: item.product?.shopName ?? "Shop",
          sku: "",
          color: item.color,
          size: item.size,
        })),
      });
    },
    onSuccess: async () => {
      clearCart();
      await queryClient.invalidateQueries({ queryKey: ["clean-orders"] });
      notifySuccess("Đặt hàng thành công với payload tối thiểu.");
      navigate("/my-orders", { replace: true });
    },
    onError: (error) => {
      notifyError(error?.message || "Không thể checkout.");
    },
  });

  return (
    <section className="clean-container clean-page">
      <div className="clean-page__header">
        <h1>Checkout</h1>
        <p className="clean-page__lead">
          Payload gửi đi chỉ gồm `customerId`, `shippingAddress`,
          `paymentMethod`, `items`.
        </p>
      </div>

      <div className="clean-checkout-layout">
        <form
          className="clean-panel clean-form"
          onSubmit={(event) => {
            event.preventDefault();
            checkoutMutation.mutate();
          }}
        >
          <div className="clean-form__grid">
            <label>
              First name
              <input
                value={form.firstName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    firstName: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Last name
              <input
                value={form.lastName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lastName: event.target.value }))
                }
              />
            </label>
          </div>
          <label>
            Address
            <input
              value={form.address}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, address: event.target.value }))
              }
            />
          </label>
          <div className="clean-form__grid">
            <label>
              City
              <input
                value={form.city}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, city: event.target.value }))
                }
              />
            </label>
            <label>
              State
              <input
                value={form.state}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, state: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="clean-form__grid">
            <label>
              Zip code
              <input
                value={form.zipCode}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, zipCode: event.target.value }))
                }
              />
            </label>
            <label>
              Country
              <input
                value={form.country}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, country: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="clean-form__grid">
            <label>
              Phone
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, phone: event.target.value }))
                }
              />
            </label>
            <label>
              Contact email
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
            </label>
          </div>
          <label>
            Payment method
            <select
              value={form.paymentMethod}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  paymentMethod: event.target.value,
                }))
              }
            >
              <option value="cod">Cash on delivery</option>
              <option value="card">Card</option>
            </select>
          </label>
          <button
            type="submit"
            className="clean-button"
            disabled={checkoutMutation.isPending || checkoutItems.length === 0}
          >
            {checkoutMutation.isPending ? "Processing..." : "Place order"}
          </button>
        </form>

        <aside className="clean-summary">
          <h2>Order summary</h2>
          <ul>
            {checkoutItems.map((item) => (
              <li
                key={`${item.productId}-${item.variantId || `${item.color}-${item.size}`}`}
              >
                <div className="clean-cart-row">
                  <span>
                    {item.product?.title ?? item.productId} x {item.quantity}
                  </span>
                  <strong>
                    {formatCurrency(
                      (Number(item.product?.price ?? 0) || 0) * item.quantity,
                    )}
                  </strong>
                </div>
                <small className="clean-muted">
                  {item.variantLabel || `${item.color} / ${item.size}`}
                </small>
              </li>
            ))}
          </ul>
          <div className="clean-cart-row">
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
        </aside>
      </div>
    </section>
  );
}
