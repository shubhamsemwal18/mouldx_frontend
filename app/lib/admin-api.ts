import { apiClient, type ApiResponse } from "@/app/lib/api";
import type { Category, OwnerProfileVerification, ProfileVerificationStatus } from "@/app/lib/types";

export interface AdminKycListParams {
  search?: string;
  status?: ProfileVerificationStatus;
  page?: number;
  limit?: number;
}

export interface AdminKycPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface AdminKycStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface AdminKycListResponse {
  profileVerifications: OwnerProfileVerification[];
  pagination: AdminKycPagination;
  stats: AdminKycStats;
}

export interface AdminCategoryListParams {
  search?: string;
  status?: "active" | "draft";
  parentId?: string;
  page?: number;
  limit?: number;
}

export interface AdminCategoryPayload {
  title: string;
  description?: string;
  isActive: boolean;
  parentId?: string | null;
}

export interface AdminCategoryStats {
  total: number;
  active: number;
  draft: number;
  root: number;
  subcategories: number;
}

export interface AdminCategoryListResponse {
  categories: Category[];
  pagination: AdminKycPagination;
  stats: AdminCategoryStats;
}

export const adminApi = {
  listCategories(params?: AdminCategoryListParams) {
    return apiClient
      .get<ApiResponse<AdminCategoryListResponse>>("/admin/categories", { params })
      .then((response) => response.data.data);
  },

  createCategory(payload: AdminCategoryPayload) {
    return apiClient
      .post<ApiResponse<{ category: Category }>>("/admin/categories", payload)
      .then((response) => response.data.data.category);
  },

  updateCategory(id: string, payload: AdminCategoryPayload) {
    return apiClient
      .patch<ApiResponse<{ category: Category }>>(`/admin/categories/${id}`, payload)
      .then((response) => response.data.data.category);
  },

  deleteCategory(id: string) {
    return apiClient.delete<ApiResponse<Record<string, never>>>(`/admin/categories/${id}`);
  },

  listProfileVerifications(params?: AdminKycListParams) {
    return apiClient
      .get<ApiResponse<AdminKycListResponse>>("/admin/profile-verifications", { params })
      .then((response) => response.data.data);
  },

  getProfileVerification(id: string) {
    return apiClient
      .get<ApiResponse<{ profileVerification: OwnerProfileVerification }>>(
        `/admin/profile-verifications/${id}`
      )
      .then((response) => response.data.data.profileVerification);
  },

  reviewProfileVerification(id: string, payload: { status: "approved" | "rejected"; reason?: string }) {
    return apiClient
      .patch<ApiResponse<{ profileVerification: OwnerProfileVerification }>>(
        `/admin/profile-verifications/${id}/review`,
        payload
      )
      .then((response) => response.data.data.profileVerification);
  },
};
