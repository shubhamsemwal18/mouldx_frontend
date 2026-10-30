import type { Dimensions, MediaRef, Mould, ProductCategoryRef, User } from "./types";
import type { Pagination } from "./product-api";

export type BookingStatus = "pending" | "approved" | "rejected";
export type RentalPhase = "upcoming" | "active" | "completed";
export type BookingFilter = BookingStatus | RentalPhase | "";
export type BookingView = "customer" | "host" | "admin";
export type PaymentMethod = "owner" | "upi" | "platform";
export interface BlockedRange { startDate: string; endDate: string }
export interface BookingPaymentOptions {
  owner: boolean;
  platform: false;
  upi: { id: string; name: string } | null;
}
export interface BookingAvailability {
  today: string;
  cooldownDays: number;
  /** Inclusive, already expanded by the server's cooldown. */
  blockedRanges: BlockedRange[];
  product: {
    _id: string;
    name: string;
    code: string;
    slug: string;
    owner?: string | Pick<User, "_id">;
    pricing: { perDayCharges: number; securityDeposit: number };
  };
}
export interface BookingPerson { fullName: string; email?: string; phone?: string; firmName?: string; firmEmail?: string }
export type BookingMould = Partial<Omit<Mould, "images" | "videos">> & {
  images?: MediaRef[];
  videos?: MediaRef[];
};
export interface Booking {
  _id: string;
  code: string;
  product: string;
  customer?: string;
  host?: string;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  rentalPhase?: RentalPhase | null;
  payment: {
    method: PaymentMethod;
    status: "unpaid" | "reported";
    upiId?: string;
    upiReference?: string;
  };
  pricing: {
    currency: "INR";
    days: number;
    perDayCharges: number;
    securityDeposit: number;
    rentalTotal: number;
    total: number;
  };
  snapshot: {
    product: {
      name: string;
      code: string;
      slug?: string;
      dimensions?: Partial<Dimensions>;
      weight?: number;
      material?: string;
      surfaceFinish?: string;
      category?: ProductCategoryRef | string | null;
      subCategory?: ProductCategoryRef | string | null;
      images?: MediaRef[];
      videos?: MediaRef[];
      moulds?: BookingMould[];
    };
    customer?: BookingPerson;
    host?: BookingPerson;
  };
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
}
export interface BookingList {
  bookings: Booking[];
  pagination: Pagination;
  stats: { total: number; pending: number; approved: number; rejected: number; upcoming: number; active: number; completed: number };
}
export interface BookingListParams {
  status?: BookingStatus;
  phase?: RentalPhase;
  page?: number;
  limit?: number;
  search?: string;
}
export interface CreateBookingInput {
  productId: string;
  startDate: string;
  endDate: string;
  paymentMethod: PaymentMethod;
  upiReference?: string;
}
