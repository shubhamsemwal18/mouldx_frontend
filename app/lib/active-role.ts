"use client";

import { useCallback, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

/**
 * Which profile the user is currently acting as.
 *
 * A user has one account and a set of `approvedRoles`; the active role is the
 * mode they are browsing in. It is persisted so it survives reloads and stays
 * consistent across tabs, and is readable outside React via `getActiveRole()`.
 */
export type ActiveRole = "customer" | "owner";

const ACTIVE_ROLE_KEY = "mouldx_active_role";
export const ACTIVE_ROLE_CHANGED_EVENT = "mouldx:active-role-changed";

const isActiveRole = (value: unknown): value is ActiveRole =>
  value === "customer" || value === "owner";

export function getActiveRole(): ActiveRole | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ACTIVE_ROLE_KEY);
    return isActiveRole(raw) ? raw : null;
  } catch {
    // Private mode or blocked storage: fall back to the default role.
    return null;
  }
}

export function setActiveRole(role: ActiveRole) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(ACTIVE_ROLE_KEY, role);
  } catch {
    // Ignore write failures; the in-session value still propagates below.
  }

  window.dispatchEvent(new CustomEvent(ACTIVE_ROLE_CHANGED_EVENT, { detail: role }));
}

/**
 * Picks the starting mode for a signed-in user who has none stored (logout
 * clears it): approved owners start on the host dashboard. An explicit choice
 * already stored, e.g. from the Get Started modal, is kept.
 */
export function initActiveRoleFor(approvedRoles: readonly string[] = [], status?: string) {
  if (status !== "approved" || approvedRoles.includes("admin")) return;
  if (getActiveRole() === "owner" && !approvedRoles.includes("owner")) {
    setActiveRole("customer");
    return;
  }
  if (getActiveRole() !== null) return;
  if (approvedRoles.includes("owner")) setActiveRole("owner");
}

export function clearActiveRole() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(ACTIVE_ROLE_KEY);
  } catch {
    // Ignore.
  }

  window.dispatchEvent(new CustomEvent(ACTIVE_ROLE_CHANGED_EVENT, { detail: null }));
}

/* ------------------------------------------------------------------ *
 * React binding
 * ------------------------------------------------------------------ */

const subscribe = (onChange: () => void) => {
  window.addEventListener(ACTIVE_ROLE_CHANGED_EVENT, onChange);
  // `storage` fires in other tabs, keeping them in sync.
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(ACTIVE_ROLE_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};

/** Server render has no storage, so it always starts on the default role. */
const getServerSnapshot = (): ActiveRole | null => null;

export function useActiveRole(canUseOwnerArea = false) {
  const pathname = usePathname();
  const stored = useSyncExternalStore(subscribe, getActiveRole, getServerSnapshot);

  // Being inside the owner area means acting as an owner, whatever was stored
  // last — this keeps the header honest after a deep link or a redirect.
  const inOwnerArea = canUseOwnerArea && Boolean((pathname === "/owner" || pathname?.startsWith("/owner/")) && !pathname?.startsWith("/owner/onboarding"));
  const activeRole: ActiveRole = inOwnerArea ? "owner" : stored ?? "customer";

  const switchRole = useCallback((role: ActiveRole) => {
    if (role === "owner" && !canUseOwnerArea) return;
    setActiveRole(role);
  }, [canUseOwnerArea]);

  return { activeRole, switchRole, isStored: stored !== null };
}
