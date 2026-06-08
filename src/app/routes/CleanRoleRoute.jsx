import { Navigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

export default function CleanRoleRoute({ children, allow = [] }) {
  const { user } = useAuth();
  const allowList = Array.isArray(allow) ? allow : [allow];
  const hasAccess = allowList.some((role) => user?.roles?.includes(role));

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return children;
}
