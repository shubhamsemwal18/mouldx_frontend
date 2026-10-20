import { apiClient, type ApiResponse } from "@/app/lib/api";
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
    return apiClient
      .post<ApiResponse<AuthPayload>>("/auth/signup/verify-otp", payload, { skipAuthRefresh: true })
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
    return apiClient
      .post<ApiResponse<AuthPayload>>("/auth/login/verify-otp", payload, { skipAuthRefresh: true })
      .then((response) => response.data.data);
  },

  loginWithPassword(payload: { identifier: string; password: string }) {
    return apiClient
      .post<ApiResponse<AuthPayload>>("/auth/login/password", payload, { skipAuthRefresh: true })
      .then((response) => response.data.data);
  },

  refreshSession() {
    return apiClient
      .post<ApiResponse<AuthPayload>>("/auth/refresh-token", {}, { skipAuthRefresh: true })
      .then((response) => response.data.data);
  },

  me() {
    return apiClient.get<ApiResponse<Omit<AuthPayload, "tokens">>>("/user/profile").then((response) => response.data.data);
  },

  logout() {
    return apiClient.post<ApiResponse<Record<string, never>>>("/auth/logout", {});
  },
};
