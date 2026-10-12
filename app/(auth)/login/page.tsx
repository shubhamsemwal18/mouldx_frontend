"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./Login.module.css";
import { authApi } from "@/app/lib/auth-api";
import { getApiErrorMessage } from "@/app/lib/api";
import { setPendingAuth } from "@/app/lib/pending-auth";
import { useAuth } from "@/app/lib/auth-context";
import { getPostAuthPath, getSafeNextPath } from "@/app/lib/auth-routing";

const REGEX = {
  phone: /^[6-9]\d{9}$/,
};

export default function LoginPage() {
  const router = useRouter();
  const { setAuthPayload } = useAuth();
  const [mode, setMode] = useState<"otp" | "admin">("otp");
  const [phone, setPhone] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const error = phone.trim() === ""
    ? "Phone number is required"
    : !REGEX.phone.test(phone.trim())
      ? "Enter a valid 10-digit phone number"
      : "";

  const isValid = REGEX.phone.test(phone.trim());

  const handlePhoneChange = (value: string) => {
    setPhone(value.replace(/\D/g, "").slice(0, 10));
  };

  const isAdminValid = adminEmail.trim().includes("@") && password.trim().length > 0;

  const handleContinue = async () => {
    setTouched(true);
    if (!isValid) return;

    try {
      setSubmitting(true);
      setServerError("");
      await authApi.requestLoginOtp(phone.trim());
      setPendingAuth({ flow: "login", identifier: phone.trim() });
      router.push("/verify-otp");
    } catch (error) {
      setServerError(getApiErrorMessage(error, "Could not send login OTP"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminLogin = async () => {
    setTouched(true);
    if (!isAdminValid) return;

    try {
      setSubmitting(true);
      setServerError("");
      const payload = await authApi.loginWithPassword({
        identifier: adminEmail.trim(),
        password,
      });

      if (!payload.user.approvedRoles.includes("admin")) {
        setServerError("This account is not an admin account.");
        return;
      }

      setAuthPayload(payload);
      router.replace(getSafeNextPath() || getPostAuthPath(payload));
    } catch (error) {
      setServerError(getApiErrorMessage(error, "Admin login failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
    

      <h1 className={styles.title}>Welcome Back</h1>
      <p className={styles.subtitle}>
        {mode === "otp" ? "Login with your registered phone number" : "Admin login with email and password"}
      </p>

      <div className={styles.form}>
        {mode === "otp" ? (
          <>
            <label className={styles.label} htmlFor="phone">
              Phone Number <span className={styles.required}>*</span>
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              placeholder="98XXXXXX10"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={() => setTouched(true)}
              className={`${styles.input} ${touched && error ? styles.inputError : ""}`}
            />
            {touched && error && <p className={styles.errorText}>{error}</p>}
          </>
        ) : (
          <>
            <label className={styles.label} htmlFor="adminEmail">
              Admin Email <span className={styles.required}>*</span>
            </label>
            <input
              id="adminEmail"
              type="email"
              placeholder="admin@mouldx.in"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              className={`${styles.input} ${touched && !adminEmail.trim().includes("@") ? styles.inputError : ""}`}
            />
            <label className={styles.label} htmlFor="adminPassword">
              Password <span className={styles.required}>*</span>
            </label>
            <input
              id="adminPassword"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched(true)}
              className={`${styles.input} ${touched && !password ? styles.inputError : ""}`}
            />
          </>
        )}
        {serverError && <p className={styles.errorText}>{serverError}</p>}

       <button
  type="button"
  disabled={submitting || (mode === "otp" ? !isValid : !isAdminValid)}
  onClick={mode === "otp" ? handleContinue : handleAdminLogin}
  className={`${styles.loginBtn} btn-primary`}
>
  {submitting ? "Please wait..." : mode === "otp" ? "Continue with OTP" : "Login as Admin"} <span aria-hidden>→</span>
</button>
        <button
          type="button"
          onClick={() => {
            setMode((current) => (current === "otp" ? "admin" : "otp"));
            setTouched(false);
            setServerError("");
          }}
          className={styles.forgotLink}
        >
          {mode === "otp" ? "Login as admin" : "Login with OTP instead"}
        </button>
      </div>

      <p className={styles.signupText}>
        don&apos;t have any account yet ?{" "}
        <Link href="/signup" className={styles.signupLink}>Create one</Link>
      </p>
    </div>
  );
}
