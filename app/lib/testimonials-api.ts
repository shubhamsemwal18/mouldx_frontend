import { apiClient, type ApiResponse } from "@/app/lib/api";

export interface Testimonial {
  _id: string;
  name: string;
  role: string;
  location?: string;
  quote: string;
  rating: number;
}

export interface AdminTestimonial extends Testimonial {
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TestimonialInput = Omit<Testimonial, "_id"> & { published: boolean };

export async function listPublishedTestimonials(signal?: AbortSignal) {
  const { data } = await apiClient.get<ApiResponse<{ testimonials: Testimonial[] }>>("/testimonials", {
    signal,
    skipAuthRefresh: true,
  });
  return data.data.testimonials;
}

const adminPath = "/admin/testimonials";

export const testimonialsAdminApi = {
  async list(signal?: AbortSignal) {
    const { data } = await apiClient.get<ApiResponse<{ testimonials: AdminTestimonial[] }>>(adminPath, { signal });
    return data.data.testimonials;
  },

  async create(input: TestimonialInput) {
    const { data } = await apiClient.post<ApiResponse<{ testimonial: AdminTestimonial }>>(adminPath, input);
    return data.data.testimonial;
  },

  async update(id: string, input: TestimonialInput) {
    const { data } = await apiClient.patch<ApiResponse<{ testimonial: AdminTestimonial }>>(`${adminPath}/${id}`, input);
    return data.data.testimonial;
  },

  async remove(id: string) {
    await apiClient.delete(`${adminPath}/${id}`);
  },
};
