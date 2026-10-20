import { getSelectedSignupRole, type SignupRole } from "@/app/lib/role-selection";

export type PendingAuthFlow = "signup" | "login";

export interface PendingAuth {
  flow: PendingAuthFlow;
  identifier: string;
  role: SignupRole;
}

const PENDING_AUTH_KEY = "mouldx_pending_auth";

export function setPendingAuth(auth: Omit<PendingAuth, "role"> & { role?: SignupRole }) {
  if (typeof window === "undefined") return;
  const payload: PendingAuth = {
    ...auth,
    role: auth.role || getSelectedSignupRole(),
  };
  window.sessionStorage.setItem(PENDING_AUTH_KEY, JSON.stringify(payload));
}

export function getPendingAuth(): PendingAuth | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(PENDING_AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingAuth;
  } catch {
    return null;
  }
}

export function clearPendingAuth() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_AUTH_KEY);
}
