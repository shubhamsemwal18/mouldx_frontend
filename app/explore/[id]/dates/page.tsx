import SelectBookingDates from "@/app/components/bookings/SelectBookingDates";
import BookingAccess from "@/app/components/bookings/BookingAccess";

export default async function SelectDatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BookingAccess next={`/explore/${encodeURIComponent(id)}/dates`}><SelectBookingDates slug={id} /></BookingAccess>;
}
