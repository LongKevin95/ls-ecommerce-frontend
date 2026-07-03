function normalizeText(value) {
  return String(value ?? "").trim();
}

function formatEntityId(prefix, value, length = 6) {
  const rawValue = normalizeText(value);

  if (!rawValue) {
    return "N/A";
  }

  const normalizedPrefix = normalizeText(prefix).toLowerCase();

  if (!normalizedPrefix) {
    return rawValue;
  }

  const lowerValue = rawValue.toLowerCase();

  if (lowerValue.startsWith(`${normalizedPrefix}-`)) {
    return `${normalizedPrefix}-${lowerValue.slice(normalizedPrefix.length + 1)}`;
  }

  const compactValue = rawValue.replace(/[^a-zA-Z0-9]/g, "");
  const suffixSource = compactValue || rawValue;
  const suffix = suffixSource.slice(-Math.max(4, Number(length) || 6)).toLowerCase();

  return `${normalizedPrefix}-${suffix}`;
}

export function formatProductId(value, length = 6) {
  return formatEntityId("p", value, length);
}

export function formatOrderId(value, length = 6) {
  return formatEntityId("o", value, length);
}

export function formatUserId(value, length = 6) {
  return formatEntityId("u", value, length);
}
