"use client";

import { useAuth } from "@/app/lib/auth-context";
import { useActiveRole } from "@/app/lib/active-role";

/**
 * Which home `/` shows: the host dashboard or the customer home.
 *
 * "pending" while auth is resolving, so a host never sees the customer home
 * flash before their dashboard. Signed-out visitors always get the customer
 * home; a host-mode user who is not an approved owner is sent to onboarding
 * by `OwnerArea`.
 */
export type HomeView = "pending" | "owner" | "customer";

export function useHomeView(): HomeView {
  const { user, loading } = useAuth();
  const { activeRole } = useActiveRole();

  if (loading) return "pending";

  const isAdmin = Boolean(user?.approvedRoles?.includes("admin"));
  if (user && !isAdmin && activeRole === "owner") return "owner";

  return "customer";
}
