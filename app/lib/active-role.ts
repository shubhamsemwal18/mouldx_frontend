"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
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

export function useActiveRole() {
  const pathname = usePathname();
  const stored = useSyncExternalStore(subscribe, getActiveRole, getServerSnapshot);

  // Being inside the owner area means acting as an owner, whatever was stored
  // last — this keeps the header honest after a deep link or a redirect.
  const inOwnerArea = Boolean(pathname?.startsWith("/owner"));
  const activeRole: ActiveRole = inOwnerArea ? "owner" : stored ?? "customer";

  // An explicit switch navigates, so there is a window where the role has
  // already changed but the route has not caught up yet. This marks that
  // window so the route-sync below cannot overwrite the user's choice.
  const pendingRole = useRef<ActiveRole | null>(null);

  // Persist what the route implies, so a deep link or a post-login redirect
  // into the owner area is remembered like an explicit switch would be.
  // Deferred to a macrotask so the store update does not run synchronously
  // inside the effect.
  useEffect(() => {
    if (pendingRole.current) {
      const settled = pendingRole.current === "owner" ? inOwnerArea : !inOwnerArea;
      if (settled) pendingRole.current = null;
      return;
    }

    if (!inOwnerArea || stored === "owner") return;

    const timer = window.setTimeout(() => setActiveRole("owner"), 0);
    return () => window.clearTimeout(timer);
  }, [inOwnerArea, stored]);

  const switchRole = useCallback((role: ActiveRole) => {
    pendingRole.current = role;
    setActiveRole(role);
  }, []);

  return { activeRole, switchRole, isStored: stored !== null };
}
