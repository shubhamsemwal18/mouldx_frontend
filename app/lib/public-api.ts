import { apiClient, type ApiResponse } from "@/app/lib/api";
import type { Pagination } from "@/app/lib/product-api";
import type {
  CatalogueFilterOptions,
  CategorySection,
  MouldType,
  PublicProductCard,
  PublicProductDetail,
} from "@/app/lib/types";

export type CatalogueSort = "recent" | "price_asc" | "price_desc" | "popular";
export interface CatalogueCategory { slug: string; title: string; description: string }
export interface CategorySectionsResponse {
  sections: CategorySection[];
  stats: { totalPublished: number };
}

export interface CatalogueParams {
  search?: string;
  categorySlug?: string;
  subCategorySlug?: string;
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
        headers: { "Cache-Control": "no-cache" },
        skipAuthRefresh: true,
      })
      .then((response) => response.data.data);
  },

  listSections(limit = 10) {
    return apiClient
      .get<ApiResponse<CategorySectionsResponse>>("/products/sections", {
        params: { limit },
        headers: { "Cache-Control": "no-cache" },
        skipAuthRefresh: true,
      })
      .then((response) => response.data.data);
  },

  async listCategories(params: { parentSlug?: string; showAll: boolean }) {
    const categories: CatalogueCategory[] = [];
    let page = 1;
    let hasNextPage = true;
    while (hasNextPage) {
      const response = await apiClient.get<ApiResponse<{ categories: CatalogueCategory[]; pagination: Pagination }>>("/categories/published", {
        params: { ...params, page, limit: 100 }, skipAuthRefresh: true,
      });
      categories.push(...response.data.data.categories);
      hasNextPage = response.data.data.pagination.hasNextPage;
      page += 1;
    }
    return categories;
  },

  recordVisit(slug: string, visitId: string) {
    return apiClient.post(`/products/${encodeURIComponent(slug)}/visit`, { visitId }, { skipAuthRefresh: true });
  },

  listFilterOptions() {
    return apiClient
      .get<ApiResponse<CatalogueFilterOptions>>("/products/filters", {
        skipAuthRefresh: true,
      })
      .then((response) => response.data.data);
  },

  /** Accepts the slug (canonical), the MX- code, or the raw id. */
  getProduct(slug: string, signal?: AbortSignal) {
    return apiClient
      .get<ApiResponse<PublicProductDetail>>(`/products/${encodeURIComponent(slug)}`, {
        headers: { "Cache-Control": "no-cache" },
        skipAuthRefresh: true,
        signal,
      })
      .then((response) => response.data.data);
  },
};
