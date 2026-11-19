import { apiClient, type ApiResponse } from "@/app/lib/api";
import type { Pagination } from "@/app/lib/product-api";

export const FAQ_CATEGORIES = ["General", "Booking", "Pricing", "Delivery", "Quality"] as const;
export const FAQ_SEARCH_MAX_LENGTH = 160;
export type FaqCategory = (typeof FAQ_CATEGORIES)[number];
export type AdminFaqView = "all" | "home" | "faq-page";

export interface Faq {
  _id: string;
  question: string;
  answer: string;
  category: FaqCategory;
}

export type FaqInput = Omit<Faq, "_id"> & { published: boolean; showOnHome: boolean };
export type AdminFaq = FaqInput & Pick<Faq, "_id">;

export interface FaqPage {
  faqs: Faq[];
  pagination: Pagination;
}

export interface AdminFaqPage {
  faqs: AdminFaq[];
  pagination: Pagination;
  counts: Record<AdminFaqView, number>;
}

export const faqsApi = {
  async list(params: { page: number; search?: string; category?: FaqCategory }, signal: AbortSignal) {
    const { data } = await apiClient.get<ApiResponse<FaqPage>>("/faqs", { params, signal, skipAuthRefresh: true });
    return data.data;
  },

  async home(signal: AbortSignal) {
    const { data } = await apiClient.get<ApiResponse<{ faqs: Faq[] }>>("/faqs/home", { signal, skipAuthRefresh: true });
    return data.data.faqs;
  },
};

const adminPath = "/admin/faqs";

export const faqsAdminApi = {
  async list(params: { page: number; search?: string; view: AdminFaqView }, signal: AbortSignal) {
    const { data } = await apiClient.get<ApiResponse<AdminFaqPage>>(adminPath, { params, signal });
    return data.data;
  },

  async create(input: FaqInput) {
    await apiClient.post(adminPath, input);
  },

  async update(id: string, input: FaqInput) {
    await apiClient.patch(`${adminPath}/${id}`, input);
  },

  async remove(id: string) {
    await apiClient.delete(`${adminPath}/${id}`);
  },
};
