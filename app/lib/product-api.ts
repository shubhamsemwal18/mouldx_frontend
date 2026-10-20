import { apiClient, type ApiResponse } from "@/app/lib/api";
import type {
  Dimensions,
  LatLng,
  MouldType,
  Product,
  ProductDetail,
  ProductStatus,
  ProductStatusStats,
  RunnerType,
} from "@/app/lib/types";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Descriptive fields only — media is attached to the mould. */
export interface ComponentInput {
  name?: string;
  dimensions?: Partial<Dimensions>;
  weight?: number;
  surfaceFinish?: string;
}

export interface MouldInput {
  mouldNameOrId?: string;
  mouldType?: MouldType;
  yearOfManufacturing?: number;
  dimensions?: Partial<Dimensions>;
  weight?: number;
  cavities?: number;
  expectedCycleTime?: number;
  recommendedMachineTonnage?: number;
  runnerType?: RunnerType;
  changeableBrandLogo?: boolean;
  imageIds?: string[];
  videoIds?: string[];
  component?: ComponentInput;
}

/**
 * `submit: false` saves a draft, where everything except `name` may be
 * incomplete. `submit: true` runs the strict server-side rules and sends the
 * listing for admin approval.
 */
export interface ProductWritePayload {
  name: string;
  categoryId?: string | null;
  subCategoryId?: string | null;
  /** First id is the cover. At least one is required on submit. */
  imageIds?: string[];
  videoIds?: string[];
  dimensions?: Partial<Dimensions>;
  weight?: number;
  material?: string;
  surfaceFinish?: string;
  pricing?: {
    perDayCharges?: number;
    securityDeposit?: number;
  };
  componentCount?: number;
  location?: LatLng | null;
  moulds?: MouldInput[];
  submit?: boolean;
}

export interface ProductListParams {
  status?: ProductStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProductListResponse {
  products: Product[];
  pagination: Pagination;
  stats: ProductStatusStats;
}

export const productApi = {
  list(params?: ProductListParams) {
    return apiClient
      .get<ApiResponse<ProductListResponse>>("/owner/products", { params })
      .then((response) => response.data.data);
  },

  get(id: string) {
    return apiClient
      .get<ApiResponse<ProductDetail>>(`/owner/products/${id}`)
      .then((response) => response.data.data);
  },

  create(payload: ProductWritePayload) {
    return apiClient
      .post<ApiResponse<ProductDetail>>("/owner/products", payload)
      .then((response) => response.data.data);
  },

  update(id: string, payload: ProductWritePayload) {
    return apiClient
      .patch<ApiResponse<ProductDetail>>(`/owner/products/${id}`, payload)
      .then((response) => response.data.data);
  },

  submit(id: string) {
    return apiClient
      .post<ApiResponse<ProductDetail>>(`/owner/products/${id}/submit`, {})
      .then((response) => response.data.data);
  },

  remove(id: string) {
    return apiClient.delete<ApiResponse<Record<string, never>>>(`/owner/products/${id}`);
  },
};
