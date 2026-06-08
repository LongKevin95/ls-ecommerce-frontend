import { normalizeUser } from "../adapters/userAdapter";
import apiClient, { extractApiPayload } from "../api/apiClient";

export async function getUsers() {
  const response = await apiClient.get("/users");
  const payload = extractApiPayload(response);
  return Array.isArray(payload) ? payload.map(normalizeUser) : [];
}

export async function getUserById(userId) {
  const normalizedUserId = String(userId ?? "").trim();

  if (!normalizedUserId) {
    return null;
  }

  const response = await apiClient.get(`/users/${normalizedUserId}`);
  return normalizeUser(extractApiPayload(response));
}
