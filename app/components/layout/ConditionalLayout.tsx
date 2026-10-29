"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import OwnerBottomNav from "@/app/components/layout/OwnerBottomNav";
import SplashLoader from "@/app/components/shared/SplashLoader";
import { useAuth } from "@/app/lib/auth-context";
import { useHomeView } from "@/app/lib/home-view";
import Footer from "./Footer";
import styles from "./ConditionalLayout.module.css";
import { isAdminUser, isUserWorkflowPath } from "@/app/lib/auth-routing";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({
  children,
}: ConditionalLayoutProps) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();
  const homeView = useHomeView();
  const userWorkflow = isUserWorkflowPath(pathname);
  const blockedAdmin = isAdminUser(user) && userWorkflow;
  useEffect(() => {
    if (!loading && blockedAdmin) router.replace("/admin");
  }, [loading, blockedAdmin, router, pathname]);

  // All admin pages should NOT show website Header/SplashLoader
  const isAdminRoute =
    pathname === "/admin" || pathname.startsWith("/admin/");
  // In host mode `/` renders the host dashboard, which brings its own nav.
  const isOwnerRoute =
    pathname === "/owner" ||
    pathname.startsWith("/owner/") ||
    (pathname === "/" && homeView === "owner");
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
    !/^\/explore\/[^/]+\/(dates|confirm)$/.test(pathname) &&
    !user?.approvedRoles?.includes("admin") &&
    !isAdminRoute &&
    !isOwnerRoute &&
    !isAuthRoute &&
    isCustomerRoute;

  if ((loading && userWorkflow) || blockedAdmin) return null;

  if (isAdminRoute) {
    return <>{children}</>;
  }
  if (/^\/(?:owner\/)?inbox\/[^/]+$/.test(pathname)) {
    return <SplashLoader><main>{children}</main></SplashLoader>;
  }

  return (
    <SplashLoader>
      <Header />
      <main className={showCustomerNav ? styles.withCustomerNav : undefined}>{children}</main>
      {!isOwnerRoute && <Footer />}
      {showCustomerNav && (pathname === "/profile" && homeView === "owner" ? <OwnerBottomNav /> : <BottomNav />)}
    </SplashLoader>
  );
}
