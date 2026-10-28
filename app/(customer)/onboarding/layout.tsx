"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isAdmin = Boolean(user?.approvedRoles.includes("admin"));

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (isAdmin) router.replace("/admin");
  }, [loading, user, isAdmin, pathname, router]);

  if (loading || !user || isAdmin) return null;
  return <>{children}</>;
}
