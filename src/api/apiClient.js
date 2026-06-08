import axios from "axios";
import { readAuthSession } from "../utils/authStorage";

function resolveApiBaseUrl(rawBaseUrl) {
  const normalizedBaseUrl = String(rawBaseUrl ?? "").trim();

  if (!normalizedBaseUrl) {
    return "http://localhost:5000";
  }

  const trimmedBaseUrl = normalizedBaseUrl.replace(/\/+$/, "");
  return trimmedBaseUrl.replace(/\/api$/i, "");
}

export function extractApiPayload(response) {
  const responseData = response?.data;

  if (
    responseData &&
    typeof responseData === "object" &&
    !Array.isArray(responseData) &&
    Object.prototype.hasOwnProperty.call(responseData, "data")
  ) {
    return responseData.data;
  }

  return responseData;
}

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers?.common?.["Content-Type"]) {
      delete config.headers.common["Content-Type"];
    }

    if (config.headers?.["Content-Type"]) {
      delete config.headers["Content-Type"];
    }
  }

  const session = readAuthSession();
  const accessToken = String(session?.accessToken ?? "").trim();

  if (accessToken) {
    config.headers = {
      ...(config.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    };
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message || error?.message || "Request failed";

    return Promise.reject(new Error(message));
  },
);

export default apiClient;
