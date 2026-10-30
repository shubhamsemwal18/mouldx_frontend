"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import OwnerBottomNav from "@/app/components/layout/OwnerBottomNav";
import { useAuth } from "@/app/lib/auth-context";
import { getOnboardingPath, isAdminUser } from "@/app/lib/auth-routing";
import { setActiveRole } from "@/app/lib/active-role";

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
  const status = ownerProfileVerification?.status || user?.profileVerificationStatus;
  const isAdmin = isAdminUser(user);
  const isOwner = !isAdmin && status === "approved" && Boolean(user?.approvedRoles.includes("owner"));

  // Persist an authorized deep link on route entry only. Store subscribers must
  // not overwrite an explicit switch while navigation away is still settling.
  useEffect(() => {
    if (!isOwner || (pathname !== "/owner" && !pathname.startsWith("/owner/"))) return;
    const timer = window.setTimeout(() => setActiveRole("owner"), 0);
    return () => window.clearTimeout(timer);
  }, [isOwner, pathname]);

  useEffect(() => {
    if (loading) return;

    if (isAdmin) {
      router.replace("/admin");
      return;
    }

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isOwner) return;

    router.replace(status === "approved" ? "/" : getOnboardingPath(status));
  }, [isAdmin, isOwner, loading, pathname, router, status, user]);

  if (loading || !user || !isOwner) {
    return null;
  }
  if (/^\/owner\/inbox\/[^/]+$/.test(pathname)) return <>{children}</>;

  return (
    <div className="min-h-screen bg-white pb-20">
      {children}
      <OwnerBottomNav />
    </div>
  );
}
