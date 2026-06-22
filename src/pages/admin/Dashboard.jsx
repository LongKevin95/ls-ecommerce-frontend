import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { updateFlashSaleState } from "../../api/flashSaleApi";
import { USERS_QUERY_SCOPE } from "../../api/usersApi";
import { useAdminProductsQuery } from "../../hooks/useAdminProductsQuery";
import { useFlashSaleQuery } from "../../hooks/useFlashSaleQuery";
import { useOrdersQuery } from "../../hooks/useOrdersQuery";
import { useUsersQuery } from "../../hooks/useUsersQuery";
import "./Dashboard.css";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function createEmptyVendorStats(vendorEmail, vendorName = "Vendor") {
  return {
    vendorEmail,
    vendorName,
    totalProducts: 0,
    inStockProducts: 0,
    totalStockUnits: 0,
    totalSoldUnits: 0,
    totalAddedUnits: 0,
    revenue: 0,
  };
}

function formatDateTimeLocal(value) {
  const timestamp = Date.parse(String(value ?? "").trim());

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: users = [] } = useUsersQuery({
    scope: USERS_QUERY_SCOPE.ADMIN,
  });
  const { data: products = [] } = useAdminProductsQuery();
  const { data: orders = [] } = useOrdersQuery();
  const { data: flashSaleState } = useFlashSaleQuery();
  const [selectedVendorEmail, setSelectedVendorEmail] = useState("");
  const [flashSaleForm, setFlashSaleForm] = useState({
    startsAt: "",
    endsAt: "",
  });
  const [isSavingFlashSale, setIsSavingFlashSale] = useState(false);
  const isCampaignWindowOpen = Boolean(
    flashSaleState?.isEnabled &&
      String(flashSaleState?.currentCampaignId ?? "").trim() &&
      Date.parse(String(flashSaleState?.endsAt ?? "").trim()) > Date.now(),
  );

  useEffect(() => {
    setFlashSaleForm({
      startsAt: formatDateTimeLocal(flashSaleState?.startsAt),
      endsAt: formatDateTimeLocal(flashSaleState?.endsAt),
    });
  }, [flashSaleState?.endsAt, flashSaleState?.startsAt]);

  const vendorUsers = useMemo(() => {
    return users.filter((user) => {
      const roles = Array.isArray(user?.roles)
        ? user.roles
        : user?.role
          ? [user.role]
          : [];
      return roles.includes("vendor");
    });
  }, [users]);

  const vendorStats = useMemo(() => {
    const map = new Map();
    const productOwnerById = new Map();

    vendorUsers.forEach((vendor) => {
      const vendorEmail = String(vendor?.email ?? "")
        .trim()
        .toLowerCase();

      if (!vendorEmail) {
        return;
      }

      map.set(
        vendorEmail,
        createEmptyVendorStats(
          vendorEmail,
          vendor?.name ?? vendorEmail.split("@")[0] ?? "Vendor",
        ),
      );
    });

    products.forEach((product) => {
      const vendorEmail = String(product?.vendorEmail ?? "")
        .trim()
        .toLowerCase();

      if (!vendorEmail) {
        return;
      }

      const previous =
        map.get(vendorEmail) ??
        createEmptyVendorStats(
          vendorEmail,
          product?.shopName || vendorEmail.split("@")[0] || "Marketplace Store",
        );

      const stock = Number(product?.stock ?? 0);
      const normalizedStock = Number.isFinite(stock) ? Math.max(0, stock) : 0;
      const productId = String(product?.id ?? "").trim();

      if (productId) {
        productOwnerById.set(productId, vendorEmail);
      }

      map.set(vendorEmail, {
        ...previous,
        vendorName:
          product?.shopName ||
          previous.vendorName ||
          vendorEmail.split("@")[0] ||
          "Marketplace Store",
        totalProducts: previous.totalProducts + 1,
        inStockProducts: previous.inStockProducts + (normalizedStock > 0 ? 1 : 0),
        totalStockUnits: previous.totalStockUnits + normalizedStock,
      });
    });

    orders.forEach((order) => {
      const normalizedStatus = String(order?.status ?? "")
        .trim()
        .toLowerCase();
      const isCompletedOrder = ["completed", "delivered", "delivery"].includes(
        normalizedStatus,
      );
      const items = Array.isArray(order?.items) ? order.items : [];

      items.forEach((item) => {
        const itemVendorEmail = String(item?.vendorEmail ?? "")
          .trim()
          .toLowerCase();
        const productId = String(item?.productId ?? "").trim();
        const vendorEmail = itemVendorEmail || productOwnerById.get(productId) || "";

        if (!vendorEmail) {
          return;
        }

        const previous =
          map.get(vendorEmail) ??
          createEmptyVendorStats(vendorEmail, vendorEmail.split("@")[0] || "Vendor");

        const quantity = Number(item?.quantity ?? 0);
        const price = Number(item?.price ?? 0);
        const normalizedQuantity = Number.isFinite(quantity) ? Math.max(0, quantity) : 0;

        map.set(vendorEmail, {
          ...previous,
          totalSoldUnits: previous.totalSoldUnits + (isCompletedOrder ? normalizedQuantity : 0),
          revenue: previous.revenue + (isCompletedOrder ? normalizedQuantity * price : 0),
        });
      });
    });

    map.forEach((value, key) => {
      map.set(key, {
        ...value,
        totalAddedUnits: value.totalStockUnits + value.totalSoldUnits,
      });
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [orders, products, vendorUsers]);

  const selectedVendorStats = useMemo(() => {
    if (vendorStats.length === 0) {
      return null;
    }

    const fallbackVendor = vendorStats[0];
    const selected = vendorStats.find(
      (item) => item.vendorEmail === selectedVendorEmail,
    );

    return selected ?? fallbackVendor;
  }, [selectedVendorEmail, vendorStats]);

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const totalInStock = products.filter((item) => Number(item?.stock ?? 0) > 0).length;
    const totalRevenue = vendorStats.reduce(
      (sum, item) => sum + Number(item.revenue ?? 0),
      0,
    );

    return {
      vendors: vendorUsers.length,
      totalProducts,
      outOfStock: totalProducts - totalInStock,
      totalRevenue,
    };
  }, [products, vendorStats, vendorUsers.length]);

  const currentCampaignProducts = useMemo(() => {
    if (!isCampaignWindowOpen) {
      return [];
    }

    return [...products]
      .filter(
        (product) =>
          String(product?.flashSaleCampaignId ?? "").trim() ===
            String(flashSaleState.currentCampaignId ?? "").trim() &&
          Number(product?.flashSaleDiscountPercent ?? 0) > 0,
      )
      .sort(
        (firstProduct, secondProduct) =>
          Number(secondProduct?.flashSaleDiscountPercent ?? 0) -
          Number(firstProduct?.flashSaleDiscountPercent ?? 0),
      );
  }, [
        flashSaleState?.currentCampaignId,
        isCampaignWindowOpen,
        products,
  ]);

  const handleFlashSaleFieldChange = (event) => {
    const { name, value } = event.target;

    setFlashSaleForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleOpenFlashSale = async () => {
    if (!flashSaleForm.startsAt || !flashSaleForm.endsAt) {
      window.alert("Please choose both start and end time for the flash sale.");
      return;
    }

    setIsSavingFlashSale(true);

    try {
      await updateFlashSaleState({
        isEnabled: true,
        startsAt: new Date(flashSaleForm.startsAt).toISOString(),
        endsAt: new Date(flashSaleForm.endsAt).toISOString(),
      });

      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["flash-sale"] }),
        queryClient.invalidateQueries({ queryKey: ["products", "admin"] }),
        queryClient.invalidateQueries({ queryKey: ["products", "public"] }),
      ]);
    } catch (error) {
      window.alert(error?.message ?? "Unable to update flash sale campaign.");
    } finally {
      setIsSavingFlashSale(false);
    }
  };

  const handleCloseFlashSale = async () => {
    setIsSavingFlashSale(true);

    try {
      await updateFlashSaleState({ isEnabled: false });

      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["flash-sale"] }),
        queryClient.invalidateQueries({ queryKey: ["products", "admin"] }),
        queryClient.invalidateQueries({ queryKey: ["products", "public"] }),
      ]);
    } catch (error) {
      window.alert(error?.message ?? "Unable to close flash sale campaign.");
    } finally {
      setIsSavingFlashSale(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <section className="admin-dashboard__metrics">
        <article className="admin-dashboard__metric-card">
          <p>Vendor accounts</p>
          <h3>{stats.vendors}</h3>
        </article>
        <article className="admin-dashboard__metric-card">
          <p>Total revenue</p>
          <h3>{currency.format(stats.totalRevenue)}</h3>
        </article>
        <article className="admin-dashboard__metric-card">
          <p>Total products</p>
          <h3>{stats.totalProducts}</h3>
        </article>
        <article className="admin-dashboard__metric-card">
          <p>Out of stock</p>
          <h3>{stats.outOfStock}</h3>
        </article>
      </section>

      <section className="admin-dashboard__flash-sale">
        <div className="admin-dashboard__shops-header">
          <div>
            <h2>Flash sale control</h2>
            <span>
              {flashSaleState?.isActive
                ? "Campaign is live on customer storefront."
                : isCampaignWindowOpen
                  ? "Campaign is open for vendor enrollment."
                  : flashSaleState?.isEnabled
                    ? "Campaign ended. Open a new round to collect new products."
                  : "Campaign is currently closed."}
            </span>
          </div>
        </div>

        <div className="admin-dashboard__flash-sale-grid">
          <label>
            Start time
            <input
              type="datetime-local"
              name="startsAt"
              value={flashSaleForm.startsAt}
              onChange={handleFlashSaleFieldChange}
            />
          </label>

          <label>
            End time
            <input
              type="datetime-local"
              name="endsAt"
              value={flashSaleForm.endsAt}
              onChange={handleFlashSaleFieldChange}
            />
          </label>
        </div>

        <div className="admin-dashboard__flash-sale-actions">
          <button
            type="button"
            onClick={handleOpenFlashSale}
            disabled={isSavingFlashSale}
          >
            {isSavingFlashSale ? "Saving..." : "Open new flash sale"}
          </button>
          <button
            type="button"
            className="admin-dashboard__ghost-button"
            onClick={handleCloseFlashSale}
            disabled={isSavingFlashSale || !flashSaleState?.isEnabled}
          >
            Close flash sale
          </button>
        </div>

        {isCampaignWindowOpen && currentCampaignProducts.length > 0 && (
          <div className="admin-dashboard__flash-products">
            <div className="admin-dashboard__flash-products-header">
              <strong>Products enrolled in current campaign</strong>
              <span>{currentCampaignProducts.length} items</span>
            </div>

            <div className="admin-dashboard__flash-products-table">
              <div className="admin-dashboard__flash-products-row admin-dashboard__flash-products-row--head">
                <span>Product</span>
                <span>Shop</span>
                <span>Regular price</span>
                <span>Flash price</span>
                <span>Discount</span>
              </div>

              {currentCampaignProducts.map((product) => (
                <div
                  className="admin-dashboard__flash-products-row"
                  key={product.id}
                >
                  <span>{product.title}</span>
                  <span>{product.shopName || "Shop"}</span>
                  <span>{currency.format(product.regularPrice ?? product.price ?? 0)}</span>
                  <span>{currency.format(product.displayPrice ?? product.price ?? 0)}</span>
                  <span>-{Number(product.flashSaleDiscountPercent ?? 0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="admin-dashboard__shops">
        <div className="admin-dashboard__shops-header">
          <h2>Vendor overview</h2>
          <span>{vendorStats.length} vendors</span>
        </div>

        {vendorStats.length === 0 ? (
          <p className="admin-panel">No vendor data available.</p>
        ) : (
          <>
            <div className="admin-dashboard__vendor-focus">
              <div className="admin-dashboard__vendor-focus-header">
                <h3>{selectedVendorStats?.vendorName || "Vendor"}</h3>
                <span>{selectedVendorStats?.vendorEmail || "N/A"}</span>
              </div>
              <div className="admin-dashboard__focus-metrics">
                <article className="admin-dashboard__focus-card">
                  <p>Tong san pham da ban</p>
                  <strong>{selectedVendorStats?.totalSoldUnits ?? 0}</strong>
                </article>
                <article className="admin-dashboard__focus-card">
                  <p>So luong ton kho</p>
                  <strong>{selectedVendorStats?.totalStockUnits ?? 0}</strong>
                </article>
                <article className="admin-dashboard__focus-card">
                  <p>Tong hang da them vao shop</p>
                  <strong>{selectedVendorStats?.totalAddedUnits ?? 0}</strong>
                </article>
                <article className="admin-dashboard__focus-card">
                  <p>Tong so tien da ban</p>
                  <strong>{currency.format(selectedVendorStats?.revenue ?? 0)}</strong>
                </article>
              </div>
            </div>

            <div className="admin-dashboard__table">
              <div className="admin-dashboard__row admin-dashboard__row--head">
                <span>Vendor</span>
                <span>Email</span>
                <span>Total products</span>
                <span>Revenue</span>
              </div>

              {vendorStats.map((vendorItem) => {
                const isActive =
                  (selectedVendorStats?.vendorEmail || "") === vendorItem.vendorEmail;

                return (
                  <button
                    key={vendorItem.vendorEmail}
                    type="button"
                    className={`admin-dashboard__row admin-dashboard__row--button ${
                      isActive ? "is-active" : ""
                    }`}
                    onClick={() => setSelectedVendorEmail(vendorItem.vendorEmail)}
                  >
                    <span>{vendorItem.vendorName}</span>
                    <span>{vendorItem.vendorEmail || "N/A"}</span>
                    <span>{vendorItem.totalProducts}</span>
                    <span>{currency.format(vendorItem.revenue)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
