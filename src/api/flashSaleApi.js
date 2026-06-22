import {
  getFlashSaleState as getFlashSaleStateService,
  updateFlashSaleState as updateFlashSaleStateService,
} from "../services/flashSaleService";

function normalizeDateValue(value) {
  const nextValue = String(value ?? "").trim();
  return nextValue || null;
}

export function normalizeFlashSaleState(state) {
  return {
    id: String(state?.id ?? state?._id ?? "").trim(),
    isEnabled: Boolean(state?.isEnabled),
    isActive: Boolean(state?.isActive),
    currentCampaignId: String(state?.currentCampaignId ?? "").trim(),
    startsAt: normalizeDateValue(state?.startsAt),
    endsAt: normalizeDateValue(state?.endsAt),
    updatedBy: String(state?.updatedBy ?? "").trim(),
  };
}

export async function getFlashSaleState() {
  const state = await getFlashSaleStateService();
  return normalizeFlashSaleState(state);
}

export async function updateFlashSaleState(payload = {}) {
  const nextState = await updateFlashSaleStateService(payload);
  return normalizeFlashSaleState(nextState);
}
