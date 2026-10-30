import BookingDetail from "@/app/components/bookings/BookingDetail";
export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BookingDetail id={id} view="admin" />;
}
