"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import OwnerBottomNav from "@/app/components/layout/OwnerBottomNav";
import { useAuth } from "@/app/lib/auth-context";
import { getOwnerOnboardingPath } from "@/app/lib/auth-routing";

/**
 * Gate and shell for host pages. Shared by the `/owner/*` layout and the host
 * dashboard rendered at `/`, so both apply the same access check.
 *
 * The check reads `approvedRoles` from the session the backend returned, not
 * the locally stored active role, so switching modes on the client cannot
 * open the host area to an account that is not an approved owner.
 */
export default function OwnerArea({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, ownerProfileVerification, loading } = useAuth();
  const isOwner = Boolean(user?.approvedRoles.includes("owner"));
  const isOnboarding = pathname.startsWith("/owner/onboarding");
  const status = ownerProfileVerification?.status || user?.profileVerificationStatus;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isOnboarding || isOwner) return;

    router.replace(getOwnerOnboardingPath(status));
  }, [isOnboarding, isOwner, loading, pathname, router, status, user]);

  if (loading || !user || (!isOnboarding && !isOwner)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {children}
      <OwnerBottomNav />
    </div>
  );
}
