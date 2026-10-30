"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import axios from "axios";
import { authApi } from "@/app/lib/auth-api";
import { AUTH_SESSION_EXPIRED_EVENT, clearAuthSession, hasAuthSessionHint, setAuthSession } from "@/app/lib/auth-storage";
import { clearActiveRole, initActiveRoleFor } from "@/app/lib/active-role";
import { clearSelectedSignupRole } from "@/app/lib/role-selection";
import { clearPendingAuth } from "@/app/lib/pending-auth";
import type { AuthPayload, OwnerProfileVerification, User } from "@/app/lib/types";

interface AuthContextValue {
  user: User | null;
  ownerProfileVerification: OwnerProfileVerification | null;
  loading: boolean;
  isAuthenticated: boolean;
  setAuthPayload: (payload: AuthPayload) => void;
  setOwnerProfileVerificationState: (
    verification: OwnerProfileVerification,
    userPatch?: Partial<User>
  ) => void;
  refreshCurrentUser: () => Promise<void>;
  logout: () => Promise<void>;
  loggingOut: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let bootstrapPromise: Promise<AuthPayload | null> | null = null;
let bootstrapComplete = false;
let bootstrapPayload: AuthPayload | null = null;

const needsAuthBootstrap = (pathname: string | null) => {
  if (typeof window === "undefined") return false;
  if (hasAuthSessionHint()) return true;

  const path = pathname || "/";
  return (
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/owner" ||
    path.startsWith("/owner/") ||
    path === "/onboarding" ||
    path.startsWith("/onboarding/") ||
    path === "/profile" ||
    path === "/bookings" ||
    path === "/inbox" ||
    path.startsWith("/profile/") ||
    path.startsWith("/bookings/") ||
    path.startsWith("/inbox/")
  );
};

const bootstrapAuth = (pathname: string | null) => {
  if (bootstrapComplete) {
    return Promise.resolve(bootstrapPayload);
  }

  if (!needsAuthBootstrap(pathname)) {
    return Promise.resolve(null);
  }

  if (!bootstrapPromise) {
    bootstrapPromise = authApi
      .refreshSession()
      .then((payload) => {
        bootstrapComplete = true;
        bootstrapPayload = payload;
        return payload;
      })
      .catch((error) => {
        if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status || 0)) {
          clearAuthSession();
          bootstrapPayload = null;
          bootstrapComplete = true;
        }
        return null;
      })
      .finally(() => {
        bootstrapPromise = null;
      });
  }

  return bootstrapPromise;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [ownerProfileVerification, setOwnerProfileVerification] =
    useState<OwnerProfileVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  const logoutPromise = useRef<Promise<void> | null>(null);
  const sessionVersion = useRef(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const expired = () => {
      sessionVersion.current += 1;
      initialized.current = true;
      bootstrapComplete = true;
      bootstrapPayload = null;
      clearAuthSession();
      clearActiveRole();
      setUser(null);
      setOwnerProfileVerification(null);
    };
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, expired);
  }, []);

  const applyAuthPayload = useCallback((payload: AuthPayload) => {
    sessionVersion.current += 1;
    initialized.current = true;
    bootstrapComplete = true;
    bootstrapPayload = payload;
    setAuthSession({ accessToken: payload.tokens.accessToken });
    // Before `setUser`, so `/` renders the right home on the first pass.
    initActiveRoleFor(payload.user.approvedRoles, payload.user.profileVerificationStatus);
    setUser(payload.user);
    setOwnerProfileVerification(payload.profileVerification || payload.ownerProfileVerification || null);
  }, []);

  const setOwnerProfileVerificationState = useCallback(
    (verification: OwnerProfileVerification, userPatch?: Partial<User>) => {
      setOwnerProfileVerification(verification);
      setUser((current) =>
        current
          ? {
              ...current,
              ...userPatch,
              profileVerificationStatus: verification.status,
            }
          : current
      );
    },
    []
  );

  const refreshCurrentUser = useCallback(async () => {
    const version = sessionVersion.current;
    const payload = await authApi.me();
    if (version !== sessionVersion.current) return;
    initActiveRoleFor(payload.user.approvedRoles, payload.user.profileVerificationStatus);
    if (bootstrapPayload) bootstrapPayload = { ...bootstrapPayload, ...payload };
    setUser(payload.user);
    setOwnerProfileVerification(payload.profileVerification || payload.ownerProfileVerification || null);
  }, []);

  const logout = useCallback(() => {
    if (logoutPromise.current) return logoutPromise.current;
    setLoggingOut(true);
    logoutPromise.current = (async () => {
      // Keep the session available for retry if revocation/cookie clearing fails.
      await authApi.logout();
      sessionVersion.current += 1;
      initialized.current = true;
      bootstrapComplete = true;
      bootstrapPayload = null;
      clearAuthSession();
      // Otherwise the next user on this browser inherits the previous
      // user's customer/owner mode and signup routing.
      clearActiveRole();
      clearSelectedSignupRole();
      clearPendingAuth();
      setUser(null);
      setOwnerProfileVerification(null);
    })().finally(() => {
      logoutPromise.current = null;
      setLoggingOut(false);
    });
    return logoutPromise.current;
  }, []);

  useEffect(() => {
    // Reapplying the original login payload on navigation would restore stale
    // verification data and overwrite a recently refreshed access token.
    if (initialized.current) return;
    let cancelled = false;

    bootstrapAuth(pathname)
      .then((payload) => {
        if (!cancelled && payload && !initialized.current) {
          applyAuthPayload(payload);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applyAuthPayload, pathname]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ownerProfileVerification,
      loading,
      isAuthenticated: Boolean(user),
      setAuthPayload: applyAuthPayload,
      setOwnerProfileVerificationState,
      refreshCurrentUser,
      logout,
      loggingOut,
    }),
    [
      applyAuthPayload,
      loading,
      logout,
      loggingOut,
      ownerProfileVerification,
      refreshCurrentUser,
      setOwnerProfileVerificationState,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
