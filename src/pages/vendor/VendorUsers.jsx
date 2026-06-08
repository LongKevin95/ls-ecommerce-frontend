import { useMemo } from "react";

import { useAdminProductsQuery } from "../../hooks/useAdminProductsQuery";
import { useAuth } from "../../hooks/useAuth";
import { useOrdersQuery } from "../../hooks/useOrdersQuery";
import { useUsersQuery } from "../../hooks/useUsersQuery";
import {
  extractVendorOrderItems,
  isOrderOfVendor,
  isProductOwnedByVendor,
  resolveOrderCustomer,
  resolveOrderDate,
  resolveVendorSubtotal,
} from "./vendorDataUtils";
import "./VendorDashboard.css";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-GB");
}

function normalizeUserStatus(status) {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();

  if (["banned", "suspended", "rejected"].includes(normalized)) {
    return "banned";
  }

  return "active";
}

function normalizeRole(role) {
  return String(role ?? "")
    .trim()
    .toLowerCase();
}

export default function VendorUsers() {
  const { user } = useAuth();
  const { data: users = [], isLoading: isUsersLoading } = useUsersQuery();
  const { data: products = [], isLoading: isProductsLoading } =
    useAdminProductsQuery();
  const { data: orders = [], isLoading: isOrdersLoading } = useOrdersQuery();

  const vendorEmail = String(user?.email ?? "")
    .trim()
    .toLowerCase();
  const vendorId = String(user?.id ?? "").trim();

  const vendorProducts = useMemo(() => {
    return products.filter((product) =>
      isProductOwnedByVendor(product, vendorEmail, vendorId),
    );
  }, [products, vendorEmail, vendorId]);

  const vendorProductIds = useMemo(
    () =>
      new Set(
        vendorProducts.map((product) => String(product?.id ?? "").trim()),
      ),
    [vendorProducts],
  );

  const vendorOrders = useMemo(() => {
    return orders
      .filter((order) =>
        isOrderOfVendor({
          order,
          vendorEmail,
          vendorProductIds,
        }),
      )
      .map((order) => {
        const items = extractVendorOrderItems(
          order,
          vendorEmail,
          vendorProductIds,
        );

        return {
          ...order,
          items,
          customer: resolveOrderCustomer(order),
          date: resolveOrderDate(order),
          total: resolveVendorSubtotal(items),
        };
      });
  }, [orders, vendorEmail, vendorProductIds]);

  const customerStatsMap = useMemo(() => {
    const map = new Map();

    vendorOrders.forEach((order) => {
      const customer = order.customer;
      const customerName = String(customer?.name ?? "N/A").trim() || "N/A";
      const customerEmail = String(customer?.email ?? "")
        .trim()
        .toLowerCase();
      const customerPhone = String(customer?.phone ?? "N/A").trim() || "N/A";
      const hasEmail = Boolean(customerEmail && customerEmail !== "n/a");
      const normalizedName = customerName.toLowerCase();
      const normalizedPhone = customerPhone.toLowerCase();
      const customerKey = hasEmail
        ? `email:${customerEmail}`
        : `name:${normalizedName}|phone:${normalizedPhone}`;

      if (!hasEmail && normalizedName === "n/a" && normalizedPhone === "n/a") {
        return;
      }

      const previous = map.get(customerKey) ?? {
        email: hasEmail ? customerEmail : "N/A",
        name: customerName,
        phone: customerPhone,
        orderCount: 0,
        fulfilledOrderCount: 0,
        totalSpent: 0,
        lastOrderDate: null,
      };
      const isCompleted =
        String(order?.status ?? "")
          .trim()
          .toLowerCase() === "completed";

      const nextLastDate =
        !previous.lastOrderDate ||
        new Date(order.date).getTime() >
          new Date(previous.lastOrderDate).getTime()
          ? order.date
          : previous.lastOrderDate;

      map.set(customerKey, {
        ...previous,
        email: hasEmail ? customerEmail : previous.email,
        name: previous.name === "N/A" ? customerName : previous.name,
        phone: previous.phone === "N/A" ? customerPhone : previous.phone,
        orderCount: previous.orderCount + 1,
        fulfilledOrderCount:
          previous.fulfilledOrderCount + (isCompleted ? 1 : 0),
        totalSpent:
          previous.totalSpent + (isCompleted ? Number(order.total ?? 0) : 0),
        lastOrderDate: nextLastDate,
      });
    });

    return map;
  }, [vendorOrders]);

  const rows = useMemo(() => {
    const orderStatsByEmail = new Map(
      Array.from(customerStatsMap.values())
        .filter((item) => item.email && item.email !== "N/A")
        .map((item) => [item.email, item]),
    );

    const customersFromUsers = users
      .map((item) => {
        const roles = Array.isArray(item?.roles)
          ? item.roles
          : item?.role
            ? [item.role]
            : [];

        const normalizedRoles = roles.map(normalizeRole).filter(Boolean);

        return {
          name: item?.name ?? "N/A",
          email: String(item?.email ?? "")
            .trim()
            .toLowerCase(),
          roles: normalizedRoles,
          status: normalizeUserStatus(item?.status),
        };
      })
      .filter((item) => item.roles.includes("customer") && item.email);

    const userRows = customersFromUsers.map((customer) => {
      const stat = orderStatsByEmail.get(customer.email);

      return {
        ...customer,
        orderCount: stat?.orderCount ?? 0,
        fulfilledOrderCount: stat?.fulfilledOrderCount ?? 0,
        totalSpent: stat?.totalSpent ?? 0,
        lastOrderDate: stat?.lastOrderDate ?? null,
      };
    });

    const customerRowsWithOrders = userRows
      .filter((item) => Number(item.orderCount ?? 0) > 0)
      .sort((a, b) => {
        const orderCountDiff = b.orderCount - a.orderCount;

        if (orderCountDiff !== 0) {
          return orderCountDiff;
        }

        return a.name.localeCompare(b.name);
      });

    if (customerRowsWithOrders.length > 0) {
      return customerRowsWithOrders;
    }

    return Array.from(customerStatsMap.values()).map((item) => ({
      ...item,
      status: "active",
    }));
  }, [customerStatsMap, users]);

  return (
    <section className="vendor-section-card">
      <div className="vendor-section-card__header">
        <h2>Customer management</h2>
        <span>{rows.length} customers</span>
      </div>

      {rows.length === 0 ? (
        <p className="vendor-panel-empty">
          {isUsersLoading || isProductsLoading || isOrdersLoading
            ? "Loading data..."
            : "No customers with orders yet."}
        </p>
      ) : (
        <div className="vendor-table">
          <div className="vendor-table__row vendor-table__row--head vendor-table__row--customers">
            <span>Customer</span>
            <span>Email</span>
            <span>Orders</span>
            <span>Fulfilled Orders</span>
            <span>Total spent</span>
            <span>Last order</span>
            <span>Status</span>
          </div>

          {rows.map((item, index) => (
            <div
              key={`${item.email}-${index}`}
              className="vendor-table__row vendor-table__row--customers"
            >
              <span>{item.name}</span>
              <span>{item.email}</span>
              <span>{item.orderCount}</span>
              <span>{item.fulfilledOrderCount ?? 0}</span>
              <span>{currency.format(item.totalSpent)}</span>
              <span>{formatDate(item.lastOrderDate)}</span>
              <span>
                <span className={`vendor-pill vendor-pill--${item.status}`}>
                  {item.status}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
