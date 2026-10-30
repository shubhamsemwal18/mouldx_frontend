import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  clearAuthSession,
  getAccessToken,
  getAuthSessionVersion,
  notifySessionExpired,
  setAuthSession,
} from "@/app/lib/auth-storage";
import type { AuthPayload } from "@/app/lib/types";

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  details?: { path: string; message: string }[];
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";

const refreshPath = "/auth/refresh-token";

let refreshPromise: Promise<AuthPayload> | null = null;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const setBearerHeader = (config: InternalAxiosRequestConfig, token: string) => {
  const headers = AxiosHeaders.from(config.headers);
  headers.set("Authorization", `Bearer ${token}`);
  config.headers = headers;
};

/** Serialize cookie-changing requests across same-origin tabs when supported. */
export async function withSessionLock<T>(request: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return await navigator.locks.request("mouldx:session-cookie", request);
  }
  return request();
}

export const refreshSession = async () => {
  if (!refreshPromise) {
    const version = getAuthSessionVersion();
    refreshPromise = withSessionLock(() => {
      if (version !== getAuthSessionVersion()) throw new axios.CanceledError("Session changed before refresh");
      return apiClient.post<ApiResponse<AuthPayload>>(refreshPath, {}, { skipAuthRefresh: true });
    })
      .then((response) => {
        if (version !== getAuthSessionVersion()) throw new axios.CanceledError("Session changed during refresh");
        const payload = response.data.data;
        setAuthSession(payload.tokens);
        return payload;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

apiClient.interceptors.request.use((config) => {
  if (config.skipAuthRefresh) {
    return config;
  }

  const accessToken = getAccessToken();
  if (accessToken) {
    setBearerHeader(config, accessToken);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.skipAuthRefresh ||
      originalRequest.url?.includes(refreshPath)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const current = getAccessToken();
      const sent = AxiosHeaders.from(originalRequest.headers).get("Authorization");
      // A late 401 from the previous token need not rotate the cookie again.
      const token = current && sent !== `Bearer ${current}` ? current : (await refreshSession()).tokens.accessToken;
      setBearerHeader(originalRequest, token);
      return apiClient(originalRequest);
    } catch (refreshError) {
      if (axios.isAxiosError(refreshError) && [401, 403].includes(refreshError.response?.status || 0)) {
        clearAuthSession();
        notifySessionExpired();
      }
      return Promise.reject(refreshError);
    }
  }
);

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (axios.isAxiosError<{ message?: string; details?: { message: string }[] }>(error)) {
    return (
      error.response?.data?.details?.[0]?.message ||
      error.response?.data?.message ||
      error.message ||
      fallback
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
  }
}
