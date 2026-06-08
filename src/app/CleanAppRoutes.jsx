import { Navigate, Route, Routes } from "react-router-dom";

import { USER_ROLES } from "../constants/roles";
import CleanLayout from "./components/CleanLayout";
import AdminPage from "./pages/AdminPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminProductsPage from "./pages/AdminProductsPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import ProfilePage from "./pages/ProfilePage";
import SignupPage from "./pages/SignupPage";
import VendorPage from "./pages/VendorPage";
import VendorOrdersPage from "./pages/VendorOrdersPage";
import VendorProductsPage from "./pages/VendorProductsPage";
import WishlistPage from "./pages/WishlistPage";
import CleanPrivateRoute from "./routes/CleanPrivateRoute";
import CleanRoleRoute from "./routes/CleanRoleRoute";

export default function CleanAppRoutes() {
  return (
    <Routes>
      <Route element={<CleanLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route
          path="/checkout"
          element={
            <CleanPrivateRoute>
              <CleanRoleRoute allow={[USER_ROLES.CUSTOMER]}>
                <CheckoutPage />
              </CleanRoleRoute>
            </CleanPrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <CleanPrivateRoute>
              <ProfilePage />
            </CleanPrivateRoute>
          }
        />
        <Route
          path="/my-orders"
          element={
            <CleanPrivateRoute>
              <MyOrdersPage />
            </CleanPrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <CleanPrivateRoute>
              <CleanRoleRoute allow={[USER_ROLES.ADMIN]}>
                <AdminPage />
              </CleanRoleRoute>
            </CleanPrivateRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <CleanPrivateRoute>
              <CleanRoleRoute allow={[USER_ROLES.ADMIN]}>
                <AdminProductsPage />
              </CleanRoleRoute>
            </CleanPrivateRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <CleanPrivateRoute>
              <CleanRoleRoute allow={[USER_ROLES.ADMIN]}>
                <AdminOrdersPage />
              </CleanRoleRoute>
            </CleanPrivateRoute>
          }
        />
        <Route
          path="/vendor"
          element={
            <CleanPrivateRoute>
              <CleanRoleRoute allow={[USER_ROLES.VENDOR]}>
                <VendorPage />
              </CleanRoleRoute>
            </CleanPrivateRoute>
          }
        />
        <Route
          path="/vendor/products"
          element={
            <CleanPrivateRoute>
              <CleanRoleRoute allow={[USER_ROLES.VENDOR]}>
                <VendorProductsPage />
              </CleanRoleRoute>
            </CleanPrivateRoute>
          }
        />
        <Route
          path="/vendor/orders"
          element={
            <CleanPrivateRoute>
              <CleanRoleRoute allow={[USER_ROLES.VENDOR]}>
                <VendorOrdersPage />
              </CleanRoleRoute>
            </CleanPrivateRoute>
          }
        />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
