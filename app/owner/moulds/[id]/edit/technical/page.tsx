"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../EditForm.module.css";
import EditTop from "../EditTop";
import { useEditMould } from "../EditMouldProvider";
import { hasErrors, TechnicalNumericKey, validateTechnical } from "../validation";
import { TechnicalForm } from "../types";

const WHOLE_NUMBER_KEYS: string[] = ["cavities", "cycleTime", "coolingTemp"];

interface NumFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error?: string;
  placeholder?: string;
}

function NumField({ label, value, onChange, onBlur, error, placeholder }: NumFieldProps) {
  return (
    <div>
      <label className={styles.fieldLabel}>{label}</label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`${styles.input} ${error ? styles.inputError : ""}`}
      />
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}

export default function EditTechnicalPage() {
  const router = useRouter();
  const { id, technical, setTechnical } = useEditMould();
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const base = `/owner/moulds/${id}/edit`;
  const errors = validateTechnical(technical);

  const update = <K extends keyof TechnicalForm>(key: K, value: TechnicalForm[K]) => {
    setTechnical((prev) => ({ ...prev, [key]: value }));
  };

  const markTouched = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }));

  const handleNumericChange = (key: TechnicalNumericKey, raw: string) => {
    const allowDecimal = !WHOLE_NUMBER_KEYS.includes(key);
    let cleaned = allowDecimal ? raw.replace(/[^0-9.]/g, "") : raw.replace(/\D/g, "");
    if (allowDecimal) {
      const parts = cleaned.split(".");
      if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
    }
    update(key, cleaned);
  };

  const field = (key: TechnicalNumericKey, label: string, placeholder: string) => (
    <NumField
      label={label}
      value={technical[key]}
      onChange={(v) => handleNumericChange(key, v)}
      onBlur={() => markTouched(key)}
      error={touched[key] ? errors[key] : ""}
      placeholder={placeholder}
    />
  );

  const handleNext = () => {
    setTouched(Object.fromEntries(Object.keys(errors).map((k) => [k, true])));
    if (hasErrors(errors)) return;
    router.push(`${base}/general`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <EditTop />

        <h1 className={styles.title}>Mould Details</h1>
        <p className={styles.subtitle}>Technical specifications.</p>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Dimensions (mm)</h2>
          <div className={styles.grid3}>
            {field("length", "Length", "420")}
            {field("breadth", "Breadth", "310")}
            {field("height", "Height", "280")}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.grid2}>
            {field("weight", "Weight (kg)", "185")}
            {field("cavities", "No. of Cavities / Core", "4")}
            {field("cycleTime", "Expected Cycle Time (s)", "28")}
            {field("hourlyProduction", "Estimated Hourly Production", "120")}
            {field("tonnage", "Recommended Tonnage (T)", "220")}
            {field("maxInjectionVolume", "Max. Injection Volume (cm³)", "650")}
          </div>

          <div className={styles.mt}>
            <label className={styles.fieldLabel}>Hot Runner / Cold Runner</label>
            <select
              value={technical.runnerType}
              onChange={(e) => update("runnerType", e.target.value as TechnicalForm["runnerType"])}
              className={styles.select}
            >
              <option value="Hot Runner">Hot Runner</option>
              <option value="Cold Runner">Cold Runner</option>
            </select>
          </div>

          <div className={styles.mt}>{field("coolingTemp", "Recommended Cooling Water Temp (°C)", "18")}</div>

          <div className={styles.mt}>
            <label className={styles.fieldLabel}>Changeable Brand Logo</label>
            <select
              value={technical.changeableLogo}
              onChange={(e) => update("changeableLogo", e.target.value as TechnicalForm["changeableLogo"])}
              className={styles.select}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.ctaBar}>
        <button type="button" onClick={handleNext} className={`${styles.ctaBtn} btn-primary`}>
          Next: General Details <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}