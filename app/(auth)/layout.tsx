"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";
import { getAuthenticatedEntryPath, getSafeNextPath } from "@/app/lib/auth-routing";

/** Login, signup and OTP forms are only available without an active session. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!loading && user) router.replace(getAuthenticatedEntryPath(user, getSafeNextPath()));
  }, [loading, user, router, pathname]);
  if (loading || user) return null;
  return <>{children}</>;
}
