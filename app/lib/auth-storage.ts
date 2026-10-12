export interface AuthSession {
  accessToken: string;
}

export const AUTH_SESSION_EXPIRED_EVENT = "mouldx:auth-session-expired";
const AUTH_SESSION_HINT_KEY = "mouldx:auth-session-present";

let inMemoryAccessToken: string | null = null;

export function getAccessToken() {
  return inMemoryAccessToken;
}

export function setAuthSession(session: AuthSession) {
  inMemoryAccessToken = session.accessToken;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_SESSION_HINT_KEY, "1");
  }
}

export function clearAuthSession() {
  inMemoryAccessToken = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_SESSION_HINT_KEY);
  }
}

export function hasAuthSessionHint() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_SESSION_HINT_KEY) === "1";
}

export function notifySessionExpired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
}
