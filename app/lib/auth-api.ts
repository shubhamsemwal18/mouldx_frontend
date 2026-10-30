import { apiClient, refreshSession, withSessionLock, type ApiResponse } from "@/app/lib/api";
import type { AuthPayload } from "@/app/lib/types";

export interface SignupResponse {
  userId: string;
  devOtp?: string;
}

export interface OtpResponse {
  devOtp?: string;
}

export const authApi = {
  signup(payload: { fullName: string; phone: string; email?: string }) {
    return apiClient
      .post<ApiResponse<SignupResponse>>("/auth/signup", payload, { skipAuthRefresh: true })
      .then((response) => response.data.data);
  },

  resendSignupOtp(phone: string) {
    return apiClient
      .post<ApiResponse<OtpResponse>>("/auth/signup/resend-otp", { phone }, { skipAuthRefresh: true })
      .then((response) => response.data.data);
  },

  verifySignupOtp(payload: { phone: string; otp: string }) {
    return withSessionLock(() => apiClient
      .post<ApiResponse<AuthPayload>>("/auth/signup/verify-otp", payload, { skipAuthRefresh: true }))
      .then((response) => response.data.data);
  },

  requestLoginOtp(identifier: string) {
    return apiClient
      .post<ApiResponse<OtpResponse>>(
        "/auth/login/request-otp",
        { identifier },
        { skipAuthRefresh: true }
      )
      .then((response) => response.data.data);
  },

  verifyLoginOtp(payload: { identifier: string; otp: string }) {
    return withSessionLock(() => apiClient
      .post<ApiResponse<AuthPayload>>("/auth/login/verify-otp", payload, { skipAuthRefresh: true }))
      .then((response) => response.data.data);
  },

  loginWithPassword(payload: { identifier: string; password: string }) {
    return withSessionLock(() => apiClient
      .post<ApiResponse<AuthPayload>>("/auth/login/password", payload, { skipAuthRefresh: true }))
      .then((response) => response.data.data);
  },

  refreshSession() {
    return refreshSession();
  },

  me(signal?: AbortSignal) {
    return apiClient.get<ApiResponse<Omit<AuthPayload, "tokens">>>("/user/profile", { signal }).then((response) => response.data.data);
  },

  logout() {
    return withSessionLock(() => apiClient.post<ApiResponse<Record<string, never>>>("/auth/logout", {}, { skipAuthRefresh: true }));
  },
};
