import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PRODUCT_STATUS } from "../../constants/productStatus";
import { formatCurrency } from "../../utils/formatters";
import { notifyError, notifySuccess } from "../../utils/notify";
import {
  createVendorProduct,
  deleteProductById,
  updateProductById,
} from "../../services/productService";
import { useAuth } from "../hooks/useAuth";
import { useVendorProductsQuery } from "../hooks/useVendorProductsQuery";
import "../styles/clean-management.css";

const initialForm = {
  title: "",
  category: "electronics",
  description: "",
  price: "",
  oldPrice: "",
  stock: "",
  thumbnail: "",
};

export default function VendorProductsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: vendorProducts = [] } = useVendorProductsQuery(user?.id);
  const [form, setForm] = useState(initialForm);

  const createMutation = useMutation({
    mutationFn: async () =>
      createVendorProduct(user, {
        ...form,
        price: Number(form.price || 0),
        oldPrice: Number(form.oldPrice || 0),
        stock: Number(form.stock || 0),
      }),
    onSuccess: async () => {
      setForm(initialForm);
      await queryClient.invalidateQueries({ queryKey: ["clean-products"] });
      notifySuccess("Đã tạo sản phẩm mới ở trạng thái draft.");
    },
    onError: (error) =>
      notifyError(error?.message || "Không thể tạo sản phẩm."),
  });

  const statusMutation = useMutation({
    mutationFn: ({ productId, nextStatus }) =>
      updateProductById(productId, { status: nextStatus }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clean-products"] });
      await queryClient.invalidateQueries({
        queryKey: ["clean-products", "vendor", user?.id],
      });
      notifySuccess("Đã cập nhật trạng thái sản phẩm.");
    },
    onError: (error) =>
      notifyError(error?.message || "Không thể cập nhật sản phẩm."),
  });

  const deleteMutation = useMutation({
    mutationFn: (productId) => deleteProductById(productId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clean-products"] });
      notifySuccess("Đã xóa sản phẩm.");
    },
    onError: (error) =>
      notifyError(error?.message || "Không thể xóa sản phẩm."),
  });

  return (
    <section className="clean-container clean-page">
      <div className="clean-page__header">
        <h1>Vendor Products</h1>
        <p className="clean-page__lead">
          Vendor chỉ thao tác trên sản phẩm của mình qua service layer sạch,
          không sửa snapshot thô trong UI.
        </p>
      </div>

      <div className="clean-management-grid">
        <form
          className="clean-panel clean-form"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <h2>Create product</h2>
          <label>
            Title
            <input
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
            />
          </label>
          <div className="clean-form__grid">
            <label>
              Category
              <select
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
              >
                <option value="electronics">Electronics</option>
                <option value="home">Home</option>
                <option value="fashion">Fashion</option>
                <option value="others">Others</option>
              </select>
            </label>
            <label>
              Thumbnail URL
              <input
                value={form.thumbnail}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    thumbnail: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />
          </label>
          <div className="clean-form__grid">
            <label>
              Price
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, price: event.target.value }))
                }
              />
            </label>
            <label>
              Old price
              <input
                type="number"
                min="0"
                value={form.oldPrice}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, oldPrice: event.target.value }))
                }
              />
            </label>
          </div>
          <label>
            Stock
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, stock: event.target.value }))
              }
            />
          </label>
          <button
            type="submit"
            className="clean-button"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create product"}
          </button>
        </form>

        <div className="clean-panel clean-stack">
          <div className="clean-toolbar">
            <h2>Your products</h2>
            <span className="clean-badge">{vendorProducts.length} items</span>
          </div>
          <table className="clean-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Status</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendorProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="clean-stack">
                      <strong>{product.title}</strong>
                      <small className="clean-muted clean-code">
                        {product.id}
                      </small>
                    </div>
                  </td>
                  <td>
                    <span className="clean-badge">{product.status}</span>
                  </td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>{product.stock}</td>
                  <td>
                    <div className="clean-actions">
                      {product.status !== PRODUCT_STATUS.PENDING ? (
                        <button
                          type="button"
                          className="clean-button clean-button--ghost"
                          onClick={() =>
                            statusMutation.mutate({
                              productId: product.id,
                              nextStatus: PRODUCT_STATUS.PENDING,
                            })
                          }
                        >
                          Submit
                        </button>
                      ) : null}
                      {product.status !== PRODUCT_STATUS.DRAFT ? (
                        <button
                          type="button"
                          className="clean-button clean-button--ghost"
                          onClick={() =>
                            statusMutation.mutate({
                              productId: product.id,
                              nextStatus: PRODUCT_STATUS.DRAFT,
                            })
                          }
                        >
                          Draft
                        </button>
                      ) : null}
                      {product.status !== PRODUCT_STATUS.INACTIVE ? (
                        <button
                          type="button"
                          className="clean-button clean-button--ghost"
                          onClick={() =>
                            statusMutation.mutate({
                              productId: product.id,
                              nextStatus: PRODUCT_STATUS.INACTIVE,
                            })
                          }
                        >
                          Hide
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="clean-button clean-button--ghost"
                        onClick={() => deleteMutation.mutate(product.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
