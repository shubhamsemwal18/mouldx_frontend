import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  clearAuthSession,
  getAccessToken,
  notifySessionExpired,
  setAuthSession,
  type AuthSession,
} from "@/app/lib/auth-storage";

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  details?: { path: string; message: string }[];
}

interface RefreshTokenPayload {
  tokens: AuthSession;
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";

const refreshPath = "/auth/refresh-token";

let refreshPromise: Promise<AuthSession> | null = null;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
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

const refreshAuthTokens = async () => {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post<ApiResponse<RefreshTokenPayload>>(refreshPath, {}, { skipAuthRefresh: true })
      .then((response) => {
        const tokens = response.data.data.tokens;
        setAuthSession(tokens);
        return tokens;
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
      const tokens = await refreshAuthTokens();
      setBearerHeader(originalRequest, tokens.accessToken);
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearAuthSession();
      notifySessionExpired();
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
