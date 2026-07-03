import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { PRODUCT_STATUS, updateProductById } from "../../api/productApi";
import { useAdminProductsQuery } from "../../hooks/useAdminProductsQuery";
import { formatProductId } from "../../utils/entityId";
import "./ProductManager.css";

function formatStatus(status) {
  switch (
    String(status ?? "")
      .trim()
      .toLowerCase()
  ) {
    case PRODUCT_STATUS.ACTIVE:
      return "Active";
    case PRODUCT_STATUS.DRAFT:
      return "Draft";
    case PRODUCT_STATUS.PENDING:
      return "Pending";
    case PRODUCT_STATUS.INACTIVE:
      return "Inactive";
    case PRODUCT_STATUS.REJECTED:
      return "Rejected";
    case PRODUCT_STATUS.OUT_OF_STOCK:
      return "Out of stock";
    case PRODUCT_STATUS.BANNED:
      return "Rejected";
    default:
      return "Unknown";
  }
}

function getProductCreatedTimestamp(product) {
  const parsedCreatedAt = Date.parse(String(product?.createdAt ?? "").trim());

  if (Number.isFinite(parsedCreatedAt)) {
    return parsedCreatedAt;
  }

  const parsedUpdatedAt = Date.parse(String(product?.updatedAt ?? "").trim());

  if (Number.isFinite(parsedUpdatedAt)) {
    return parsedUpdatedAt;
  }

  return 0;
}

function isProductVisibleInPublicCache(product) {
  const status = String(product?.status ?? "")
    .trim()
    .toLowerCase();

  return [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.OUT_OF_STOCK].includes(status);
}

function upsertProductInList(list, nextProduct) {
  const products = Array.isArray(list) ? list : [];
  const normalizedId = String(nextProduct?.id ?? "").trim();

  if (!normalizedId) {
    return products;
  }

  const existingIndex = products.findIndex(
    (product) => String(product?.id ?? "").trim() === normalizedId,
  );

  if (existingIndex < 0) {
    return [nextProduct, ...products];
  }

  return products.map((product, index) =>
    index === existingIndex ? nextProduct : product,
  );
}

