import { redirect } from "next/navigation";

export default async function LegacyBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/bookings/${encodeURIComponent(id)}`);
}
