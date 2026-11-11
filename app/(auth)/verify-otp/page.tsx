"use client";

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./VerifyOtp.module.css";
import { authApi } from "@/app/lib/auth-api";
import { getApiErrorMessage } from "@/app/lib/api";
import { clearPendingAuth, getPendingAuth } from "@/app/lib/pending-auth";
import { useAuth } from "@/app/lib/auth-context";
import { getPostAuthPath } from "@/app/lib/auth-routing";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 28;

type OtpCredential = Credential & { code?: string };

export default function VerifyOtpPage() {
  const router = useRouter();
  const { setAuthPayload } = useAuth();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timeLeft, setTimeLeft] = useState(RESEND_SECONDS);
  const [serverError, setServerError] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Chrome on Android: read the code from an incoming SMS (Web OTP API).
  useEffect(() => {
    if (typeof window === "undefined" || !("OTPCredential" in window)) return;
    const controller = new AbortController();

    navigator.credentials
      .get({
        otp: { transport: ["sms"] },
        signal: controller.signal,
      } as CredentialRequestOptions & { otp: { transport: string[] } })
      .then((credential) => {
        const code = ((credential as OtpCredential | null)?.code || "")
          .replace(/\D/g, "")
          .slice(0, OTP_LENGTH);
        if (!code) return;
        const next = Array(OTP_LENGTH).fill("");
        code.split("").forEach((char, i) => (next[i] = char));
        setOtp(next);
        setOtpError(false);
        inputRefs.current[Math.min(code.length, OTP_LENGTH - 1)]?.focus();
      })
      .catch(() => {
        /* aborted or not available: manual entry still works */
      });

    return () => controller.abort();
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleChange = (index: number, value: string) => {
    setOtpError(false);
    const digits = value.replace(/\D/g, "");

    // Autofill (iOS / Android keyboard) can drop the whole code into one box.
    if (digits.length > 1) {
      const next = [...otp];
      digits
        .slice(0, OTP_LENGTH - index)
        .split("")
        .forEach((char, i) => (next[index + i] = char));
      setOtp(next);
      inputRefs.current[Math.min(index + digits.length, OTP_LENGTH - 1)]?.focus();
      return;
    }

    const digit = digits.slice(-1);
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
    setOtpError(false);
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
      setOtpError(false);
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
      setOtpError(false);
      const code = otp.join("");
      const payload =
        pending.flow === "signup"
          ? await authApi.verifySignupOtp({ phone: pending.identifier, otp: code })
          : await authApi.verifyLoginOtp({ identifier: pending.identifier, otp: code });

      setAuthPayload(payload);
      clearPendingAuth();
      const landing = getPostAuthPath(payload);
      router.replace(landing);
    } catch (error) {
      setOtpError(true);
      setServerError(getApiErrorMessage(error, "OTP verification failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
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
              aria-label={`OTP digit ${i + 1}`}
              aria-invalid={otpError}
              inputMode="numeric"
              autoComplete="one-time-code"
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`${styles.otpBox} ${digit ? styles.otpBoxFilled : ""} ${otpError ? styles.otpBoxError : ""}`}
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
        {serverError && (
          <p
            className={`${styles.resendText} ${otpError ? styles.errorText : ""}`}
            role="alert"
          >
            {serverError}
          </p>
        )}

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
    </div>
  );
}