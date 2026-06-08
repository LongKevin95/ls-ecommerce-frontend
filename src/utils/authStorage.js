import { readStorageJson, removeStorageValue, writeStorageJson } from "./storage";

const AUTH_STORAGE_KEY = "ls-clean-fe-auth-session";

export function readAuthSession() {
  const session = readStorageJson(AUTH_STORAGE_KEY, null);

  if (!session?.accessToken || !session?.user?.email) {
    return null;
  }

  return session;
}

export function writeAuthSession(session) {
  writeStorageJson(AUTH_STORAGE_KEY, session);
}

export function clearAuthSession() {
  removeStorageValue(AUTH_STORAGE_KEY);
}
