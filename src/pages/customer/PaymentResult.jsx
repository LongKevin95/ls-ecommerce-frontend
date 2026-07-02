import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  getOrderPaymentStatus,
  initSePayCheckout,
} from "../../api/paymentsApi";
import "./PaymentResult.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function submitHostedPaymentForm(checkoutForm) {
  const actionUrl = String(checkoutForm?.actionUrl ?? "").trim();
  const method =
    String(checkoutForm?.method ?? "POST")
      .trim()
      .toUpperCase() || "POST";
  const fields =
    checkoutForm?.fields && typeof checkoutForm.fields === "object"
      ? checkoutForm.fields
      : {};

  if (!actionUrl) {
    throw new Error("Unable to redirect to the SePay payment gateway.");
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

function getPresentation(paymentStatus, requestedResult) {
  if (paymentStatus === "paid") {
    return {
      title: "Payment Successful",
      description:
        "SePay has confirmed a successful transaction for your order.",
      tone: "success",
    };
  }

  if (paymentStatus === "pending") {
    return {
      title: "Waiting for Payment Confirmation",
      description:
        requestedResult === "success"
          ? "You have returned from SePay. The system is waiting for webhook confirmation of the transaction."
          : "The payment session is still pending completion or SePay has not sent the confirmation webhook yet.",
      tone: "pending",
    };
  }

  if (paymentStatus === "failed") {
    return {
      title: "Payment Failed",
      description:
        "The SePay transaction failed or was rejected. You can try again.",
      tone: "error",
    };
  }

  if (paymentStatus === "expired") {
    return {
      title: "Payment Session Expired",
      description:
        "This order has expired for online payment. Please create a new order if needed.",
      tone: "error",
    };
  }

  if (requestedResult === "cancel") {
    return {
      title: "Payment Cancelled",
      description:
        "You can come back and continue the payment when you're ready.",
      tone: "warning",
    };
  }

  return {
    title: "Payment Status",
    description: "The system is syncing payment information from SePay.",
    tone: "pending",
  };
}

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const [paymentState, setPaymentState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const orderId = String(searchParams.get("orderId") ?? "").trim();
  const requestedResult = String(searchParams.get("result") ?? "pending")
    .trim()
    .toLowerCase();

  useEffect(() => {
    if (!orderId) {
      setErrorMessage("Order ID not found for payment verification.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let pollTimeout = null;

    const fetchStatus = async (shouldContinuePolling = true) => {
      try {
        const nextState = await getOrderPaymentStatus(orderId);

        if (!isMounted) {
          return;
        }

        setPaymentState(nextState);
        setErrorMessage("");
        setIsLoading(false);

        if (
          shouldContinuePolling &&
          ["pending"].includes(
            String(nextState?.paymentStatus ?? "")
              .trim()
              .toLowerCase(),
          )
        ) {
          pollTimeout = window.setTimeout(() => {
            void fetchStatus(true);
          }, 4000);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error?.message ??
            "Unable to retrieve the payment status for this order.",
        );
        setIsLoading(false);
      }
    };

    void fetchStatus(true);

    return () => {
      isMounted = false;

      if (pollTimeout) {
        window.clearTimeout(pollTimeout);
      }
    };
  }, [orderId]);

  const presentation = useMemo(() => {
    return getPresentation(paymentState?.paymentStatus, requestedResult);
  }, [paymentState?.paymentStatus, requestedResult]);

  const canRetryPayment =
    paymentState?.paymentMethod === "sepay" &&
    ["pending", "failed"].includes(
      String(paymentState?.paymentStatus ?? "")
        .trim()
        .toLowerCase(),
    );

  const handleRetryPayment = async () => {
    if (!orderId || isRetrying) {
      return;
    }

    try {
      setIsRetrying(true);
      const paymentSession = await initSePayCheckout(orderId);
      submitHostedPaymentForm(paymentSession?.checkoutForm);
    } catch (error) {
      setErrorMessage(
        error?.message ?? "Unable to reinitialize the SePay payment session.",
      );
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <main className="payment-result-page o-container">
      <section
        className={`payment-result-card payment-result-card--${presentation.tone}`}
      >
        <span className="payment-result-card__eyebrow">SePay Payment</span>
        <h1>{presentation.title}</h1>
        <p>{presentation.description}</p>

        {isLoading ? (
          <div className="payment-result-loading" aria-live="polite">
            <span
              className="payment-result-loading__spinner"
              aria-hidden="true"
            />
            <span>Checking payment status...</span>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="payment-result-alert">{errorMessage}</div>
        ) : null}

        {paymentState ? (
          <dl className="payment-result-summary">
            <div>
              <dt>Order ID</dt>
              <dd>{paymentState.orderId || "N/A"}</dd>
            </div>
            <div>
              <dt>Method</dt>
              <dd>
                {paymentState.paymentMethod === "sepay" ? "SePay" : "COD"}
              </dd>
            </div>
            <div>
              <dt>Payment Status</dt>
              <dd>{paymentState.paymentStatus || "N/A"}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{currency.format(Number(paymentState.total ?? 0))}</dd>
            </div>
            <div>
              <dt>Payment Code</dt>
              <dd>{paymentState.paymentCode || "N/A"}</dd>
            </div>
            <div>
              <dt>Invoice Number</dt>
              <dd>{paymentState.paymentInvoiceNumber || "N/A"}</dd>
            </div>
          </dl>
        ) : null}

        <div className="payment-result-actions">
          {canRetryPayment ? (
            <button
              type="button"
              className="payment-result-button payment-result-button--primary"
              onClick={() => void handleRetryPayment()}
              disabled={isRetrying}
            >
              {isRetrying ? "Redirecting to SePay..." : "Pay Again with SePay"}
            </button>
          ) : null}

          <Link
            to="/my-orders"
            className="payment-result-button payment-result-button--secondary"
          >
            View My Orders
          </Link>

          <Link
            to="/"
            className="payment-result-button payment-result-button--ghost"
          >
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
