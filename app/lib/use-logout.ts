"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

/** Shared logout action for headers and profiles; session cleanup lives in AuthProvider. */
export function useLogout(destination = "/") {
  const { logout, loggingOut } = useAuth();
  const router = useRouter();
  const [logoutError, setLogoutError] = useState("");
  const handleLogout = useCallback(async () => {
    setLogoutError("");
    try {
      await logout();
      router.replace(destination);
    } catch {
      setLogoutError("We couldn't log you out. Please check your connection and try again.");
    }
  }, [logout, router, destination]);
  return { handleLogout, loggingOut, logoutError };
}
