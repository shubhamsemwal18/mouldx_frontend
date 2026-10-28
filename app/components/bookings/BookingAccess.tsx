"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/app/lib/auth-context";
import { getUserLandingPath } from "@/app/lib/auth-routing";
import styles from "./Bookings.module.css";

export default function BookingAccess({ next, children }: { next: string; children: ReactNode }) {
  const { user, loading, refreshCurrentUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  if (loading) return <div className={styles.state} role="status">Checking your account...</div>;
  if (!user) return <div className={styles.state}><h1>Sign in to book a product</h1><Link className="btn-primary" href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link><Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link><Link href="/explore">Keep browsing</Link></div>;
  if (user.approvedRoles.includes("admin")) return <div className={styles.state}><h1>Use a customer account to book</h1><Link href="/admin/bookings">Booking approvals</Link></div>;
  if (user.isBlocked || user.profileVerificationStatus !== "approved" || !user.phoneVerifiedAt || !user.approvedRoles.includes("customer")) return <div className={styles.state}><h1>Profile approval required</h1><p>Your profile must be verified before requesting a booking.</p><Link className="btn-primary" href={getUserLandingPath(user)}>View verification status</Link><button disabled={checking} onClick={async () => { setChecking(true); setError(""); try { await refreshCurrentUser(); } catch { setError("Could not refresh verification status."); } finally { setChecking(false); } }}>{checking ? "Checking..." : "Refresh verification status"}</button>{error && <p role="alert">{error}</p>}<Link href="/">Home</Link></div>;
  return children;
}
