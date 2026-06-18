import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  updateCustomerStatus,
  updateVendorStatus,
  USERS_QUERY_SCOPE,
} from "../../api/usersApi";
import { useUsersQuery } from "../../hooks/useUsersQuery";
import "./VendorManager.css";

const statusOptions = ["all", "active", "banned", "rejected"];

function getRoles(user) {
  if (Array.isArray(user?.roles)) {
    return user.roles;
  }

  if (user?.role) {
    return [user.role];
  }

  return [];
}

function resolveAccountRole(user) {
  const roles = getRoles(user);

  if (roles.includes("vendor")) {
    return "vendor";
  }

  return "customer";
}

function normalizeStatusByRole(role, status) {
  const normalizedStatus = String(status ?? "")
    .trim()
    .toLowerCase();

  if (role === "vendor") {
    return normalizedStatus === "rejected" ? "rejected" : "active";
  }

  if (["banned", "suspended", "rejected"].includes(normalizedStatus)) {
    return "banned";
  }

  return "active";
}

function formatStatus(status) {
  switch (status) {
    case "active":
      return "Active";
    case "banned":
      return "Banned";
    case "rejected":
      return "Rejected";
    default:
      return "Unknown";
  }
}

function formatRole(role) {
  return role === "vendor" ? "Vendor" : "Customer";
}

function formatCreatedSince(createdAt) {
  if (!createdAt) {
    return "N/A";
  }

  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-GB");
}

