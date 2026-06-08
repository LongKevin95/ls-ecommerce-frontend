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

  if (!currentSession?.accessToken) {
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

export const updateVendorStatus = async () => {
  throw new Error(
    "Backend hiện chưa hỗ trợ admin cập nhật trạng thái vendor từ frontend này.",
  );
};

export const updateCustomerStatus = async () => {
  throw new Error(
    "Backend hiện chưa hỗ trợ admin cập nhật trạng thái customer từ frontend này.",
  );
};

export const deleteUserAccount = async () => {
  throw new Error(
    "Backend hiện chưa hỗ trợ xoá tài khoản từ frontend quản trị này.",
  );
};
