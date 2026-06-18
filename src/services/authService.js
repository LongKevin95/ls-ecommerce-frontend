import { normalizeUser } from "../adapters/userAdapter";
import apiClient, { extractApiPayload } from "../api/apiClient";
import { buildUserProfileFormData } from "../utils/formData";

function normalizeAuthResponse(data = {}) {
  return {
    accessToken: String(data?.accessToken ?? "").trim(),
    user: normalizeUser(data?.user),
  };
}

export async function loginWithCredentials({ email, password }) {
  const response = await apiClient.post("/auth/login", {
    email,
    password,
  });

  return normalizeAuthResponse(extractApiPayload(response));
}

export async function registerUser({ name, email, password }) {
  const response = await apiClient.post("/auth/register", {
    name,
    email,
    password,
  });

  return normalizeAuthResponse(extractApiPayload(response));
}

export async function updateUserRole(role) {
  const response = await apiClient.patch("/users/me/role", {
    role,
  });

  return normalizeAuthResponse(extractApiPayload(response));
}

export async function updateUserProfile(_userId, updates = {}) {
  const payload =
    typeof FormData !== "undefined" && updates instanceof FormData
      ? updates
      : buildUserProfileFormData(updates);
  const response = await apiClient.patch("/users/me", payload);
  const normalizedUser = normalizeUser(extractApiPayload(response));
  const nextShopName = String(updates?.shopName ?? "").trim();

  if (!nextShopName) {
    return normalizedUser;
  }

  return {
    ...normalizedUser,
    shopName: nextShopName,
    shop: normalizedUser?.shop
      ? {
          ...normalizedUser.shop,
          name: nextShopName,
        }
      : normalizedUser.shop,
  };
}
