import { apiClient, type ApiResponse } from "./api";
import type { RatingSummary } from "./review-api";
export interface DashboardBooking { _id: string; code: string; startDate: string; endDate: string;
  product: { name: string; code: string; slug?: string; imageUrl?: string } }
export interface HostDashboard {
  today: string;
  earnings: { currency: "INR"; total: number; confirmedBookings: number };
  utilization: { total: number; rented: number; available: number; maintenance: number; percentage: number };
  rating: RatingSummary;
  endingSoon: DashboardBooking[];
  upcoming: DashboardBooking[];
}
export const hostApi = {
  dashboard(signal?: AbortSignal) { return apiClient.get<ApiResponse<HostDashboard>>("/owner/dashboard", { signal }).then((r) => r.data.data); },
};
