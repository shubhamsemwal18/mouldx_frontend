"use client";
import { useEffect, type ReactNode } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";

// Legacy return/refund/rating screens were mock actions. Until those APIs exist,
// direct visits must show the real reservation, not a simulated success.
export default function BookingLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const path = usePathname();
  const router = useRouter();
  const canonical = `/bookings/${encodeURIComponent(id)}`;
  useEffect(() => { if (path !== canonical) router.replace(canonical); }, [path, canonical, router]);
  return path === canonical ? children : null;
}
