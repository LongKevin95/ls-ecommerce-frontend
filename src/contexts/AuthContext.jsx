import { useCallback, useMemo, useState } from "react";

import {
  loginWithCredentials,
  registerUser,
  updateUserProfile,
  updateUserRole,
} from "../api/authApi";
import { clearAuthSession, readAuthSession } from "../utils/authStorage";
import AuthContext from "./auth-context";

const AUTH_STORAGE_KEY = "ls-ecommerce-auth-user";
const AUTH_LOGOUT_KEY = "ls-ecommerce-logout";

function readStoredUser() {
  try {
    if (window.sessionStorage.getItem(AUTH_LOGOUT_KEY)) {
      window.sessionStorage.removeItem(AUTH_LOGOUT_KEY);
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    const storedUser = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!storedUser) {
      return readAuthSession()?.user ?? null;
    }

    return JSON.parse(storedUser);
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return readAuthSession()?.user ?? null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const login = useCallback(async (credentials) => {
    const nextUser = await loginWithCredentials(credentials);

    setUser(nextUser);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));

    return nextUser;
  }, []);

  const register = useCallback(async (payload) => {
    const nextUser = await registerUser(payload);

    setUser(nextUser);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));

    return nextUser;
  }, []);

  const updateRole = useCallback(
    async (role) => {
      if (!user?.email) {
        throw new Error("Bạn cần đăng nhập trước khi cập nhật vai trò.");
      }

      const nextUser = await updateUserRole(user.email, role);
      setUser(nextUser);
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));

      return nextUser;
    },
    [user],
  );

  const updateProfile = useCallback(
    async (updates) => {
      if (!user?.email) {
        throw new Error("Bạn cần đăng nhập trước khi cập nhật profile.");
      }

      const nextUser = await updateUserProfile(user.email, updates);
      setUser(nextUser);
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));

      return nextUser;
    },
    [user],
  );

  const logout = useCallback(() => {
    setUser(null);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    clearAuthSession();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isCustomer: user?.roles?.includes("customer"),
      isVendor: user?.roles?.includes("vendor"),
      isAdmin: user?.roles?.includes("admin"),
      login,
      register,
      updateRole,
      updateProfile,
      logout,
    }),
    [login, logout, register, updateProfile, updateRole, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