function removeProductFromList(list, productId) {
  const products = Array.isArray(list) ? list : [];
  const normalizedId = String(productId ?? "").trim();

  if (!normalizedId) {
    return products;
  }

  return products.filter(
    (product) => String(product?.id ?? "").trim() !== normalizedId,
  );
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

function BanIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="M8.5 15.5 15.5 8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
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

export default function ProductManager() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading, isError } = useAdminProductsQuery();

  const [statusFilter, setStatusFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [processingId, setProcessingId] = useState("");
  const [reasonByProductId, setReasonByProductId] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getReasonValue = (product) => {
    const productId = String(product?.id ?? "");

    if (typeof reasonByProductId[productId] === "string") {
      return reasonByProductId[productId];
    }

    return String(product?.reason ?? "");
  };

  const filteredProducts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return products
      .filter((product) => {
        const productStatus = String(product?.status ?? "")
          .trim()
          .toLowerCase();

        if (statusFilter !== "all" && productStatus !== statusFilter) {
          return false;
        }

        if (!normalizedKeyword) {
          return true;
        }

        return [
          product?.id,
          formatProductId(product?.id),
          product?.title,
          product?.category,
        ]
          .filter(Boolean)
          .some((item) =>
            String(item).toLowerCase().includes(normalizedKeyword),
          );
      })
      .sort(
        (firstProduct, secondProduct) =>
          getProductCreatedTimestamp(secondProduct) -
          getProductCreatedTimestamp(firstProduct),
      );
  }, [keyword, products, statusFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, keyword]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  function syncProductCaches(nextProduct) {
    const normalizedId = String(nextProduct?.id ?? "").trim();

    if (!normalizedId) {
      return;
    }

    queryClient.setQueryData(["products", "admin"], (previous) =>
      upsertProductInList(previous, nextProduct),
    );
    queryClient.setQueryData(["products", "public"], (previous) => {
      const baseList = removeProductFromList(previous, normalizedId);

      if (!isProductVisibleInPublicCache(nextProduct)) {
        return baseList;
      }

      return upsertProductInList(baseList, nextProduct);
    });
  }

  async function handleAdminAction(product, action) {
    const normalizedId = String(product?.id ?? "").trim();
    const reason = getReasonValue(product).trim();

    if (!normalizedId || !action) {
      return;
    }

    if (action === "reject" && !reason) {
      window.alert("Vui lòng nhập lý do từ chối sản phẩm trước khi tiến hành!");
      return;
    }

    try {
      setProcessingId(normalizedId);
      let updatedProduct = null;

      if (action === "approve") {
        updatedProduct = await updateProductById({
          id: normalizedId,
          updates: {
            status: PRODUCT_STATUS.ACTIVE,
            reason: null,
          },
        });

        setReasonByProductId((previousState) => ({
          ...previousState,
          [normalizedId]: "",
        }));
      }

      if (action === "reject") {
        updatedProduct = await updateProductById({
          id: normalizedId,
          updates: {
            status: PRODUCT_STATUS.REJECTED,
            reason,
          },
        });
      }

      if (updatedProduct) {
        syncProductCaches(updatedProduct);
      }

      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["products", "admin"] }),
        queryClient.invalidateQueries({ queryKey: ["products", "public"] }),
      ]);
    } finally {
      setProcessingId("");
    }
  }

  return (
    <div className="admin-products-page">
      <div className="admin-page__header">
        <div></div>
        <div className="admin-page__filters">
          <input
            type="text"
            placeholder="Tìm theo id, title, category"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All Status</option>
            <option value={PRODUCT_STATUS.ACTIVE}>Active</option>
            <option value={PRODUCT_STATUS.DRAFT}>Draft</option>
            <option value={PRODUCT_STATUS.PENDING}>Pending</option>
            <option value={PRODUCT_STATUS.INACTIVE}>Inactive</option>
            <option value={PRODUCT_STATUS.REJECTED}>Rejected</option>
            <option value={PRODUCT_STATUS.OUT_OF_STOCK}>Out of stock</option>
          </select>
        </div>
      </div>

      <section className="admin-card">
        {isLoading && (
          <p className="admin-status">Đang tải danh sách products...</p>
        )}

        {isError && (
          <p className="admin-status admin-status--error">
            Không thể tải danh sách products. Vui lòng thử lại.
          </p>
        )}

        {!isLoading && !isError && (
          <div className="admin-products-table">
            <div className="admin-products-table__row admin-products-table__head">
              <span>#</span>
              <span>Item</span>
              <span>Shop</span>
              <span>ID</span>
              <span>Price</span>
              <span>Stock</span>
              <span>Status</span>
              <span>Reason</span>
              <span>Action</span>
            </div>
            {paginatedProducts.map((product, index) => {
              const productId = String(product.id ?? "");
              const isProcessing = processingId === productId;
              const statusValue = String(product.status ?? "")
                .trim()
                .toLowerCase();
              const isApproveBlocked = ![
                PRODUCT_STATUS.PENDING,
                PRODUCT_STATUS.REJECTED,
              ].includes(statusValue);
              const isApproveDisabled = isProcessing || isApproveBlocked;
              const isRejectBlocked = statusValue === PRODUCT_STATUS.REJECTED;
              const isRejectDisabled =
                isProcessing ||
                statusValue === PRODUCT_STATUS.INACTIVE ||
                isRejectBlocked;

              return (
                <div className="admin-products-table__row" key={product.id}>
                  <span>{(currentPage - 1) * itemsPerPage + index + 1}</span>
                  <span>
                    <Link to={`/product/${product.id}`} state={{ product }}>
                      {product.title}
                    </Link>
                  </span>
                  <span>
                    {product.shopName ||
                      (product.vendorEmail
                        ? String(product.vendorEmail).split("@")[0]
                        : "Marketplace")}
                  </span>
                  <span title={product.id || "N/A"}>
                    {formatProductId(product.id)}
                  </span>
                  <span>${Number(product.price ?? 0)}</span>
                  <span>{product.stock ?? 0}</span>
                  <span>
                    <span
                      className={`status-pill status-pill--${statusValue.replaceAll("_", "-")}`}
                    >
                      {formatStatus(statusValue)}
                    </span>
                  </span>
                  <span>
                    <input
                      className="admin-reason-input"
                      type="text"
                      placeholder="Nhập lý do..."
                      value={getReasonValue(product)}
                      disabled={
                        isProcessing || statusValue === PRODUCT_STATUS.INACTIVE
                      }
                      onChange={(event) => {
                        setReasonByProductId((previousState) => ({
                          ...previousState,
                          [productId]: event.target.value,
                        }));
                      }}
                    />
                  </span>
                  <span className="admin-actions">
                    <span className="admin-action-control admin-action-buttons">
                      <button
                        type="button"
                        className={`admin-action-btn admin-action-btn--primary admin-action-btn--icon${isApproveBlocked ? " admin-action-btn--blocked" : ""}`}
                        disabled={isApproveDisabled}
                        aria-label={
                          isProcessing
                            ? "Approve action is processing"
                            : isApproveBlocked
                              ? "Approve disabled for current product status"
                              : "Approve product"
                        }
                        title={
                          isProcessing
                            ? "Đang xử lý..."
                            : isApproveBlocked
                              ? "Chỉ có thể duyệt sản phẩm ở trạng thái Pending hoặc Rejected"
                              : "Approve"
                        }
                        onClick={() => handleAdminAction(product, "approve")}
                      >
                        <span className="admin-action-btn__icon admin-action-btn__icon--default">
                          <CheckIcon />
                        </span>
                        <span className="admin-action-btn__icon admin-action-btn__icon--blocked">
                          <BanIcon />
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`admin-action-btn admin-action-btn--danger admin-action-btn--icon${isRejectBlocked ? " admin-action-btn--blocked" : ""}`}
                        disabled={isRejectDisabled}
                        aria-label={
                          isProcessing
                            ? "Reject action is processing"
                            : isRejectBlocked
                              ? "Reject disabled for rejected product"
                              : "Reject product"
                        }
                        title={
                          isProcessing
                            ? "Đang xử lý..."
                            : isRejectBlocked
                              ? "Không thể từ chối sản phẩm đang ở trạng thái Rejected"
                              : "Reject"
                        }
                        onClick={() => handleAdminAction(product, "reject")}
                      >
                        <span className="admin-action-btn__icon admin-action-btn__icon--default">
                          <XIcon />
                        </span>
                        <span className="admin-action-btn__icon admin-action-btn__icon--blocked">
                          <BanIcon />
                        </span>
                      </button>
                      {isProcessing && (
                        <span className="admin-action-spinner" />
                      )}
                    </span>
                  </span>
                </div>
              );
            })}
            {paginatedProducts.length === 0 && filteredProducts.length > 0 && (
              <p className="admin-status">Không có sản phẩm phù hợp.</p>
            )}
            {filteredProducts.length === 0 && (
              <p className="admin-status">Không có sản phẩm phù hợp.</p>
            )}
            {totalPages > 1 && (
              <div className="admin-pagination">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="admin-pagination-btn"
                >
                  Previous
                </button>

                <span className="admin-pagination-info">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="admin-pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
