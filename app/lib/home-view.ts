"use client";

import { useAuth } from "@/app/lib/auth-context";
import { useActiveRole } from "@/app/lib/active-role";

/**
 * Which home `/` shows: the host dashboard or the customer home.
 *
 * "pending" while auth is resolving, so a host never sees the customer home
 * flash before their dashboard. Signed-out visitors always get the customer
 * home. A stored signup preference never grants dashboard access.
 */
export type HomeView = "pending" | "owner" | "customer";

export function useHomeView(): HomeView {
  const { user, loading } = useAuth();
  const isAdmin = Boolean(user?.approvedRoles?.includes("admin"));
  const { activeRole } = useActiveRole(!isAdmin && user?.profileVerificationStatus === "approved" && Boolean(user.approvedRoles.includes("owner")));

  if (loading) return "pending";

  if (user?.profileVerificationStatus === "approved" && user.approvedRoles.includes("owner") && !isAdmin && activeRole === "owner") return "owner";

  return "customer";
}
