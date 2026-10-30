export interface AuthSession {
  accessToken: string;
}

export const AUTH_SESSION_EXPIRED_EVENT = "mouldx:auth-session-expired";
const AUTH_SESSION_HINT_KEY = "mouldx:auth-session-present";

let inMemoryAccessToken: string | null = null;
let sessionVersion = 0;
export const getAuthSessionVersion = () => sessionVersion;

export function getAccessToken() {
  return inMemoryAccessToken;
}

export function setAuthSession(session: AuthSession) {
  sessionVersion += 1;
  inMemoryAccessToken = session.accessToken;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(AUTH_SESSION_HINT_KEY, "1"); } catch { /* Storage may be blocked. */ }
  }
}

export function clearAuthSession() {
  sessionVersion += 1;
  inMemoryAccessToken = null;
  if (typeof window !== "undefined") {
    try { window.localStorage.removeItem(AUTH_SESSION_HINT_KEY); } catch { /* Storage may be blocked. */ }
  }
}

export function hasAuthSessionHint() {
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(AUTH_SESSION_HINT_KEY) === "1"; } catch { return false; }
}

export function notifySessionExpired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
}
