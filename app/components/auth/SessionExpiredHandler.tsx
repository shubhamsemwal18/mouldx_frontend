"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AUTH_SESSION_EXPIRED_EVENT } from "@/app/lib/auth-storage";

const AUTH_ROUTES = ["/login", "/signup", "/verify-otp"];

export default function SessionExpiredHandler() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleSessionExpired = () => {
      if (AUTH_ROUTES.includes(pathname)) {
        return;
      }

      const currentQuery = window.location.search.replace(/^\?/, "");
      const redirectTo = `${pathname}${currentQuery ? `?${currentQuery}` : ""}`;
      const next = encodeURIComponent(redirectTo);
      router.replace(`/login?reason=session-expired&next=${next}`);
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [pathname, router]);

  return null;
}
