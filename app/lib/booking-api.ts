import axios from "axios";
import { apiClient, getApiErrorMessage, type ApiResponse } from "./api";
import { addDays, rangeError } from "./booking-dates";
import { mediaApi } from "./media-api";
import type {
  Booking, BookingAvailability, BookingList, BookingListParams,
  BookingPaymentOptions, BookingStatus, BookingView, CreateBookingInput,
} from "./booking-types";

export const bookingApi = {
  async pendingRequest(productId: string, startDate: string, endDate: string, signal?: AbortSignal) {
    const { data } = await apiClient.get<ApiResponse<{ pendingRequest: { bookingId: string; bookingCode: string } | null }>>("/bookings/pending-request", {
      params: { productId, startDate, endDate }, signal,
    });
    // Missing/malformed responses are not permission to enter checkout.
    if (data?.success !== true || !data.data || !Object.hasOwn(data.data, "pendingRequest")) {
      throw new Error("We couldn't verify your existing requests. Please try again.");
    }
    const pending = data.data.pendingRequest;
    if (pending === null) return null;
    if (!pending || typeof pending.bookingId !== "string" || !pending.bookingId.trim() || typeof pending.bookingCode !== "string" || !pending.bookingCode.trim()) {
      throw new Error("We couldn't verify your existing requests. Please try again.");
    }
    return pending;
  },
  async checkRequest(productId: string, startDate: string, endDate: string, signal?: AbortSignal) {
    const pendingRequest = await bookingApi.pendingRequest(productId, startDate, endDate, signal);
    if (pendingRequest) return {
      canProceed: false as const,
      message: "A request is already pending for this product and these dates.",
      pendingRequest,
    };
    const availability = await bookingApi.availability(productId, startDate, endDate, signal);
    if (availability.product.availability === "maintenance") return {
      canProceed: false as const, message: "This product is under maintenance and is not accepting new bookings.", pendingRequest: null,
    };
    const invalid = rangeError(startDate, endDate, availability.today, availability.blockedRanges);
    if (invalid) return { canProceed: false as const, message: invalid, pendingRequest: null };
    return { canProceed: true as const, availability };
  },
  async availabilityRange(productId: string, from: string, to: string, signal?: AbortSignal): Promise<BookingAvailability> {
    const firstEnd = to < addDays(from, 365) ? to : addDays(from, 365);
    const first = await bookingApi.availability(productId, from, firstEnd, signal);
    for (let cursor = addDays(firstEnd, 1); cursor <= to; cursor = addDays(cursor, 366)) {
      const end = to < addDays(cursor, 365) ? to : addDays(cursor, 365);
      const part = await bookingApi.availability(productId, cursor, end, signal);
      first.blockedRanges.push(...part.blockedRanges);
    }
    return first;
  },
  availability(productId: string, from: string, to: string, signal?: AbortSignal) {
    return apiClient.get<ApiResponse<BookingAvailability>>("/bookings/availability", {
      params: { productId, from, to }, skipAuthRefresh: true, signal,
    }).then(({ data }) => data.data);
  },
  paymentOptions(productId: string, signal?: AbortSignal) {
    return apiClient.get<ApiResponse<BookingPaymentOptions>>("/bookings/payment-options", {
      params: { productId }, signal,
    }).then(({ data }) => data.data);
  },
  create(input: CreateBookingInput) {
    return apiClient.post<ApiResponse<{ booking: Booking }>>("/bookings", input)
      .then(({ data }) => data.data.booking);
  },
  list(view: BookingView, params: BookingListParams, signal?: AbortSignal) {
    return apiClient.get<ApiResponse<BookingList>>(view === "admin" ? "/admin/bookings" : "/bookings", {
      params: { ...params, ...(view !== "admin" && { view }) }, signal,
    }).then(({ data }) => data.data);
  },
  get(id: string, view: BookingView, signal?: AbortSignal) {
    return apiClient.get<ApiResponse<{ booking: Booking }>>(
      `${view === "admin" ? "/admin" : ""}/bookings/${encodeURIComponent(id)}`, { signal },
    ).then(({ data }) => data.data.booking);
  },
  receiptUrl(id: string, view: BookingView) {
    return apiClient.get<ApiResponse<{ previewUrl: string }>>(
      `${view === "admin" ? "/admin" : ""}/bookings/${encodeURIComponent(id)}/payment-receipt`,
    ).then(({ data }) => data.data.previewUrl);
  },
  review(id: string, status: Exclude<BookingStatus, "pending">, reason?: string) {
    return apiClient.patch<ApiResponse<{ booking: Booking }>>(
      `/admin/bookings/${encodeURIComponent(id)}/review`, { status, ...(reason && { reason }) },
    ).then(({ data }) => data.data.booking);
  },
};

export function getPaymentReceiptError(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) return "Choose a PDF receipt.";
  if (file.size === 0) return "The PDF receipt is empty.";
  if (file.size > 15 * 1024 * 1024) return "The PDF receipt must be 15MB or smaller.";
  return null;
}

export async function uploadPaymentReceipt(file: File): Promise<string> {
  const error = getPaymentReceiptError(file);
  if (error) throw new Error(error);
  const upload = await mediaApi.createUploadTarget({
    folder: "bookings", fileName: file.name, contentType: "application/pdf", fileSize: file.size,
  });
  const response = await fetch(upload.uploadUrl, { method: "PUT", headers: upload.headers, body: file });
  if (!response.ok) throw new Error("The PDF receipt could not be uploaded. Please try again.");
  await mediaApi.confirm(upload.mediaId, { size: file.size });
  return upload.mediaId;
}

export function bookingError(error: unknown) {
  const result: { message: string; status?: number; bookingId?: string; bookingCode?: string; paymentOptionsChanged?: boolean } = {
    message: getApiErrorMessage(error, "Unable to load booking information. Please try again."),
  };
  if (axios.isAxiosError(error)) {
    result.status = error.response?.status;
    const details = error.response?.data?.details;
    if (details && !Array.isArray(details)) {
      if (typeof details.bookingId === "string") result.bookingId = details.bookingId;
      if (typeof details.bookingCode === "string") result.bookingCode = details.bookingCode;
      if (details.paymentOptionsChanged === true) result.paymentOptionsChanged = true;
    }
  }
  return result;
}
