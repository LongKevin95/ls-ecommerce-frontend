function normalizeNumber(value, fallback = 0) {
  const nextValue = Number(value ?? fallback);
  return Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : fallback;
}

function normalizeDiscountPercentage(value, fallback = 0) {
  const nextValue = Math.round(Number(value ?? fallback));
  return Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : fallback;
}

function normalizeTimestamp(value) {
  const timestamp = Date.parse(String(value ?? "").trim());
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function isFlashSaleCampaignLive(
  flashSaleState,
  nowTimestamp = Date.now(),
) {
  const startsAtTimestamp = normalizeTimestamp(flashSaleState?.startsAt);
  const endsAtTimestamp = normalizeTimestamp(flashSaleState?.endsAt);

  return Boolean(
    flashSaleState?.isEnabled &&
      String(flashSaleState?.currentCampaignId ?? "").trim() &&
      startsAtTimestamp !== null &&
      endsAtTimestamp !== null &&
      startsAtTimestamp <= nowTimestamp &&
      endsAtTimestamp > nowTimestamp,
  );
}

export function isProductInCurrentFlashSale(
  product,
  flashSaleState,
  nowTimestamp = Date.now(),
) {
  if (!isFlashSaleCampaignLive(flashSaleState, nowTimestamp)) {
    return false;
  }

  return (
    String(product?.flashSaleCampaignId ?? product?.flashSale?.campaignId ?? "").trim() ===
      String(flashSaleState?.currentCampaignId ?? "").trim() &&
    normalizeNumber(
      product?.flashSaleDiscountPercent ?? product?.flashSale?.discountPercent,
    ) > 0
  );
}

export function resolveProductPriceState(
  product,
  flashSaleState = null,
  nowTimestamp = Date.now(),
) {
  const shouldUseFlashPricing = flashSaleState
    ? isProductInCurrentFlashSale(product, flashSaleState, nowTimestamp)
    : Boolean(product?.isFlashSaleActive);
  const currentPrice = shouldUseFlashPricing
    ? normalizeNumber(product?.displayPrice, product?.price)
    : normalizeNumber(
        product?.regularPrice,
        product?.price ?? product?.displayPrice,
      );
  const currentOldPrice = Math.max(
    shouldUseFlashPricing
      ? normalizeNumber(product?.displayOldPrice, product?.oldPrice)
      : normalizeNumber(
          product?.regularOldPrice,
          product?.oldPrice ?? product?.displayOldPrice,
        ),
    currentPrice,
  );
  const currentDiscountPercentage = shouldUseFlashPricing
    ? normalizeDiscountPercentage(
        product?.displayDiscountPercentage,
        product?.discountPercentage,
      )
    : normalizeDiscountPercentage(
        product?.regularDiscountPercentage,
        product?.discountPercentage,
      );

  return {
    currentPrice,
    currentOldPrice,
    currentDiscountPercentage,
    isFlashSaleActive: shouldUseFlashPricing,
  };
}

export function resolveVariantPriceState(
  variant,
  product,
  flashSaleState = null,
  nowTimestamp = Date.now(),
) {
  const shouldUseFlashPricing = flashSaleState
    ? isProductInCurrentFlashSale(product, flashSaleState, nowTimestamp)
    : Boolean(variant?.isFlashSaleActive ?? product?.isFlashSaleActive);
  const currentPrice = shouldUseFlashPricing
    ? normalizeNumber(
        variant?.displayPrice,
        product?.displayPrice ?? variant?.price ?? product?.price,
      )
    : normalizeNumber(
        variant?.regularPrice,
        product?.regularPrice ??
          variant?.price ??
          product?.price ??
          product?.displayPrice,
      );
  const currentOldPrice = Math.max(
    shouldUseFlashPricing
      ? normalizeNumber(
          variant?.displayOldPrice,
          product?.displayOldPrice ?? variant?.oldPrice ?? product?.oldPrice,
        )
      : normalizeNumber(
          variant?.regularOldPrice,
          product?.regularOldPrice ??
            variant?.oldPrice ??
            product?.oldPrice ??
            product?.displayOldPrice,
        ),
    currentPrice,
  );
  const currentDiscountPercentage = shouldUseFlashPricing
    ? normalizeDiscountPercentage(
        variant?.displayDiscountPercentage,
        product?.displayDiscountPercentage ?? product?.discountPercentage,
      )
    : normalizeDiscountPercentage(
        variant?.regularDiscountPercentage,
        product?.regularDiscountPercentage ?? product?.discountPercentage,
      );

  return {
    currentPrice,
    currentOldPrice,
    currentDiscountPercentage,
    isFlashSaleActive: shouldUseFlashPricing,
  };
}
