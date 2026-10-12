"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { authApi } from "@/app/lib/auth-api";
import { clearAuthSession, hasAuthSessionHint, setAuthSession } from "@/app/lib/auth-storage";
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
        bootstrapPayload = payload;
        return payload;
      })
      .catch(() => {
        clearAuthSession();
        bootstrapPayload = null;
        return null;
      })
      .finally(() => {
        bootstrapComplete = true;
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

  const applyAuthPayload = useCallback((payload: AuthPayload) => {
    bootstrapComplete = true;
    bootstrapPayload = payload;
    setAuthSession({ accessToken: payload.tokens.accessToken });
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
    const payload = await authApi.me();
    setUser(payload.user);
    setOwnerProfileVerification(payload.profileVerification || payload.ownerProfileVerification || null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      bootstrapComplete = true;
      bootstrapPayload = null;
      clearAuthSession();
      setUser(null);
      setOwnerProfileVerification(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    bootstrapAuth(pathname)
      .then((payload) => {
        if (!cancelled && payload) {
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
    }),
    [
      applyAuthPayload,
      loading,
      logout,
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
