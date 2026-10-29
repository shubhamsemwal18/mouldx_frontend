import { apiClient, type ApiResponse } from "./api";
import type { Pagination } from "./product-api";

export interface RatingSummary { count: number; average: number; counts: Record<number, number> }
export interface Review {
  _id: string; type: "product" | "customer"; rating: number; comment: string; authorLabel: string; createdAt: string;
  reply?: { comment: string; createdAt: string; updatedAt: string };
  booking?: { _id: string; code: string; startDate: string; endDate: string };
  product?: { name: string; code: string; slug?: string; imageUrl?: string };
}
export interface ReviewList { reviews: Review[]; summary: RatingSummary; pagination: Pagination }
export interface BookingReviews { productReview: Review | null; customerReview: Review | null; canReviewProduct: boolean; canReviewCustomer: boolean }
export type ReviewScope = "host" | "customer" | "product";
export const reviewApi = {
  booking(id: string, signal?: AbortSignal) {
    return apiClient.get<ApiResponse<BookingReviews>>(`/bookings/${id}/reviews`, { signal }).then((r) => r.data.data);
  },
  create(id: string, body: { type: Review["type"]; rating: number; comment: string }) {
    return apiClient.post<ApiResponse<{ review: Review }>>(`/bookings/${id}/reviews`, body).then((r) => r.data.data.review);
  },
  reply(id: string, comment: string) {
    return apiClient.patch<ApiResponse<{ review: Review }>>(`/owner/reviews/${id}/reply`, { comment }).then((r) => r.data.data.review);
  },
  list(scope: ReviewScope, params: { page?: number; limit?: number; rating?: number }, signal?: AbortSignal, slug?: string) {
    const path = scope === "product" ? `/products/${encodeURIComponent(slug || "")}/reviews` : scope === "host" ? "/owner/reviews" : "/user/reviews";
    return apiClient.get<ApiResponse<ReviewList>>(path, { params, signal, skipAuthRefresh: scope === "product" }).then((r) => r.data.data);
  },
};
export const emptyRating: RatingSummary = { count: 0, average: 0, counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