function getCreatedAtTimestamp(createdAt) {
  if (!createdAt) {
    return 0;
  }

  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return date.getTime();
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M5 12.5 9.2 16.7 19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6 6 18 18M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AccountsManager() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading, isError } = useUsersQuery({
    scope: USERS_QUERY_SCOPE.ADMIN,
  });
  const [processingEmail, setProcessingEmail] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [reasonByEmail, setReasonByEmail] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getReasonValue = (account) => {
    const accountEmail = String(account?.email ?? "")
      .trim()
      .toLowerCase();

    if (typeof reasonByEmail[accountEmail] === "string") {
      return reasonByEmail[accountEmail];
    }

    return String(account?.reason ?? "");
  };

  const accounts = useMemo(() => {
    return users
      .filter((user) => {
        const roles = getRoles(user);
        return roles.includes("customer") || roles.includes("vendor");
      })
      .map((user) => {
        const role = resolveAccountRole(user);

        return {
          ...user,
          accountName:
            user?.name ??
            user?.ownerName ??
            user?.shopName ??
            user?.email ??
            "N/A",
          role,
          status: normalizeStatusByRole(role, user?.status),
          reason: user?.reason ?? null,
        };
      })
      .sort(
        (accountA, accountB) =>
          getCreatedAtTimestamp(accountB.createdAt) -
          getCreatedAtTimestamp(accountA.createdAt),
      );
  }, [users]);

  const filteredAccounts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return accounts.filter((account) => {
      if (statusFilter !== "all" && account.status !== statusFilter) {
        return false;
      }

      if (!normalizedKeyword) {
        return true;
      }

      return [account.accountName, account.email, account.role]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedKeyword),
        );
    });
  }, [accounts, keyword, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, keyword]);

  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    return filteredAccounts.slice(startIndex, endIndex);
  }, [filteredAccounts, currentPage, itemsPerPage]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAccounts.length / itemsPerPage),
  );

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function handleUpdateStatus(account, status) {
    const normalizedUserId = String(account?.id ?? "").trim();
    const normalizedEmail = String(account?.email ?? "")
      .trim()
      .toLowerCase();
    const reason = getReasonValue(account).trim();

    if (!normalizedUserId || !normalizedEmail) {
      return;
    }

    if (account.role === "vendor" && status === "rejected" && !reason) {
      window.alert(
        "Vui lòng nhập lý do từ chối tài khoản trước khi tiến hành!",
      );
      return;
    }

    if (account.role === "customer" && status === "banned" && !reason) {
      window.alert("Vui lòng nhập lý do khóa tài khoản trước khi tiến hành!");
      return;
    }

    try {
      setProcessingEmail(normalizedEmail);

      if (account.role === "vendor") {
        await updateVendorStatus({ userId: normalizedUserId, status, reason });
      } else {
        await updateCustomerStatus({
          userId: normalizedUserId,
          status,
          reason,
        });
      }

      if (status === "active") {
        setReasonByEmail((previousState) => ({
          ...previousState,
          [normalizedEmail]: "",
        }));
      }

      await queryClient.invalidateQueries({ queryKey: ["users"] });
    } finally {
      setProcessingEmail("");
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div></div>
        <div className="admin-page__filters">
          <input
            type="text"
            placeholder="Tìm theo tên, email, role"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "All Status" : formatStatus(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="admin-card">
        {isLoading && <p className="admin-status">Đang tải dữ liệu...</p>}
        {isError && (
          <p className="admin-status admin-status--error">
            Không thể tải danh sách tài khoản. Vui lòng thử lại.
          </p>
        )}
        {!isLoading && !isError && (
          <div className="manage-vendor-table manage-vendor-table--accounts">
            <div className="manage-vendor-table__row manage-vendor-table__head">
              <span>STT</span>
              <span>ID</span>
              <span>User Name</span>
              <span>Email</span>
              <span>Role</span>
              <span>Created Since</span>
              <span>Status</span>
              <span>Reason</span>
              <span>Actions</span>
            </div>
            {paginatedAccounts.map((account, index) => {
              const accountEmail = String(account.email ?? "")
                .trim()
                .toLowerCase();
              const isRowUpdating = processingEmail === accountEmail;
              const isActiveAccount = account.status === "active";
              const isRestrictedAccount =
                account.role === "vendor"
                  ? account.status === "rejected"
                  : account.status === "banned";

              return (
                <div
                  className="manage-vendor-table__row"
                  key={account.id ?? account.email}
                >
                  <span>{(currentPage - 1) * itemsPerPage + index + 1}</span>
                  <span>{account.id || "N/A"}</span>
                  <span>{account.accountName}</span>
                  <span>{account.email}</span>
                  <span>{formatRole(account.role)}</span>
                  <span>{formatCreatedSince(account.createdAt)}</span>
                  <span>
                    <span
                      className={`status-pill status-pill--${account.status}`}
                    >
                      {formatStatus(account.status)}
                    </span>
                  </span>
                  <span>
                    <input
                      className="admin-reason-input"
                      type="text"
                      placeholder="Nhập lý do..."
                      value={getReasonValue(account)}
                      disabled={isRowUpdating}
                      onChange={(event) => {
                        setReasonByEmail((previousState) => ({
                          ...previousState,
                          [accountEmail]: event.target.value,
                        }));
                      }}
                    />
                  </span>
                  <span className="admin-actions">
                    <span className="admin-action-control admin-action-buttons">
                      <button
                        type="button"
                        className="admin-action-btn admin-action-btn--primary admin-action-btn--icon"
                        disabled={isRowUpdating || isActiveAccount}
                        aria-label="Approve account"
                        title={
                          isActiveAccount
                            ? "Tài khoản này đang ở trạng thái Active"
                            : "Approve"
                        }
                        onClick={() => handleUpdateStatus(account, "active")}
                      >
                        <CheckIcon />
                      </button>
                      {account.role === "vendor" ? (
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn--muted admin-action-btn--icon"
                          disabled={isRowUpdating || isRestrictedAccount}
                          aria-label="Reject vendor account"
                          title={
                            isRestrictedAccount
                              ? "Tài khoản vendor này đang ở trạng thái Rejected"
                              : "Reject"
                          }
                          onClick={() =>
                            handleUpdateStatus(account, "rejected")
                          }
                        >
                          <XIcon />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn--muted admin-action-btn--icon"
                          disabled={isRowUpdating || isRestrictedAccount}
                          aria-label="Ban customer account"
                          title={
                            isRestrictedAccount
                              ? "Tài khoản customer này đang ở trạng thái Banned"
                              : "Ban"
                          }
                          onClick={() => handleUpdateStatus(account, "banned")}
                        >
                          <XIcon />
                        </button>
                      )}
                      {isRowUpdating && (
                        <span className="admin-action-spinner" />
                      )}
                    </span>
                  </span>
                </div>
              );
            })}
            {paginatedAccounts.length === 0 && filteredAccounts.length > 0 && (
              <p className="admin-status">Không có tài khoản phù hợp.</p>
            )}
            {filteredAccounts.length === 0 && (
              <p className="admin-status">Không có tài khoản phù hợp.</p>
            )}
            <div className="admin-pagination">
              <button
                type="button"
                className="admin-pagination-btn"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="admin-pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="admin-pagination-btn"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
