import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  PRODUCT_STATUS,
  formatProductCategoryLabel,
  updateProductById,
} from "../../api/productApi";
import { getMyShop, updateMyShop } from "../../api/shopsApi";
import { useAdminProductsQuery } from "../../hooks/useAdminProductsQuery";
import { useAuth } from "../../hooks/useAuth";
import { isProductOwnedByVendor } from "./vendorDataUtils";
import "./VendorDashboard.css";

const ITEMS_PER_PAGE = 10;

export default function VendorProfile() {
  const queryClient = useQueryClient();
  const { user, updateProfile } = useAuth();
  const { data: products = [], isLoading: isProductsLoading } =
    useAdminProductsQuery();

  const [draftStockById, setDraftStockById] = useState({});
  const [processingProductId, setProcessingProductId] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [profileForm, setProfileForm] = useState({
    name: "",
    shopName: "",
    avatarUrl: "",
    phone: "",
    address: "",
    bio: "",
    shopDescription: "",
    shopLogo: "",
    shopBanner: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [shopLogoFile, setShopLogoFile] = useState(null);
  const [shopBannerFile, setShopBannerFile] = useState(null);
  const [shouldRemoveAvatar, setShouldRemoveAvatar] = useState(false);
  const [shouldRemoveLogo, setShouldRemoveLogo] = useState(false);
  const [shouldRemoveBanner, setShouldRemoveBanner] = useState(false);

  const vendorEmail = String(user?.email ?? "")
    .trim()
    .toLowerCase();
  const vendorId = String(user?.id ?? "").trim();

  const vendorProducts = useMemo(() => {
    return products.filter((product) =>
      isProductOwnedByVendor(product, vendorEmail, vendorId),
    );
  }, [products, vendorEmail, vendorId]);

  const stockStats = useMemo(() => {
    const inStock = vendorProducts.filter(
      (product) => Number(product?.stock ?? 0) > 0,
    ).length;

    return {
      total: vendorProducts.length,
      inStock,
      outOfStock: vendorProducts.length - inStock,
    };
  }, [vendorProducts]);

  const paginatedVendorProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return vendorProducts.slice(startIndex, endIndex);
  }, [currentPage, vendorProducts]);

  const totalPages = Math.ceil(vendorProducts.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setProfileForm((previous) => ({
      ...previous,
      name: user?.name ?? "",
      shopName: user?.shopName ?? previous.shopName ?? user?.name ?? "",
      avatarUrl: user?.avatarUrl ?? "",
      phone: user?.phone ?? "",
      address: user?.address ?? previous.address ?? "",
      bio: user?.bio ?? "",
    }));
  }, [user]);

  useEffect(() => {
    let isSubscribed = true;

    async function loadMyShop() {
      try {
        const shop = await getMyShop();

        if (!isSubscribed || !shop) {
          return;
        }

        setProfileForm((previous) => ({
          ...previous,
          shopName: shop?.name ?? previous.shopName,
          shopDescription: shop?.description ?? "",
          shopLogo: shop?.logo ?? "",
          shopBanner: shop?.banner ?? "",
          address: shop?.address?.addressLine1 || previous.address,
        }));
      } catch {
        return;
      }
    }

    if (vendorId) {
      void loadMyShop();
    }

    return () => {
      isSubscribed = false;
    };
  }, [vendorId]);

  useEffect(() => {
    if (currentPage <= totalPages) {
      return;
    }

    setCurrentPage(Math.max(totalPages, 1));
  }, [currentPage, totalPages]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    try {
      setIsSavingProfile(true);

      await updateProfile({
        name: profileForm.name,
        shopName: profileForm.shopName,
        avatarUrl: profileForm.avatarUrl,
        avatarFile,
        removeAvatar: shouldRemoveAvatar,
        phone: profileForm.phone,
        address: profileForm.address,
        bio: profileForm.bio,
      });

      await updateMyShop({
        name: profileForm.shopName,
        description: profileForm.shopDescription,
        logo: profileForm.shopLogo,
        banner: profileForm.shopBanner,
        logoFile: shopLogoFile,
        bannerFile: shopBannerFile,
        removeLogo: shouldRemoveLogo,
        removeBanner: shouldRemoveBanner,
        contactEmail: user?.email ?? "",
        phone: profileForm.phone,
        address: {
          addressLine1: profileForm.address,
          city: "",
          state: "",
          zipCode: "",
          country: "",
        },
      });

      setAvatarFile(null);
      setShopLogoFile(null);
      setShopBannerFile(null);
      setShouldRemoveAvatar(false);
      setShouldRemoveLogo(false);
      setShouldRemoveBanner(false);

      await queryClient.invalidateQueries({ queryKey: ["users"] });
      await queryClient.invalidateQueries({ queryKey: ["shops"] });
      await queryClient.invalidateQueries({ queryKey: ["products", "admin"] });
      await queryClient.invalidateQueries({ queryKey: ["products", "public"] });
      window.alert("Cap nhat profile shop thanh cong.");
    } catch (error) {
      window.alert(error?.message ?? "Khong the cap nhat profile shop.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const getDraftStock = (product) => {
    const productId = String(product?.id ?? "");

    if (draftStockById[productId] !== undefined) {
      return draftStockById[productId];
    }

    return String(product?.stock ?? 0);
  };

  const handleSaveStock = async (product) => {
    const productId = String(product?.id ?? "").trim();
    const draftValue = getDraftStock(product);
    const nextStock = Number(draftValue);

    if (!productId || !Number.isFinite(nextStock) || nextStock < 0) {
      window.alert("Stock khong hop le.");
      return;
    }

    try {
      setProcessingProductId(productId);
      await updateProductById({
        id: productId,
        updates: {
          stock: nextStock,
          status:
            nextStock > 0 ? PRODUCT_STATUS.ACTIVE : PRODUCT_STATUS.OUT_OF_STOCK,
        },
      });

      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["products", "admin"] }),
        queryClient.invalidateQueries({ queryKey: ["products", "public"] }),
      ]);
    } finally {
      setProcessingProductId("");
    }
  };

  return (
    <div className="vendor-dashboard">
      <section className="vendor-section-card">
        <div className="vendor-section-card__header">
          <h2>Shop profile settings</h2>
          <span>Cap nhat tai khoan, avatar, shop logo va banner</span>
        </div>

        <form className="vendor-profile-form" onSubmit={handleSaveProfile}>
          <label>
            Owner name
            <input
              className="vendor-inline-input"
              type="text"
              name="name"
              value={profileForm.name}
              onChange={handleProfileChange}
            />
          </label>
          <label>
            Shop name
            <input
              className="vendor-inline-input"
              type="text"
              name="shopName"
              value={profileForm.shopName}
              onChange={handleProfileChange}
            />
          </label>
          <label>
            Avatar URL
            <input
              className="vendor-inline-input"
              type="text"
              name="avatarUrl"
              value={profileForm.avatarUrl}
              onChange={handleProfileChange}
              placeholder="https://..."
            />
          </label>
          <label>
            Avatar file
            <input
              className="vendor-inline-input"
              type="file"
              accept="image/*"
              onChange={(event) => {
                setAvatarFile(event.target.files?.[0] ?? null);
                setShouldRemoveAvatar(false);
              }}
            />
          </label>
          <label>
            Remove avatar
            <input
              type="checkbox"
              checked={shouldRemoveAvatar}
              onChange={(event) => {
                const isChecked = event.target.checked;
                setShouldRemoveAvatar(isChecked);

                if (isChecked) {
                  setAvatarFile(null);
                }
              }}
            />
          </label>
          <label>
            Phone
            <input
              className="vendor-inline-input"
              type="text"
              name="phone"
              value={profileForm.phone}
              onChange={handleProfileChange}
            />
          </label>
          <label className="vendor-profile-form__full">
            Shop description
            <textarea
              className="vendor-inline-input"
              rows="3"
              name="shopDescription"
              value={profileForm.shopDescription}
              onChange={handleProfileChange}
            />
          </label>
          <label>
            Shop logo URL
            <input
              className="vendor-inline-input"
              type="text"
              name="shopLogo"
              value={profileForm.shopLogo}
              onChange={handleProfileChange}
              placeholder="https://..."
            />
          </label>
          <label>
            Shop logo file
            <input
              className="vendor-inline-input"
              type="file"
              accept="image/*"
              onChange={(event) => {
                setShopLogoFile(event.target.files?.[0] ?? null);
                setShouldRemoveLogo(false);
              }}
            />
          </label>
          <label>
            Remove logo
            <input
              type="checkbox"
              checked={shouldRemoveLogo}
              onChange={(event) => {
                const isChecked = event.target.checked;
                setShouldRemoveLogo(isChecked);

                if (isChecked) {
                  setShopLogoFile(null);
                }
              }}
            />
          </label>
          <label>
            Shop banner URL
            <input
              className="vendor-inline-input"
              type="text"
              name="shopBanner"
              value={profileForm.shopBanner}
              onChange={handleProfileChange}
              placeholder="https://..."
            />
          </label>
          <label>
            Shop banner file
            <input
              className="vendor-inline-input"
              type="file"
              accept="image/*"
              onChange={(event) => {
                setShopBannerFile(event.target.files?.[0] ?? null);
                setShouldRemoveBanner(false);
              }}
            />
          </label>
          <label>
            Remove banner
            <input
              type="checkbox"
              checked={shouldRemoveBanner}
              onChange={(event) => {
                const isChecked = event.target.checked;
                setShouldRemoveBanner(isChecked);

                if (isChecked) {
                  setShopBannerFile(null);
                }
              }}
            />
          </label>
          <label className="vendor-profile-form__full">
            Address
            <input
              className="vendor-inline-input"
              type="text"
              name="address"
              value={profileForm.address}
              onChange={handleProfileChange}
            />
          </label>
          <label className="vendor-profile-form__full">
            Bio
            <textarea
              className="vendor-inline-input"
              rows="3"
              name="bio"
              value={profileForm.bio}
              onChange={handleProfileChange}
            />
          </label>
          <button
            type="submit"
            className="vendor-inline-btn vendor-profile-form__full"
            disabled={isSavingProfile}
          >
            {isSavingProfile ? "Saving..." : "Save profile"}
          </button>
        </form>
      </section>

      <section className="vendor-metrics-grid" aria-label="Inventory stats">
        <article className="vendor-metric-card">
          <p>Products in shop</p>
          <h3>{stockStats.total}</h3>
        </article>
        <article className="vendor-metric-card">
          <p>In stock</p>
          <h3>{stockStats.inStock}</h3>
        </article>
        <article className="vendor-metric-card">
          <p>Out of stock</p>
          <h3>{stockStats.outOfStock}</h3>
        </article>
      </section>

      <section className="vendor-section-card">
        <div className="vendor-section-card__header">
          <h2>Profile management - inventory control</h2>
          <span>{vendorProducts.length} items</span>
        </div>

        {vendorProducts.length === 0 ? (
          <p className="vendor-panel-empty">
            {isProductsLoading
              ? "Loading data..."
              : "Your shop has no products yet."}
          </p>
        ) : (
          <div className="vendor-table">
            <div className="vendor-table__row vendor-table__row--head">
              <span>Product</span>
              <span>Category</span>
              <span>Current stock</span>
              <span>Set stock</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            {paginatedVendorProducts.map((product) => {
              const productId = String(product?.id ?? "");
              const normalizedStatus = String(product?.status ?? "")
                .trim()
                .toLowerCase()
                .replaceAll("_", "-");
              const isSaving = processingProductId === productId;

              return (
                <div key={productId} className="vendor-table__row">
                  <span>{product.title}</span>
                  <span>{formatProductCategoryLabel(product.category)}</span>
                  <span>{Number(product.stock ?? 0)}</span>
                  <span>
                    <input
                      type="number"
                      min="0"
                      className="vendor-inline-input"
                      value={getDraftStock(product)}
                      onChange={(event) =>
                        setDraftStockById((prev) => ({
                          ...prev,
                          [productId]: event.target.value,
                        }))
                      }
                    />
                  </span>
                  <span>
                    <span
                      className={`vendor-pill vendor-pill--${normalizedStatus}`}
                    >
                      {String(product?.status ?? "unknown")}
                    </span>
                  </span>
                  <span>
                    <button
                      type="button"
                      className="vendor-inline-btn"
                      onClick={() => handleSaveStock(product)}
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {vendorProducts.length > 0 && totalPages > 1 ? (
          <div className="vendor-pagination">
            <button
              type="button"
              className="vendor-pagination-btn"
              onClick={() => setCurrentPage((previous) => previous - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            <span className="vendor-pagination-info">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              className="vendor-pagination-btn"
              onClick={() => setCurrentPage((previous) => previous + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
