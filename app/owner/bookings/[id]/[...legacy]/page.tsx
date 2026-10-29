import { redirect } from "next/navigation";

export default async function LegacyBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/owner/bookings/${encodeURIComponent(id)}`);
}
