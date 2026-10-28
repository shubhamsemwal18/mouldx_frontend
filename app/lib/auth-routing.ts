import type { AuthPayload, ProfileVerificationStatus, User } from "@/app/lib/types";

/** Shared KYC destinations, independent of the selected browsing preference. */
export function getOnboardingPath(status?: ProfileVerificationStatus) {
  if (status === "in_review") return "/onboarding/review";
  if (status === "rejected") return "/onboarding/rejected";
  if (status === "approved") return "/onboarding/approved";
  return "/onboarding";
}

export function getUserLandingPath(user: User) {
  const roles = user.approvedRoles || [];

  if (roles.includes("admin")) {
    return "/admin";
  }

  return user.profileVerificationStatus === "approved" ? "/" : getOnboardingPath(user.profileVerificationStatus);
}

export function getPostAuthPath(payload: AuthPayload) {
  return getAuthenticatedEntryPath(payload.user, getSafeNextPath());
}

export function isAdminUser(user: User | null | undefined) {
  return Boolean(user?.approvedRoles?.includes("admin"));
}

const within = (path: string, root: string) => path === root || path.startsWith(`${root}/`);

/** Public catalogue/detail pages remain accessible; participation is role-specific. */
export function isUserWorkflowPath(path: string) {
  return ["/owner", "/bookings", "/inbox", "/profile", "/onboarding", "/booking-success", "/switch-profile"].some((root) => within(path, root)) || /^\/explore\/[^/]+\/(dates|confirm)(?:\/|$)/.test(path);
}

export function getAuthenticatedEntryPath(user: User, next?: string | null) {
  const landing = getUserLandingPath(user);
  if (landing !== "/" || !next) return landing;
  const path = next.split(/[?#]/)[0];
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\u0000-\u001f]/.test(next)) return landing;
  if (["/login", "/signup", "/verify-otp", "/admin"].some((root) => within(path, root))) return landing;
  if (within(path, "/owner") && !user.approvedRoles.includes("owner")) return landing;
  return next;
}

export function getSafeNextPath() {
  if (typeof window === "undefined") return null;
  const next = new URLSearchParams(window.location.search).get("next");

  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f]/.test(next)) {
    return null;
  }
  try {
    const target = new URL(next, window.location.origin);
    return target.origin === window.location.origin ? `${target.pathname}${target.search}${target.hash}` : null;
  } catch {
    return null;
  }
}
