import { Navigate, Route, Routes } from "react-router-dom";

import Home from "../pages/customer/Home";
import ShopDirectory from "../pages/customer/ShopDirectory";
import ShopStore from "../pages/customer/ShopStore";
import ProductDetail from "../pages/customer/ProductDetail";
import Cart from "../pages/customer/Cart";
import Checkout from "../pages/customer/Checkout";
import PaymentResult from "../pages/customer/PaymentResult";
import Wishlist from "../pages/customer/Wishlist";
import MyOrders from "../pages/customer/MyOrders";
import ProfileSettings from "../pages/account/ProfileSettings";
import About from "../pages/customer/About";
import Support from "../pages/customer/Support";
import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import AdminLayout from "../pages/admin/AdminLayout";
import Dashboard from "../pages/admin/Dashboard";
import AccountsManager from "../pages/admin/AccountsManager";
import ProductManager from "../pages/admin/ProductManager";
import OrdersManager from "../pages/admin/OrdersManager";
import VendorDashboard from "../pages/vendor/VendorDashboard";
import VendorProducts from "../pages/vendor/VendorProducts";
import VendorOnboarding from "../pages/vendor/VendorOnboarding";
import VendorLayout from "../pages/vendor/VendorLayout";
import VendorOrders from "../pages/vendor/VendorOrders";
import VendorProfile from "../pages/vendor/VendorProfile";
import PublicLayout from "../components/PublicLayout";
import PrivateRoute from "./PrivateRoute";
import RoleRoute from "./RoleRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shops" element={<ShopDirectory />} />
        <Route path="/shops/:vendorKey" element={<ShopStore />} />
        <Route path="/about" element={<About />} />
        <Route path="/support" element={<Support />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/checkout" element={<Checkout />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route
        path="/my-orders"
        element={
          <PrivateRoute>
            <RoleRoute role="customer">
              <MyOrders />
            </RoleRoute>
          </PrivateRoute>
        }
      />

      <Route
        path="/payment/result"
        element={
          <PrivateRoute>
            <RoleRoute role="customer">
              <PaymentResult />
            </RoleRoute>
          </PrivateRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <ProfileSettings />
          </PrivateRoute>
        }
      />

      <Route
        path="/vendor/onboarding"
        element={
          <PrivateRoute>
            <RoleRoute role="customer">
              <VendorOnboarding />
            </RoleRoute>
          </PrivateRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <RoleRoute role="admin">
              <AdminLayout />
            </RoleRoute>
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<ProductManager />} />
        <Route path="orders" element={<OrdersManager />} />
        <Route path="accounts" element={<AccountsManager />} />
        <Route
          path="vendors"
          element={<Navigate to="/admin/accounts" replace />}
        />
        <Route
          path="customers"
          element={<Navigate to="/admin/accounts" replace />}
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>

      <Route
        path="/vendor"
        element={
          <PrivateRoute>
            <RoleRoute role="vendor">
              <VendorLayout />
            </RoleRoute>
          </PrivateRoute>
        }
      >
        <Route index element={<VendorDashboard />} />
        <Route path="customers" element={<Navigate to="/vendor" replace />} />
        <Route path="users" element={<Navigate to="/vendor" replace />} />
        <Route path="products" element={<VendorProducts />} />
        <Route path="orders" element={<VendorOrders />} />
        <Route path="profile" element={<VendorProfile />} />
      </Route>

      <Route
        path="/vendor/dashboard"
        element={<Navigate to="/vendor" replace />}
      />
    </Routes>
  );
}
