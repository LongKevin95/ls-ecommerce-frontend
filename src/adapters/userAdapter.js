export function normalizeUser(user) {
  const roles = Array.isArray(user?.roles)
    ? user.roles
    : user?.role
      ? [user.role]
      : [];

  return {
    id: String(user?.id ?? ""),
    mongoId: String(user?.mongoId ?? ""),
    name: String(user?.name ?? "").trim(),
    email: String(user?.email ?? "")
      .trim()
      .toLowerCase(),
    shopName:
      String(user?.shopName ?? user?.shop?.name ?? "").trim() ||
      String(user?.name ?? "").trim(),
    roles,
    status:
      String(user?.status ?? "active")
        .trim()
        .toLowerCase() || "active",
    avatarUrl: String(user?.avatarUrl ?? "").trim(),
    phone: String(user?.phone ?? "").trim(),
    address: String(user?.address ?? "").trim(),
    bio: String(user?.bio ?? "").trim(),
    shop: user?.shop
      ? {
          id: String(user.shop.id ?? ""),
          name: String(user.shop.name ?? "").trim(),
          slug: String(user.shop.slug ?? "").trim(),
        }
      : null,
  };
}
