"use client";

import { usePathname } from "next/navigation";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import SplashLoader from "@/app/components/shared/SplashLoader";
import { useAuth } from "@/app/lib/auth-context";
import Footer from "./Footer";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({
  children,
}: ConditionalLayoutProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // All admin pages should NOT show website Header/SplashLoader
  const isAdminRoute =
    pathname === "/admin" || pathname.startsWith("/admin/");
  const isOwnerRoute = pathname === "/owner" || pathname.startsWith("/owner/");
  const isAuthRoute = pathname === "/login" || pathname === "/signup" || pathname === "/verify-otp";
  const isCustomerRoute =
    pathname === "/" ||
    pathname === "/bookings" ||
    pathname.startsWith("/bookings/") ||
    pathname === "/inbox" ||
    pathname.startsWith("/inbox/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/explore" ||
    pathname.startsWith("/explore/") ||
    pathname === "/booking-success";
  const showCustomerNav =
    Boolean(user) &&
    !user?.approvedRoles?.includes("admin") &&
    !isAdminRoute &&
    !isOwnerRoute &&
    !isAuthRoute &&
    isCustomerRoute;

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <SplashLoader>
      <Header />
      <main className={showCustomerNav ? "pb-20" : undefined}>{children}</main>
      <Footer />
      {showCustomerNav && <BottomNav />}
    </SplashLoader>
  );
}
