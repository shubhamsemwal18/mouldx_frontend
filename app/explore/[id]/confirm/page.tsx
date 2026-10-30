import ConfirmBooking from "@/app/components/bookings/ConfirmBooking";
import BookingAccess from "@/app/components/bookings/BookingAccess";

export default async function ConfirmPayPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ startDate?: string; endDate?: string; checkIn?: string; checkOut?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const start = query.startDate || query.checkIn || "";
  const end = query.endDate || query.checkOut || "";
  return <BookingAccess next={`/explore/${encodeURIComponent(id)}/confirm?${new URLSearchParams({ startDate: start, endDate: end })}`}><ConfirmBooking key={`${id}:${start}:${end}`} slug={id} start={start} end={end} /></BookingAccess>;
}
