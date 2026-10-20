"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";
import { getUserLandingPath } from "@/app/lib/auth-routing";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const isPassthroughRoute =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  useEffect(() => {
    if (isPassthroughRoute || loading) return;

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    const landingPath = getUserLandingPath(user);
    if (landingPath !== "/") {
      router.replace(landingPath);
    }
  }, [isPassthroughRoute, loading, pathname, router, user]);

  if (!isPassthroughRoute && (loading || !user || getUserLandingPath(user) !== "/")) {
    return null;
  }

  return <>{children}</>;
}
