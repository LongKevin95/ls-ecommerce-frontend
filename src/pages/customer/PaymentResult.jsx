import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { getOrderPaymentStatus, initSePayCheckout } from "../../api/paymentsApi";
import "./PaymentResult.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

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

function getPresentation(paymentStatus, requestedResult) {
  if (paymentStatus === "paid") {
    return {
      title: "Thanh toán thành công",
      description: "SePay đã xác nhận giao dịch thành công cho đơn hàng của bạn.",
      tone: "success",
    };
  }

  if (paymentStatus === "pending") {
    return {
      title: "Đang chờ xác nhận thanh toán",
      description:
        requestedResult === "success"
          ? "Bạn đã quay lại từ SePay. Hệ thống đang chờ webhook xác nhận giao dịch."
          : "Phiên thanh toán đang chờ hoàn tất hoặc SePay chưa gửi webhook xác nhận.",
      tone: "pending",
    };
  }

  if (paymentStatus === "failed") {
    return {
      title: "Thanh toán chưa thành công",
      description: "Giao dịch SePay đã thất bại hoặc bị từ chối. Bạn có thể thử lại.",
      tone: "error",
    };
  }

  if (paymentStatus === "expired") {
    return {
      title: "Phiên thanh toán đã hết hạn",
      description: "Đơn hàng này đã hết hạn thanh toán online. Vui lòng tạo đơn mới nếu cần.",
      tone: "error",
    };
  }

  if (requestedResult === "cancel") {
    return {
      title: "Bạn đã hủy thanh toán",
      description: "Bạn có thể quay lại để tiếp tục thanh toán khi sẵn sàng.",
      tone: "warning",
    };
  }

  return {
    title: "Trạng thái thanh toán",
    description: "Hệ thống đang đồng bộ thông tin thanh toán từ SePay.",
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
      setErrorMessage("Không tìm thấy mã đơn hàng để kiểm tra thanh toán.");
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
          ["pending"].includes(String(nextState?.paymentStatus ?? "").trim().toLowerCase())
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
          error?.message ?? "Không thể lấy trạng thái thanh toán của đơn hàng này.",
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
        error?.message ?? "Không thể khởi tạo lại phiên thanh toán SePay.",
      );
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <main className="payment-result-page o-container">
      <section className={`payment-result-card payment-result-card--${presentation.tone}`}>
        <span className="payment-result-card__eyebrow">SePay Payment</span>
        <h1>{presentation.title}</h1>
        <p>{presentation.description}</p>

        {isLoading ? (
          <div className="payment-result-loading" aria-live="polite">
            <span className="payment-result-loading__spinner" aria-hidden="true" />
            <span>Đang kiểm tra trạng thái thanh toán...</span>
          </div>
        ) : null}

        {errorMessage ? <div className="payment-result-alert">{errorMessage}</div> : null}

        {paymentState ? (
          <dl className="payment-result-summary">
            <div>
              <dt>Mã đơn hàng</dt>
              <dd>{paymentState.orderId || "N/A"}</dd>
            </div>
            <div>
              <dt>Phương thức</dt>
              <dd>{paymentState.paymentMethod === "sepay" ? "SePay" : "COD"}</dd>
            </div>
            <div>
              <dt>Trạng thái thanh toán</dt>
              <dd>{paymentState.paymentStatus || "N/A"}</dd>
            </div>
            <div>
              <dt>Số tiền</dt>
              <dd>{currency.format(Number(paymentState.total ?? 0))}</dd>
            </div>
            <div>
              <dt>Mã thanh toán</dt>
              <dd>{paymentState.paymentCode || "N/A"}</dd>
            </div>
            <div>
              <dt>Mã invoice</dt>
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
              {isRetrying ? "Đang chuyển tới SePay..." : "Thanh toán lại với SePay"}
            </button>
          ) : null}

          <Link
            to="/my-orders"
            className="payment-result-button payment-result-button--secondary"
          >
            Xem đơn hàng của tôi
          </Link>

          <Link to="/" className="payment-result-button payment-result-button--ghost">
            Về trang chủ
          </Link>
        </div>
      </section>
    </main>
  );
}
