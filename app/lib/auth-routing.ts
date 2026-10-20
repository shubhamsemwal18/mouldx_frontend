import type { AuthPayload, User } from "@/app/lib/types";
import type { SignupRole } from "@/app/lib/role-selection";

export function getUserLandingPath(user: User, preferredRole?: SignupRole) {
  const roles = user.approvedRoles || [];
  const status = user.profileVerificationStatus;

  if (roles.includes("admin")) {
    return "/admin";
  }

  if (status === "in_review") {
    return "/owner/onboarding/review";
  }

  if (status === "rejected") {
    return "/owner/onboarding/rejected";
  }

  if (status !== "approved" || preferredRole === "owner") {
    return "/owner/onboarding/profile";
  }

  return "/";
}

export function getPostAuthPath(payload: AuthPayload, preferredRole?: SignupRole) {
  return getUserLandingPath(payload.user, preferredRole);
}

export function getSafeNextPath() {
  if (typeof window === "undefined") return null;
  const next = new URLSearchParams(window.location.search).get("next");

  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }

  return next;
}
