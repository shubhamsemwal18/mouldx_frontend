export type SignupRole = "customer" | "owner";

const SELECTED_ROLE_KEY = "mouldx_selected_signup_role";

export function getSelectedSignupRole(): SignupRole {
  if (typeof window === "undefined") return "customer";
  const value = window.localStorage.getItem(SELECTED_ROLE_KEY);
  return value === "owner" ? "owner" : "customer";
}

export function setSelectedSignupRole(role: SignupRole) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SELECTED_ROLE_KEY, role);
}
