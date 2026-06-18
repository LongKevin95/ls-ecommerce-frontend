import axios from "axios";
import { readAuthSession } from "../utils/authStorage";

function resolveApiBaseUrl(rawBaseUrl) {
  const normalizedBaseUrl = String(rawBaseUrl ?? "").trim();

  if (!normalizedBaseUrl) {
    return "https://l-s-ecommerce-luongdieulong-thaiduongson.onrender.com";
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
    const nextError = new Error(message);
    nextError.status = Number(error?.response?.status ?? 0);
    nextError.code = error?.code;
    nextError.response = error?.response;

    return Promise.reject(nextError);
  },
);

export default apiClient;

