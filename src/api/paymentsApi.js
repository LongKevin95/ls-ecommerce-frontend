import { initSePayCheckout as initSePayCheckoutService, getOrderPaymentStatus as getOrderPaymentStatusService } from "../services/paymentService";

function normalizeText(value, fallback = "") {
  const nextValue = String(value ?? fallback).trim();
  return nextValue || fallback;
}

function normalizeCheckoutForm(checkoutForm) {
  const source = checkoutForm && typeof checkoutForm === "object" ? checkoutForm : {};
  const fields = source?.fields && typeof source.fields === "object" ? source.fields : {};

  return {
    actionUrl: normalizeText(source?.actionUrl),
    method: normalizeText(source?.method ?? "POST", "POST").toUpperCase(),
    fields: Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, String(value ?? "")]),
    ),
  };
}

function normalizePaymentStatusPayload(payload) {
  return {
    orderId: normalizeText(payload?.orderId),
    orderStatus: normalizeText(payload?.orderStatus, "pending").toLowerCase(),
    paymentMethod: normalizeText(payload?.paymentMethod, "cod").toLowerCase(),
    paymentProvider: normalizeText(payload?.paymentProvider, "manual").toLowerCase(),
    paymentStatus: normalizeText(payload?.paymentStatus, "unpaid").toLowerCase(),
    paymentCode: normalizeText(payload?.paymentCode),
    paymentInvoiceNumber: normalizeText(payload?.paymentInvoiceNumber),
    paymentExpiresAt: payload?.paymentExpiresAt ?? null,
    paidAt: payload?.paidAt ?? null,
    total: Number(payload?.total ?? 0),
    updatedAt: payload?.updatedAt ?? null,
  };
}

export async function initSePayCheckout(orderId) {
  const payload = await initSePayCheckoutService(orderId);

  return {
    orderId: normalizeText(payload?.orderId),
    paymentStatus: normalizeText(payload?.paymentStatus, "pending").toLowerCase(),
    paymentMethod: normalizeText(payload?.paymentMethod, "sepay").toLowerCase(),
    paymentProvider: normalizeText(payload?.paymentProvider, "sepay").toLowerCase(),
    paymentCode: normalizeText(payload?.paymentCode),
    paymentInvoiceNumber: normalizeText(payload?.paymentInvoiceNumber),
    paymentExpiresAt: payload?.paymentExpiresAt ?? null,
    total: Number(payload?.total ?? 0),
    checkoutForm: normalizeCheckoutForm(payload?.checkoutForm),
  };
}

export async function getOrderPaymentStatus(orderId) {
  const payload = await getOrderPaymentStatusService(orderId);
  return normalizePaymentStatusPayload(payload);
}
