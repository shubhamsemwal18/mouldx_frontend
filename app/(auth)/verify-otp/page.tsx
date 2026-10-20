"use client";

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./VerifyOtp.module.css";
import { authApi } from "@/app/lib/auth-api";
import { getApiErrorMessage } from "@/app/lib/api";
import { clearPendingAuth, getPendingAuth } from "@/app/lib/pending-auth";
import { useAuth } from "@/app/lib/auth-context";
import { getPostAuthPath, getSafeNextPath } from "@/app/lib/auth-routing";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 28;

export default function VerifyOtpPage() {
  const router = useRouter();
  const { setAuthPayload } = useAuth();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timeLeft, setTimeLeft] = useState(RESEND_SECONDS);
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((char, i) => (next[i] = char));
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleResend = async () => {
    if (timeLeft > 0) return;
    const pending = getPendingAuth();
    if (!pending) {
      setServerError("OTP session expired. Please start again.");
      return;
    }

    try {
      setServerError("");
      setTimeLeft(RESEND_SECONDS);
      if (pending.flow === "signup") {
        await authApi.resendSignupOtp(pending.identifier);
      } else {
        await authApi.requestLoginOtp(pending.identifier);
      }
    } catch (error) {
      setServerError(getApiErrorMessage(error, "Could not resend OTP"));
    }
  };

  const isComplete = otp.every((d) => d !== "");

const handleVerify = async () => {
  if (!isComplete) return;
  const pending = getPendingAuth();
  if (!pending) {
    setServerError("OTP session expired. Please start again.");
    router.replace("/signup");
    return;
  }

  try {
    setSubmitting(true);
    setServerError("");
    const code = otp.join("");
    const payload =
      pending.flow === "signup"
        ? await authApi.verifySignupOtp({ phone: pending.identifier, otp: code })
        : await authApi.verifyLoginOtp({ identifier: pending.identifier, otp: code });

      setAuthPayload(payload);
      clearPendingAuth();
      router.replace(getSafeNextPath() || getPostAuthPath(payload, pending.role));
  } catch (error) {
    setServerError(getApiErrorMessage(error, "OTP verification failed"));
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.iconBtn} onClick={() => router.back()} aria-label="Go back">
          ‹
        </button>
        <span className={styles.brand}>
          Mould<span className={styles.brandAccent}>X</span>
        </span>
        <button className={styles.iconBtn} aria-label="Help">
          ?
        </button>
      </div>

      <h1 className={styles.title}>Verify OTP</h1>
      <p className={styles.subtitle}>
        Enter the 6-digit code sent to your registered phone.
      </p>

      <div className={styles.card}>
        <label className={styles.label}>
          OTP <span className={styles.required}>*</span>
        </label>

        <div className={styles.otpRow} onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`${styles.otpBox} ${digit ? styles.otpBoxFilled : ""}`}
            />
          ))}
        </div>

        <button
          type="button"
          disabled={!isComplete || submitting}
          onClick={handleVerify}
          className={`${styles.verifyBtn} btn-primary`}
        >
          {submitting ? "Verifying..." : "Verify & Continue"}
        </button>
        {serverError && <p className={styles.resendText}>{serverError}</p>}

        <p className={styles.resendText}>
          {timeLeft > 0 ? (
            <>Resend OTP in <span className={styles.timer}>{formatTime(timeLeft)}</span></>
          ) : (
            <button type="button" onClick={handleResend} className={styles.resendBtn}>
              Resend OTP
            </button>
          )}
        </p>
      </div>

      <div className={styles.tipBox}>
        <span className={styles.tipIcon} aria-hidden>i</span>
        <div>
          <p className={styles.tipTitle}>Tip</p>
          <p className={styles.tipText}>OTP auto-fills from SMS when detected.</p>
        </div>
      </div>
    </div>
  );
}
