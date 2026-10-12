"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import OwnerBottomNav from "@/app/components/layout/OwnerBottomNav";
import { useAuth } from "@/app/lib/auth-context";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
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

    if (status === "in_review") {
      router.replace("/owner/onboarding/review");
      return;
    }

    if (status === "rejected") {
      router.replace("/owner/onboarding/rejected");
      return;
    }

    if (status === "approved") {
      router.replace("/owner/onboarding/approved");
      return;
    }

    router.replace("/owner/onboarding");
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
