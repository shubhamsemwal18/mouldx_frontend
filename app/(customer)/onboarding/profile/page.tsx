"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./ProfileCreation.module.css";

const REGEX = {
  name: /^[a-zA-Z\s.'-]{2,60}$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  gst: /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/,
  bankAccount: /^\d{9,18}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  upi: /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/,
};

const CUSTOMER_STEPS = ["Profile", "KYC"];

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

export default function CustomerProfileCreationPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const markTouched = (key: string) =>
    setTouched((prev) => ({ ...prev, [key]: true }));

  const errors: Partial<Record<keyof FormState, string>> = {
    name:
      form.name.trim() === ""
        ? "Name is required"
        : !REGEX.name.test(form.name.trim())
          ? "Enter a valid name"
          : "",
    emailPoc:
      form.emailPoc.trim() !== "" && !REGEX.email.test(form.emailPoc.trim())
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
    gstCertificate: !form.gstCertificate ? "GST certificate is required" : "",
    electricityBill: !form.electricityBill
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
    !errors.electricityBill &&
    !errors.bankAccount &&
    !errors.ifsc &&
    !errors.accountHolder &&
    !errors.bankName &&
    !errors.upiId;

  const handleFile = (
    key: "gstCertificate" | "msmeCertificate" | "electricityBill",
    file: File | null,
  ) => {
    update(key, file);
    markTouched(key);
  };

  const handleSubmit = () => {
    const allFields = [...REQUIRED_FIELDS, "gstCertificate", "electricityBill"];
    setTouched(Object.fromEntries(allFields.map((f) => [f, true])));
    if (!isValid) return;
    router.push("/onboarding/review");
  };

  return (
    <div className={styles.page}>
      
      <div className={styles.content}>
        <h1 className={styles.title}>Profile Creation</h1>
        <p className={styles.subtitle}>Step 1 of 2 — KYC details.</p>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Personal Details</h2>

          <Field
            label="Name"
            required
            value={form.name}
            onChange={(v) => update("name", v)}
            onBlur={() => markTouched("name")}
            error={touched.name ? errors.name : ""}
            placeholder="Rohit Sharma"
          />

          <Field
            label="Phone No."
            value={form.phone}
            onChange={() => {}}
            placeholder="+91 98XXXXXX10"
            disabled
          />

          <Field
            label="Email ID – POC"
            value={form.emailPoc}
            onChange={(v) => update("emailPoc", v)}
            onBlur={() => markTouched("emailPoc")}
            error={touched.emailPoc ? errors.emailPoc : ""}
            placeholder="poc@company.com"
          />
        </div>

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
            onChange={(f) => handleFile("gstCertificate", f)}
            error={touched.gstCertificate ? errors.gstCertificate : ""}
          />

          <FileField
            label="MSME Certificate"
            file={form.msmeCertificate}
            onChange={(f) => handleFile("msmeCertificate", f)}
          />

          <FileField
            label="Electricity Bill – last month"
            required
            file={form.electricityBill}
            onChange={(f) => handleFile("electricityBill", f)}
            error={touched.electricityBill ? errors.electricityBill : ""}
          />
        </div>

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

      <div className={styles.ctaBar}>
        <button
          type="button"
          onClick={handleSubmit}
          className={`${styles.ctaBtn} btn-primary`}
        >
          Submit for Approval
        </button>
      </div>
    </div>
  );
}

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
  onChange,
  error,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  onChange: (f: File | null) => void;
  error?: string;
}) {
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