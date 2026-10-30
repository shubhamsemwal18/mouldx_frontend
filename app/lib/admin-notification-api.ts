import { apiClient, type ApiResponse } from "./api";
import type { Pagination } from "./product-api";

export interface AdminNotification {
  _id: string;
  category: "registration" | "profile" | "listing" | "booking" | "review" | "support" | "category";
  title: string;
  href: string;
  actorLabel: string;
  tone: "cyan" | "amber";
  readAt: string | null;
  createdAt: string;
}
export interface AdminNotificationList {
  notifications: AdminNotification[];
  unreadCount: number;
  pagination: Pagination;
}

export const adminNotificationApi = {
  list(params: { page?: number; limit?: number; status?: "all" | "unread" } = {}, signal?: AbortSignal) {
    return apiClient.get<ApiResponse<AdminNotificationList>>("/admin/notifications", { params, signal })
      .then(({ data }) => data.data);
  },
  markRead(body: { ids: string[] } | { all: true }) {
    return apiClient.patch<ApiResponse<{ updatedCount: number; unreadCount: number }>>("/admin/notifications/read", body)
      .then(({ data }) => data.data);
  },
  remove(ids: string[]) {
    return apiClient.delete<ApiResponse<{ deletedCount: number; unreadCount: number }>>("/admin/notifications", { data: { ids } })
      .then(({ data }) => data.data);
  },
};

export function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(value));
}
