import type { BookingView } from "./booking-types";

export const bookingBasePath = (view: BookingView) =>
  view === "admin" ? "/admin/bookings" : view === "host" ? "/owner/bookings" : "/bookings";
