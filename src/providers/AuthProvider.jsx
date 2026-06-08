import { useCallback, useMemo, useState } from "react";

import {
  loginWithCredentials,
  registerUser,
  updateUserProfile,
} from "../services/authService";
import { USER_ROLES } from "../constants/roles";
import {
  clearAuthSession,
  readAuthSession,
  writeAuthSession,
} from "../utils/authStorage";
import AuthSessionContext from "./auth-context";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readAuthSession());

  const login = useCallback(async (credentials) => {
    const nextSession = await loginWithCredentials(credentials);
    setSession(nextSession);
    writeAuthSession(nextSession);
    return nextSession.user;
  }, []);

  const signup = useCallback(async (payload) => {
    const nextSession = await registerUser(payload);
    setSession(nextSession);
    writeAuthSession(nextSession);
    return nextSession.user;
  }, []);

  const updateProfile = useCallback(
    async (updates) => {
      if (!session?.user?.id) {
        throw new Error("Bạn cần đăng nhập trước khi cập nhật profile.");
      }

      const nextUser = await updateUserProfile(session.user.id, updates);
      const nextSession = {
        ...session,
        user: nextUser,
      };

      setSession(nextSession);
      writeAuthSession(nextSession);
      return nextUser;
    },
    [session],
  );

  const logout = useCallback(() => {
    clearAuthSession();
    setSession(null);
  }, []);

  const user = session?.user ?? null;

  const value = useMemo(
    () => ({
      accessToken: session?.accessToken ?? "",
      user,
      isAuthenticated: Boolean(session?.accessToken && user),
      isCustomer: user?.roles?.includes(USER_ROLES.CUSTOMER) ?? false,
      isVendor: user?.roles?.includes(USER_ROLES.VENDOR) ?? false,
      isAdmin: user?.roles?.includes(USER_ROLES.ADMIN) ?? false,
      login,
      signup,
      updateProfile,
      logout,
    }),
    [login, logout, session?.accessToken, signup, updateProfile, user],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}
