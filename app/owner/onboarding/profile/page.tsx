"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./ProfileCreation.module.css";
import Stepper from "@/app/components/Stepper/Stepper";
import { useAuth } from "@/app/lib/auth-context";
import { getApiErrorMessage } from "@/app/lib/api";
import { uploadPrivateFile } from "@/app/lib/upload-api";
import { userApi } from "@/app/lib/user-api";
import type { MediaRef } from "@/app/lib/types";

const REGEX = {
  name: /^[a-zA-Z\s.'-]{2,60}$/,
  phone: /^[6-9]\d{9}$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  gst: /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/,
  bankAccount: /^\d{9,18}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  upi: /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/,
};

interface FormState {
  name: string;
  phone: string;
  emailPoc: string;
  pan: string;
  firmEmail: string;
  firmName: string;
  address: string;
  gstNo: string;
  gstCertificate: File | null;
  msmeCertificate: File | null;
  electricityBill: File | null;
  bankAccount: string;
  ifsc: string;
  accountHolder: string;
  bankName: string;
  upiId: string;
}

type DocumentKey = "gstCertificate" | "msmeCertificate" | "electricityBill";

type ExistingDocuments = Partial<Record<DocumentKey, MediaRef>>;

const INITIAL_STATE: FormState = {
  name: "",
  phone: "",
  emailPoc: "",
  pan: "",
  firmEmail: "",
  firmName: "",
  address: "",
  gstNo: "",
  gstCertificate: null,
  msmeCertificate: null,
  electricityBill: null,
  bankAccount: "",
  ifsc: "",
  accountHolder: "",
  bankName: "",
  upiId: "",
};

// Which text fields are required — used both for validation and the "*" marker
const REQUIRED_FIELDS: (keyof FormState)[] = [
  "name",
  "pan",
  "firmEmail",
  "firmName",
  "address",
  "gstNo",
  "bankAccount",
  "ifsc",
  "accountHolder",
  "bankName",
];

export default function ProfileCreationPage() {
  const router = useRouter();
  const {
    user,
    ownerProfileVerification,
    loading: authLoading,
    refreshCurrentUser,
    setOwnerProfileVerificationState,
  } = useAuth();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [existingDocuments, setExistingDocuments] = useState<ExistingDocuments>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const prefilledVerificationId = useRef<string | null>(null);

  const effectiveName = form.name || user?.fullName || "";
  const effectivePhone = user?.phone || form.phone;
  const effectiveEmailPoc = form.emailPoc || user?.email || "";

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/owner/onboarding/profile")}`);
      return;
    }
    if (ownerProfileVerification?.status === "in_review") {
      router.replace("/owner/onboarding/review");
    }
    if (ownerProfileVerification?.status === "approved") {
      router.replace("/owner/onboarding/approved");
    }
  }, [authLoading, ownerProfileVerification?.status, router, user]);

  useEffect(() => {
    if (
      !ownerProfileVerification ||
      ownerProfileVerification.status !== "rejected" ||
      prefilledVerificationId.current === ownerProfileVerification._id
    ) {
      return;
    }

    const personal = ownerProfileVerification.personalDetails;
    const firm = ownerProfileVerification.firmDetails;
    const payout = ownerProfileVerification.payoutDetails;

    setForm({
      name: user?.fullName || "",
      phone: user?.phone || "",
      emailPoc: user?.email || "",
      pan: personal?.panNumber || "",
      firmEmail: firm?.email || "",
      firmName: firm?.name || "",
      address: firm?.address || "",
      gstNo: firm?.gstNumber || "",
      gstCertificate: null,
      msmeCertificate: null,
      electricityBill: null,
      bankAccount: payout?.bankAccountNumber || "",
      ifsc: payout?.ifscCode || "",
      accountHolder: payout?.accountHolderName || "",
      bankName: payout?.bankName || "",
      upiId: payout?.upiId || "",
    });
    setExistingDocuments({
      gstCertificate: firm?.gstCertificate,
      msmeCertificate: firm?.msmeCertificate,
      electricityBill: firm?.electricityBill,
    });
    prefilledVerificationId.current = ownerProfileVerification._id;
  }, [ownerProfileVerification, user]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const markTouched = (key: string) =>
    setTouched((prev) => ({ ...prev, [key]: true }));

  const errors: Partial<Record<keyof FormState, string>> = {
    name:
      effectiveName.trim() === ""
        ? "Name is required"
        : !REGEX.name.test(effectiveName.trim())
          ? "Enter a valid name"
          : "",
    emailPoc:
      effectiveEmailPoc.trim() !== "" && !REGEX.email.test(effectiveEmailPoc.trim())
        ? "Enter a valid email"
        : "",
    pan:
      form.pan.trim() === ""
        ? "PAN is required"
        : !REGEX.pan.test(form.pan.trim().toUpperCase())
          ? "Format: ABCDE1234F"
          : "",
    firmEmail:
      form.firmEmail.trim() === ""
        ? "Email is required"
        : !REGEX.email.test(form.firmEmail.trim())
          ? "Enter a valid email"
          : "",
    firmName: form.firmName.trim() === "" ? "Firm name is required" : "",
    address: form.address.trim() === "" ? "Address is required" : "",
    gstNo:
      form.gstNo.trim() === ""
        ? "GST number is required"
        : !REGEX.gst.test(form.gstNo.trim().toUpperCase())
          ? "Format: 22ABCDE1234F1Z5"
          : "",
    gstCertificate: !form.gstCertificate && !existingDocuments.gstCertificate ? "GST certificate is required" : "",
    msmeCertificate: !form.msmeCertificate && !existingDocuments.msmeCertificate ? "MSME certificate is required" : "",
    electricityBill: !form.electricityBill && !existingDocuments.electricityBill
      ? "Last month's electricity bill is required"
      : "",
    bankAccount:
      form.bankAccount.trim() === ""
        ? "Bank A/C No. is required"
        : !REGEX.bankAccount.test(form.bankAccount.trim())
          ? "Enter a valid account number"
          : "",
    ifsc:
      form.ifsc.trim() === ""
        ? "IFSC code is required"
        : !REGEX.ifsc.test(form.ifsc.trim().toUpperCase())
          ? "Format: SBIN0001234"
          : "",
    accountHolder:
      form.accountHolder.trim() === "" ? "Account holder name is required" : "",
    bankName: form.bankName.trim() === "" ? "Bank name is required" : "",
    upiId:
      form.upiId.trim() !== "" && !REGEX.upi.test(form.upiId.trim())
        ? "Enter a valid UPI ID"
        : "",
  };

  const isValid =
    !errors.name &&
    !errors.emailPoc &&
    !errors.pan &&
    !errors.firmEmail &&
    !errors.firmName &&
    !errors.address &&
    !errors.gstNo &&
    !errors.gstCertificate &&
    !errors.msmeCertificate &&
    !errors.electricityBill &&
    !errors.bankAccount &&
    !errors.ifsc &&
    !errors.accountHolder &&
    !errors.bankName &&
    !errors.upiId;

  const handleFile = (key: DocumentKey, file: File | null) => {
    update(key, file);
    if (file) {
      setExistingDocuments((prev) => ({ ...prev, [key]: undefined }));
    }
    markTouched(key);
  };

  const resolveDocument = async (key: DocumentKey) => {
    const file = form[key];
    if (file) {
      return uploadPrivateFile(file, "kyc");
    }

    const existing = existingDocuments[key];
    if (existing) {
      return existing;
    }

    throw new Error("Required document is missing");
  };

  const handleSubmit = async () => {
    const allFields = [...REQUIRED_FIELDS, "gstCertificate", "msmeCertificate", "electricityBill"];
    setTouched(Object.fromEntries(allFields.map((f) => [f, true])));
    if (!isValid) return;

    if (
      (!form.gstCertificate && !existingDocuments.gstCertificate) ||
      (!form.msmeCertificate && !existingDocuments.msmeCertificate) ||
      (!form.electricityBill && !existingDocuments.electricityBill)
    ) {
      return;
    }

    try {
      setSubmitting(true);
      setServerError("");

      const [gstCertificate, msmeCertificate, electricityBill] = await Promise.all([
        resolveDocument("gstCertificate"),
        resolveDocument("msmeCertificate"),
        resolveDocument("electricityBill"),
      ]);

      const result = await userApi.submitProfileVerification({
        userDetails: {
          fullName: effectiveName.trim(),
          email: effectiveEmailPoc.trim() || undefined,
        },
        personalDetails: {
          panNumber: form.pan.trim().toUpperCase(),
        },
        firmDetails: {
          name: form.firmName.trim(),
          email: form.firmEmail.trim().toLowerCase(),
          address: form.address.trim(),
          gstNumber: form.gstNo.trim().toUpperCase(),
          gstCertificate,
          msmeCertificate,
          electricityBill,
        },
        payoutDetails: {
          bankAccountNumber: form.bankAccount.trim(),
          ifscCode: form.ifsc.trim().toUpperCase(),
          accountHolderName: form.accountHolder.trim(),
          bankName: form.bankName.trim(),
          upiId: form.upiId.trim() || undefined,
        },
      });

      setOwnerProfileVerificationState(
        result.profileVerification || result.ownerProfileVerification,
        result.user
      );
      router.replace("/owner/onboarding/review");
      void refreshCurrentUser();
    } catch (error) {
      setServerError(getApiErrorMessage(error, "Could not submit profile for approval"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* ---------- Header ---------- */}
      <header className={styles.header}>
        <Link
          href="/owner/onboarding"
          className={styles.iconBtn}
          aria-label="Go back"
        >
          ‹
        </Link>
        <span className={styles.brand}>
          Mould<span className={styles.brandAccent}>X</span>
        </span>
        <button type="button" className={styles.iconBtn} aria-label="Help">
          ?
        </button>
      </header>

      <div className={styles.content}>
        <h1 className="text-[26px] font-extrabold text-gray-900">Profile Creation</h1>
        <p className="mt-1 text-sm text-gray-400">Step 1 of 4 — KYC details.</p>
        <Stepper current={1} />

        {/* ---------- Progress bar ---------- */}
        <div className={styles.progressRow}>
          <span
            className={`${styles.progressBar} ${styles.progressBarActive}`}
          />
          <span className={styles.progressBar} />
          <span className={styles.progressBar} />
          <span className={styles.progressBar} />
        </div>

        {/* ---------- Personal Details ---------- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Personal Details</h2>

          <Field
            label="Name"
            required
            value={effectiveName}
            onChange={(v) => update("name", v)}
            onBlur={() => markTouched("name")}
            error={touched.name ? errors.name : ""}
            placeholder="Rohit Sharma"
          />

          <Field
            label="Phone No."
            value={effectivePhone}
            onChange={() => {}}
            placeholder="+91 98XXXXXX10"
            disabled
          />

          <Field
            label="Email ID – POC"
            value={effectiveEmailPoc}
            onChange={(v) => update("emailPoc", v)}
            onBlur={() => markTouched("emailPoc")}
            error={touched.emailPoc ? errors.emailPoc : ""}
            placeholder="poc@company.com"
          />
        </div>

        {/* ---------- Firm Details ---------- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Firm Details</h2>

          <Field
            label="PAN Card"
            required
            value={form.pan}
            onChange={(v) => update("pan", v.toUpperCase().slice(0, 10))}
            onBlur={() => markTouched("pan")}
            error={touched.pan ? errors.pan : ""}
            placeholder="ABCDE1234F"
          />

          <Field
            label="Email ID"
            required
            value={form.firmEmail}
            onChange={(v) => update("firmEmail", v)}
            onBlur={() => markTouched("firmEmail")}
            error={touched.firmEmail ? errors.firmEmail : ""}
            placeholder="firm@company.com"
          />

          <Field
            label="Firm Name"
            required
            value={form.firmName}
            onChange={(v) => update("firmName", v)}
            onBlur={() => markTouched("firmName")}
            error={touched.firmName ? errors.firmName : ""}
            placeholder="Sharma Industries"
          />

          <TextAreaField
            label="Address"
            required
            hint="Address will remain same for mould pickup/drop."
            value={form.address}
            onChange={(v) => update("address", v)}
            onBlur={() => markTouched("address")}
            error={touched.address ? errors.address : ""}
            placeholder="Plot no., street, city, state, pincode"
          />

          <Field
            label="GST No."
            required
            value={form.gstNo}
            onChange={(v) => update("gstNo", v.toUpperCase().slice(0, 15))}
            onBlur={() => markTouched("gstNo")}
            error={touched.gstNo ? errors.gstNo : ""}
            placeholder="27ABCDE1234F1Z5"
          />

          <FileField
            label="GST Certificate"
            required
            file={form.gstCertificate}
            existingFile={existingDocuments.gstCertificate}
            onChange={(f) => handleFile("gstCertificate", f)}
            error={touched.gstCertificate ? errors.gstCertificate : ""}
          />

          <FileField
            label="MSME Certificate"
            required
            file={form.msmeCertificate}
            existingFile={existingDocuments.msmeCertificate}
            onChange={(f) => handleFile("msmeCertificate", f)}
            error={touched.msmeCertificate ? errors.msmeCertificate : ""}
          />

          <FileField
            label="Electricity Bill – last month"
            required
            file={form.electricityBill}
            existingFile={existingDocuments.electricityBill}
            onChange={(f) => handleFile("electricityBill", f)}
            error={touched.electricityBill ? errors.electricityBill : ""}
          />
        </div>

        {/* ---------- Payout Details ---------- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Payout Details</h2>

          <Field
            label="Bank A/C No."
            required
            value={form.bankAccount}
            onChange={(v) =>
              update("bankAccount", v.replace(/\D/g, "").slice(0, 18))
            }
            onBlur={() => markTouched("bankAccount")}
            error={touched.bankAccount ? errors.bankAccount : ""}
            placeholder="XXXXXXXXXXXX"
          />

          <Field
            label="IFSC Code"
            required
            value={form.ifsc}
            onChange={(v) => update("ifsc", v.toUpperCase().slice(0, 11))}
            onBlur={() => markTouched("ifsc")}
            error={touched.ifsc ? errors.ifsc : ""}
            placeholder="SBIN0001234"
          />

          <Field
            label="Account Holder Name"
            required
            value={form.accountHolder}
            onChange={(v) => update("accountHolder", v)}
            onBlur={() => markTouched("accountHolder")}
            error={touched.accountHolder ? errors.accountHolder : ""}
            placeholder="As per bank records"
          />

          <Field
            label="Bank Name"
            required
            value={form.bankName}
            onChange={(v) => update("bankName", v)}
            onBlur={() => markTouched("bankName")}
            error={touched.bankName ? errors.bankName : ""}
            placeholder="State Bank of India"
          />

          <Field
            label="UPI ID"
            value={form.upiId}
            onChange={(v) => update("upiId", v)}
            onBlur={() => markTouched("upiId")}
            error={touched.upiId ? errors.upiId : ""}
            placeholder="name@upi (optional)"
          />
        </div>
      </div>

      {/* ---------- Sticky submit ---------- */}
      <div className={styles.ctaBar}>
        {serverError && <p className={styles.errorText}>{serverError}</p>}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className={`${styles.ctaBtn} btn-primary`}
        >
          {submitting ? "Uploading & Submitting..." : "Submit for Approval"}
        </button>
      </div>
    </div>
  );
}

/* ---------- Reusable field components ---------- */

function Field({
  label,
  required,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  disabled,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>
        {label} {required && <span className={styles.required}>*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`${styles.input} ${error ? styles.inputError : ""} ${disabled ? styles.inputDisabled : ""}`}
      />
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}

function TextAreaField({
  label,
  required,
  hint,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>
        {label} {required && <span className={styles.required}>*</span>}
      </label>
      {hint && <p className={styles.fieldHint}>{hint}</p>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={3}
        className={`${styles.textarea} ${error ? styles.inputError : ""}`}
      />
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}

function FileField({
  label,
  required,
  file,
  existingFile,
  onChange,
  error,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  existingFile?: MediaRef;
  onChange: (f: File | null) => void;
  error?: string;
}) {
  const existingFileName = existingFile?.key.split("/").pop();

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>
        {label} {required && <span className={styles.required}>*</span>}
      </label>
      <label
        className={`${styles.uploadBox} ${error ? styles.uploadBoxError : ""}`}
      >
        {file ? (
          <span className={styles.uploadFileName}>📎 {file.name}</span>
        ) : existingFile ? (
          <span className={styles.uploadFileName}>
            Existing file kept{existingFileName ? `: ${existingFileName}` : ""}
          </span>
        ) : (
          <span className={styles.uploadPlaceholder}>
            + Upload {label} · PDF/Image
          </span>
        )}
        <input
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className={styles.uploadInput}
        />
      </label>
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
