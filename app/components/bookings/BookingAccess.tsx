"use client";
import Link from "next/link";
import { Fragment, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  LogIn,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { getUserLandingPath } from "@/app/lib/auth-routing";
import styles from "./Bookings.module.css";

const NO_LINE = { textDecoration: "none" } as const;
const WHITE_TEXT = { textDecoration: "none", color: "#ffffff" } as const;
const BLUE_TEXT = { textDecoration: "none", color: "#2563eb" } as const;
const GREY_TEXT = { textDecoration: "none", color: "#6b7280" } as const;

const STEPS = [
  { label: "Sign in", Icon: LogIn },
  { label: "Pick dates", Icon: CalendarDays },
  { label: "Request", Icon: ClipboardCheck },
];

function SignInPrompt({ next }: { next: string }) {
  const encodedNext = encodeURIComponent(next);

  return (
    <div className="mx-auto flex min-h-[75vh] w-full max-w-md items-center px-4 py-6 sm:py-10">
      <div className="w-full overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-[0_10px_40px_-12px_rgba(17,24,39,0.12)]">
        {/* Hero */}
        <div className="relative overflow-hidden bg-[#2563eb] px-6 pb-8 pt-6 text-white sm:px-8">
          

          <Link
            href="/"
            style={WHITE_TEXT}
            className="relative inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white no-underline backdrop-blur-sm transition hover:bg-white/25 hover:text-white hover:no-underline"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to home
          </Link>

          <h1 className="relative m-0 mt-6 text-[26px] font-extrabold leading-tight tracking-tight sm:text-[28px]">
            Almost there.
            <br />
            Sign in to book.
          </h1>
          <p className="relative m-0 mt-2 max-w-[17rem] text-[14px] leading-relaxed text-blue-100">
            Log in to choose your dates and send a booking request to the host.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
          {/* Progress */}
          <ol
            className="m-0 flex list-none items-start p-0"
            aria-label="Booking steps"
          >
            {STEPS.map(({ label, Icon }, index) => (
              <Fragment key={label}>
                <li
                  className="flex w-[72px] flex-shrink-0 flex-col items-center gap-2 text-center"
                  aria-current={index === 0 ? "step" : undefined}
                >
                  <span
                    className={
                      index === 0
                        ? "flex h-10 w-10 items-center justify-center rounded-full bg-[#2563eb] text-white ring-4 ring-[#dbeafe]"
                        : "flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e7eb] bg-[#f6f7f9] text-[#9ca3af]"
                    }
                  >
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span
                    className={
                      index === 0
                        ? "text-[12px] font-bold text-[#111827]"
                        : "text-[12px] font-semibold text-[#9ca3af]"
                    }
                  >
                    {label}
                  </span>
                </li>
                {index < STEPS.length - 1 && (
                  <li
                    aria-hidden="true"
                    className="mt-5 h-px flex-1 border-t border-dashed border-[#d1d5db]"
                  />
                )}
              </Fragment>
            ))}
          </ol>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/login?next=${encodedNext}`}
              style={WHITE_TEXT}
              className="group inline-flex w-fit items-center gap-2 rounded-full bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white no-underline transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
            >
              Log in
              <ArrowRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <Link
              href={`/signup?next=${encodedNext}`}
              style={BLUE_TEXT}
              className="inline-flex w-fit items-center gap-2 rounded-full bg-[#eff6ff] px-6 py-3 text-sm font-semibold text-[#2563eb] no-underline transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#dbeafe]"
            >
              Create account
            </Link>
          </div>

          <div className="mt-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-[#eef0f2]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]">
              or
            </span>
            <span className="h-px flex-1 bg-[#eef0f2]" />
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/"
              style={GREY_TEXT}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6b7280] no-underline transition-colors hover:opacity-80"
            >
              Continue browsing
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingAccess({
  next,
  children,
}: {
  next: string;
  children: ReactNode;
}) {
  const { user, loading, refreshCurrentUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  if (loading)
    return (
      <div className={styles.state} role="status">
        Checking your account...
      </div>
    );
  if (!user) return <SignInPrompt next={next} />;
  if (user.approvedRoles.includes("admin"))
    return (
      <div className={styles.state}>
        <h1>Use a customer account to book</h1>
        <Link href="/admin/bookings">Booking approvals</Link>
      </div>
    );
  if (
    user.isBlocked ||
    user.profileVerificationStatus !== "approved" ||
    !user.phoneVerifiedAt ||
    !user.approvedRoles.includes("customer")
  )
    return (
      <div className={styles.state}>
        <h1>Profile approval required</h1>
        <p>Your profile must be verified before requesting a booking.</p>
        <Link className="btn-primary" href={getUserLandingPath(user)}>
          View verification status
        </Link>
        <button
          disabled={checking}
          onClick={async () => {
            setChecking(true);
            setError("");
            try {
              await refreshCurrentUser();
            } catch {
              setError("Could not refresh verification status.");
            } finally {
              setChecking(false);
            }
          }}
        >
          {checking ? "Checking..." : "Refresh verification status"}
        </button>
        {error && <p role="alert">{error}</p>}
        <Link href="/">Home</Link>
      </div>
    );
  return children;
}
