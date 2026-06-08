const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatCurrency(value) {
  return currency.format(Number(value ?? 0));
}

export function formatDateTime(value) {
  if (!value) {
    return "N/A";
  }

  return dateTime.format(new Date(value));
}
