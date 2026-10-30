import axios from "axios";
import { apiClient, type ApiResponse } from "@/app/lib/api";
import type { AdminNotification } from "@/app/lib/admin-notification-api";
import type {
  Category,
  OwnerProfileVerification,
  Product,
  ProductDetail,
  ProductAvailability,
  ProductStatus,
  ProfileVerificationStatus,
} from "@/app/lib/types";
import type { Pagination, ProductListResponse } from "@/app/lib/product-api";

export interface AdminProductListParams {
  status?: ProductStatus;
  availability?: ProductAvailability;
  search?: string;
  ownerId?: string;
  submittedFrom?: string;
  submittedTo?: string;
  page?: number;
  limit?: number;
}

export type { Pagination };

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

/* ---------------- Dashboard ---------------- */

export type DashboardPeriod = "week" | "month" | "year";

export interface DashboardStat {
  key: "newUsers" | "approvedUsers" | "listingsApproved" | "bookingsConfirmed";
  label: string;
  value: number;
  previous: number;
  /** Percent change vs the same span of the previous period; null when it grew from zero. */
  change: number | null;
}

export interface PendingQueue {
  key: "kyc" | "listings" | "bookings";
  label: string;
  count: number;
  oldestAt: string | null;
  href: string;
}

export interface TrendSeries {
  labels: string[];
  values: number[];
  baseline: number;
  current: number;
  change: number | null;
}

export interface TopHost {
  hostId: string;
  name: string;
  hostName: string;
  listings: number;
  bookings: number;
  revenue: number;
  lastBookingAt: string;
}

export interface AdminDashboard {
  period: { key: DashboardPeriod; start: string; end: string; today: string; timezone: string };
  stats: DashboardStat[];
  pending: PendingQueue[];
  charts: { activeListings: TrendSeries; activeUsers: TrendSeries };
  topHosts: TopHost[];
  recentActivity: AdminNotification[];
}

export type PendingCounts = Record<PendingQueue["key"], number>;

/* ---------------- Users ---------------- */

export interface AdminUserRow {
  _id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  approvedRoles: string[];
  isBlocked: boolean;
  isHost: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  firmName: string | null;
  kycApprovedAt: string | null;
  counts: {
    listings: number;
    liveListings: number;
    bookings: number;
    confirmedBookings: number;
    hostBookings: number;
    confirmedHostBookings: number;
  };
}

export interface AdminUserDetail {
  user: AdminUserRow;
  profileVerification: OwnerProfileVerification | null;
  listings: { _id: string; code: string; name: string; status: ProductStatus; availability?: ProductAvailability;
    publishedAt?: string | null; createdAt: string; pricing?: { perDayCharges?: number } }[];
  bookings: { _id: string; code: string; status: "pending" | "approved" | "rejected"; role: "customer" | "host";
    startDate: string; endDate: string; total: number | null; product: { name?: string; code?: string }; createdAt: string }[];
  ratings: { asHost: { average: number; count: number }; asCustomer: { average: number; count: number } };
  reviewsReceived: { _id: string; rating: number; comment: string; createdAt: string; booking: string }[];
}

/* ---------------- Reviews ---------------- */

export interface AdminReviewMedia {
  kind: "image" | "video";
  mimeType?: string;
  url: string;
}

export interface AdminReview {
  _id: string;
  type: "product" | "customer";
  reviewerRole: "customer" | "host";
  rating: number;
  comment: string;
  createdAt: string;
  reply: { comment: string; createdAt?: string; updatedAt?: string } | null;
  reviewer: { _id: string; name: string; firmName: string | null; phone?: string; email?: string };
  subject: { kind: "product" | "customer"; name?: string; code?: string };
  host: { _id: string; name?: string };
  customer: { _id: string; name?: string };
  booking: { _id: string; code: string; startDate: string; endDate: string } | null;
  product: {
    _id: string; name: string; code: string; slug?: string; imageUrl: string | null;
    category?: string | null; media?: AdminReviewMedia[];
    moulds?: { name?: string; type?: string; media: AdminReviewMedia[] }[];
  } | null;
}

