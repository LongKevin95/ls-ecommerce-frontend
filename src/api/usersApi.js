import apiClient, { extractApiPayload } from "./apiClient";
import { getUsers as getUsersService } from "../services/userService";
import { readAuthSession } from "../utils/authStorage";
import { getShops } from "./shopsApi";

function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function buildShopByContactEmail(shops) {
  return new Map(
    (Array.isArray(shops) ? shops : [])
      .map((shop) => [normalizeEmail(shop?.email), shop])
      .filter(([email]) => email),
  );
}

function normalizePublicUserFromShop(shop) {
  const normalizedEmail = normalizeEmail(shop?.email ?? shop?.vendorEmail);
  const shopName =
    String(shop?.shopName ?? shop?.name ?? "").trim() ||
    (normalizedEmail ? normalizedEmail.split("@")[0] : "Vendor Shop");

  return {
    id: String(shop?.id ?? shop?._id ?? normalizedEmail).trim(),
    name: String(shop?.name ?? shopName).trim() || shopName,
    email: normalizedEmail,
    roles: ["vendor"],
    status: "active",
    avatarUrl: String(shop?.avatarUrl ?? "").trim(),
    phone: String(shop?.phone ?? "").trim(),
    address: String(shop?.address ?? "").trim(),
    bio: String(shop?.bio ?? "").trim(),
    shopName,
  };
}

export const getUsers = async () => {
  const currentSession = readAuthSession();
  const currentRoles = Array.isArray(currentSession?.user?.roles)
    ? currentSession.user.roles
    : [];

  if (!currentSession?.accessToken || !currentRoles.includes("admin")) {
    const shops = await getShops().catch(() => []);
    return shops.map(normalizePublicUserFromShop);
  }

  try {
    const [users, shops] = await Promise.all([
      getUsersService(),
      getShops().catch(() => []),
    ]);
    const shopByEmail = buildShopByContactEmail(shops);

    return users.map((user) => {
      const matchedShop = shopByEmail.get(normalizeEmail(user?.email));
      return {
        ...user,
        shopName:
          String(user?.shopName ?? user?.shop?.name ?? "").trim() ||
          matchedShop?.shopName ||
          matchedShop?.name ||
          user?.name ||
          (user?.email ? String(user.email).split("@")[0] : ""),
        avatarUrl:
          String(user?.avatarUrl ?? "").trim() ||
          String(matchedShop?.avatarUrl ?? "").trim(),
      };
    });
  } catch {
    const shops = await getShops().catch(() => []);
    return shops.map(normalizePublicUserFromShop);
  }
};

export const updateVendorStatus = async ({ userId, status }) => {
  const normalizedUserId = String(userId ?? "").trim();

  if (!normalizedUserId) {
    throw new Error("Missing vendor id.");
  }

  const normalizedStatus = String(status ?? "").trim().toLowerCase();

  if (!["active", "rejected"].includes(normalizedStatus)) {
    throw new Error("Vendor status is invalid.");
  }

  const response = await apiClient.patch(
    `/admin/users/${normalizedUserId}/status`,
    {
      status: normalizedStatus,
    },
  );

  return extractApiPayload(response);
};

export const updateCustomerStatus = async ({ userId, status }) => {
  const normalizedUserId = String(userId ?? "").trim();

  if (!normalizedUserId) {
    throw new Error("Missing customer id.");
  }

  const response = await apiClient.patch(
    `/admin/users/${normalizedUserId}/status`,
    {
      status,
    },
  );

  return extractApiPayload(response);
};

export const deleteUserAccount = async ({ userId }) => {
  const normalizedUserId = String(userId ?? "").trim();

  if (!normalizedUserId) {
    throw new Error("Missing user id.");
  }

  const response = await apiClient.delete(`/admin/users/${normalizedUserId}`);
  return extractApiPayload(response);
};
