import { apiClient, type ApiResponse } from "@/app/lib/api";
import type { Pagination } from "@/app/lib/product-api";

export interface PublishedCategory {
  _id: string;
  title: string;
  description?: string;
  slug: string;
}

/**
 * Published categories, used to populate the listing form's category pickers.
 * The public endpoint returns root categories, or the children of `parentSlug`.
 */
export const categoryApi = {
  listPublished(params?: { parentSlug?: string; showAll?: boolean; search?: string; page?: number; limit?: number }) {
    return apiClient
      .get<ApiResponse<{ categories: PublishedCategory[]; pagination: Pagination }>>(
        "/categories/published",
        { params, skipAuthRefresh: true }
      )
      .then((response) => response.data.data);
  },
};
