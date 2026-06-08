import { useContext } from "react";

import AuthSessionContext from "../../providers/auth-context";

export function useAuth() {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
