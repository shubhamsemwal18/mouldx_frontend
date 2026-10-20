import { apiClient, type ApiResponse } from "@/app/lib/api";
import type { Pagination } from "@/app/lib/product-api";
import type {
  CatalogueFilterOptions,
  CategorySection,
  MouldType,
  PublicProductCard,
  PublicProductDetail,
} from "@/app/lib/types";

export type CatalogueSort = "recent" | "price_asc" | "price_desc";

export interface CatalogueParams {
  search?: string;
  categorySlug?: string;
  mouldType?: MouldType;
  minPrice?: number;
  maxPrice?: number;
  sort?: CatalogueSort;
  page?: number;
  limit?: number;
}

export interface CatalogueResponse {
  products: PublicProductCard[];
  pagination: Pagination;
  stats: {
    /** Listings matching the current query. */
    matching: number;
    /** Every approved listing on the platform. */
    totalPublished: number;
  };
}

/**
 * Public catalogue. These endpoints need no authentication, so the requests
 * skip the token refresh interceptor — a logged-out visitor must never be
 * bounced to login just for browsing.
 */
export const publicApi = {
  listProducts(params?: CatalogueParams) {
    return apiClient
      .get<ApiResponse<CatalogueResponse>>("/products/published", {
        params,
        skipAuthRefresh: true,
      })
      .then((response) => response.data.data);
  },

  listSections(limit = 10) {
    return apiClient
      .get<ApiResponse<{ sections: CategorySection[] }>>("/products/sections", {
        params: { limit },
        skipAuthRefresh: true,
      })
      .then((response) => response.data.data.sections);
  },

  listFilterOptions() {
    return apiClient
      .get<ApiResponse<CatalogueFilterOptions>>("/products/filters", {
        skipAuthRefresh: true,
      })
      .then((response) => response.data.data);
  },

  /** Accepts the slug (canonical), the MX- code, or the raw id. */
  getProduct(slug: string) {
    return apiClient
      .get<ApiResponse<PublicProductDetail>>(`/products/${encodeURIComponent(slug)}`, {
        skipAuthRefresh: true,
      })
      .then((response) => response.data.data);
  },
};
