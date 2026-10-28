export type SignupRole = "customer" | "owner";

const SELECTED_ROLE_KEY = "mouldx_selected_signup_role";
let sessionRole: SignupRole = "customer";

export function getSelectedSignupRole(): SignupRole {
  if (typeof window === "undefined") return "customer";
  try {
    const value = window.localStorage.getItem(SELECTED_ROLE_KEY);
    return value === "owner" ? "owner" : "customer";
  } catch {
    return sessionRole;
  }
}

export function setSelectedSignupRole(role: SignupRole) {
  if (typeof window === "undefined") return;
  sessionRole = role;
  try { window.localStorage.setItem(SELECTED_ROLE_KEY, role); } catch { /* Keep the in-session preference. */ }
}

/**
 * Cleared on logout so the next person signing up on this browser is not
 * routed by the previous user's choice.
 */
export function clearSelectedSignupRole() {
  if (typeof window === "undefined") return;
  sessionRole = "customer";
  try { window.localStorage.removeItem(SELECTED_ROLE_KEY); } catch { /* Storage may be blocked. */ }
}
