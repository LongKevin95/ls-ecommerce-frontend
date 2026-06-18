import {
  loginWithCredentials as loginWithCredentialsService,
  registerUser as registerUserService,
  updateUserRole as updateUserRoleService,
  updateUserProfile as updateUserProfileService,
} from "../services/authService";
import { normalizeUser as normalizeUserAdapter } from "../adapters/userAdapter";
import { readAuthSession, writeAuthSession } from "../utils/authStorage";

const DEFAULT_ROLES = ["customer"];

function normalizeUser(user) {
  const normalized = normalizeUserAdapter(user);
  const normalizedStatus = String(
    user?.status ?? normalized?.status ?? "active",
  )
    .trim()
    .toLowerCase();
  const nextStatus = ["banned", "rejected"].includes(normalizedStatus)
    ? normalizedStatus
    : "active";
  const shopName =
    String(user?.shopName ?? normalized?.shop?.name ?? "").trim() ||
    normalized?.name ||
    (normalized?.email ? normalized.email.split("@")[0] : "");

  return {
    ...user,
    ...normalized,
    roles: normalized.roles?.length > 0 ? normalized.roles : DEFAULT_ROLES,
    status: nextStatus,
    reason: nextStatus === "active" ? null : (user?.reason ?? null),
    shopName,
    createdAt: user?.createdAt ?? null,
    updatedAt: user?.updatedAt ?? null,
  };
}

function syncAuthSession(accessToken, user) {
  const nextUser = normalizeUser(user);
  const currentSession = readAuthSession();
  const nextSession = {
    accessToken: String(
      accessToken ?? currentSession?.accessToken ?? "",
    ).trim(),
    user: nextUser,
  };

  if (nextSession.accessToken) {
    writeAuthSession(nextSession);
  }

  return nextUser;
}

export async function registerUser({ name, email, password }) {
  const session = await registerUserService({ name, email, password });
  return syncAuthSession(session?.accessToken, session?.user);
}

export async function loginWithCredentials({ email, password }) {
  const session = await loginWithCredentialsService({ email, password });
  return syncAuthSession(session?.accessToken, session?.user);
}

export async function updateUserRole(email, role, options = {}) {
  const normalizedEmail = String(email ?? "")
    .trim()
    .toLowerCase();
  const normalizedRole = String(role ?? "")
    .trim()
    .toLowerCase();
  const currentUser = readAuthSession()?.user;

  if (
    !normalizedEmail ||
    !currentUser?.email ||
    currentUser.email !== normalizedEmail
  ) {
    throw new Error("Thiếu email tài khoản để cập nhật vai trò.");
  }

  const session = await updateUserRoleService(normalizedRole, options);
  return syncAuthSession(session?.accessToken, session?.user);
}

export async function updateUserProfile(email, updates = {}) {
  const normalizedEmail = String(email ?? "")
    .trim()
    .toLowerCase();
  const currentUser = readAuthSession()?.user;

  if (!normalizedEmail || currentUser?.email !== normalizedEmail) {
    throw new Error("Thiếu email tài khoản để cập nhật profile.");
  }

  const nextUser = await updateUserProfileService(currentUser?.id, updates);
  return syncAuthSession(readAuthSession()?.accessToken, nextUser);
}

export default {
  loginWithCredentials,
  registerUser,
  updateUserRole,
  updateUserProfile,
};