export interface AdminReviewStats {
  total: number;
  product: number;
  customer: number;
  average: number;
}

export interface AdminListingRow extends Product {
  bookingCount?: number;
  rating?: { average: number; count: number };
}

/** Saves an authenticated CSV response; surfaces the API's JSON error message on failure. */
async function downloadCsv(path: string, params: Record<string, string>, filename: string) {
  try {
    const response = await apiClient.get<Blob>(path, { params, responseType: "blob", timeout: 120000 });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      const text = await error.response.data.text().catch(() => "");
      let message = "";
      try {
        const body = JSON.parse(text) as { message?: string; details?: { message: string }[] };
        message = body.details?.[0]?.message || body.message || "";
      } catch {
        /* Non-JSON error body. */
      }
      throw new Error(message || "Could not download the CSV file");
    }
    throw error;
  }
}

export const adminApi = {
  getDashboard(period: DashboardPeriod) {
    return apiClient
      .get<ApiResponse<AdminDashboard>>("/admin/dashboard", { params: { period } })
      .then((response) => response.data.data);
  },

  getPendingCounts() {
    return apiClient
      .get<ApiResponse<{ counts: PendingCounts }>>("/admin/dashboard/pending-counts")
      .then((response) => response.data.data.counts);
  },

  downloadDashboardCsv(from: string, to: string) {
    return downloadCsv("/admin/dashboard/export", { from, to }, `mouldx-overview_${from}_to_${to}.csv`);
  },

  downloadKycCsv(from: string, to: string, status: "all" | "approved" | "rejected") {
    return downloadCsv("/admin/profile-verifications/export", { from, to, status }, `mouldx-kyc-${status}_${from}_to_${to}.csv`);
  },

  listUsers(params: { search?: string; page?: number; limit?: number }) {
    return apiClient
      .get<ApiResponse<{ users: AdminUserRow[]; pagination: AdminKycPagination; stats: { total: number; hosts: number } }>>(
        "/admin/users", { params })
      .then((response) => response.data.data);
  },

  getUser(id: string) {
    return apiClient
      .get<ApiResponse<AdminUserDetail>>(`/admin/users/${id}`)
      .then((response) => response.data.data);
  },

  downloadUsersCsv(from: string, to: string) {
    return downloadCsv("/admin/users/export", { from, to }, `mouldx-users_${from}_to_${to}.csv`);
  },

  listReviews(params: { search?: string; type?: "product" | "customer"; rating?: number; page?: number; limit?: number }) {
    return apiClient
      .get<ApiResponse<{ reviews: AdminReview[]; pagination: AdminKycPagination; stats: AdminReviewStats }>>(
        "/admin/reviews", { params })
      .then((response) => response.data.data);
  },

  getReview(id: string) {
    return apiClient
      .get<ApiResponse<{ review: AdminReview }>>(`/admin/reviews/${id}`)
      .then((response) => response.data.data.review);
  },

  deleteReview(id: string) {
    return apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/admin/reviews/${id}`);
  },

  deleteProduct(id: string) {
    return apiClient.delete<ApiResponse<{ deleted: boolean; code: string }>>(`/admin/products/${id}`);
  },


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

  /* ---------------- Listings ---------------- */

  listProducts(params?: AdminProductListParams) {
    return apiClient
      .get<ApiResponse<ProductListResponse>>("/admin/products", { params })
      .then((response) => response.data.data);
  },

  getProduct(id: string) {
    return apiClient
      .get<ApiResponse<ProductDetail>>(`/admin/products/${id}`)
      .then((response) => response.data.data);
  },

  reviewProduct(id: string, payload: { status: "approved" | "rejected"; reason?: string; revisionId?: string }) {
    return apiClient
      .patch<ApiResponse<ProductDetail>>(`/admin/products/${id}/review`, payload)
      .then((response) => response.data.data);
  },

  updateProductAvailability(id: string, availability: ProductAvailability) {
    return apiClient
      .patch<ApiResponse<ProductDetail>>(`/admin/products/${id}/availability`, { availability })
      .then((response) => response.data.data);
  },
};
