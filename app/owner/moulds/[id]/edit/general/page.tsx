"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../EditForm.module.css";
import EditTop from "../EditTop";
import { useEditMould } from "../EditMouldProvider";
import { CONDITIONS, ELIGIBILITY_OPTIONS, MOULD_TYPES } from "../constants";
import { hasErrors, validateGeneral } from "../validation";
import { GeneralForm } from "../types";

export default function EditGeneralPage() {
  const router = useRouter();
  const { id, general, setGeneral } = useEditMould();
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const base = `/owner/moulds/${id}/edit`;
  const errors = validateGeneral(general);

  const update = <K extends keyof GeneralForm>(key: K, value: GeneralForm[K]) => {
    setGeneral((prev) => ({ ...prev, [key]: value }));
  };

  const markTouched = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }));

  const handleNumericChange = (key: "actualValue" | "perDayCharges", raw: string) => {
    let cleaned = raw.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
    update(key, cleaned);
  };

  const showError = (key: keyof typeof errors) => touched[key] && errors[key];

  const handleNext = () => {
    setTouched(Object.fromEntries(Object.keys(errors).map((k) => [k, true])));
    if (hasErrors(errors)) return;
    router.push(`${base}/product`);
  };

  const invoiceName = general.invoice?.name ?? general.existingInvoiceName;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <EditTop backHref={`${base}/technical`} backLabel="Technical details" />

        <h1 className={styles.title}>Mould Details</h1>
        <p className={styles.subtitle}>General, commercial &amp; eligibility.</p>
        <div className={styles.card}>
          <label className={styles.fieldLabel}>Mould Name / ID</label>
          <input
            type="text"
            value={general.mouldNameOrId}
            onChange={(e) => update("mouldNameOrId", e.target.value)}
            onBlur={() => markTouched("mouldNameOrId")}
            placeholder="Bottle Cap Mould · MX-000123"
            className={`${styles.input} ${showError("mouldNameOrId") ? styles.inputError : ""}`}
          />
          {showError("mouldNameOrId") && <p className={styles.errorText}>{errors.mouldNameOrId}</p>}

          <div className={`${styles.mt} ${styles.grid2}`}>
            <div>
              <label className={styles.fieldLabel}>Type</label>
              <select
                value={general.mouldType}
                onChange={(e) => update("mouldType", e.target.value)}
                className={styles.select}
              >
                {MOULD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={styles.fieldLabel}>Condition</label>
              <select
                value={general.condition}
                onChange={(e) => update("condition", e.target.value)}
                className={styles.select}
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={`${styles.mt} ${styles.grid2}`}>
            <div>
              <label className={styles.fieldLabel}>Year</label>
              <input
                type="text"
                inputMode="numeric"
                value={general.year}
                onChange={(e) => update("year", e.target.value.replace(/\D/g, "").slice(0, 4))}
                onBlur={() => markTouched("year")}
                placeholder="2022"
                className={`${styles.input} ${showError("year") ? styles.inputError : ""}`}
              />
              {showError("year") && <p className={styles.errorText}>{errors.year}</p>}
            </div>
            <div>
              <label className={styles.fieldLabel}>Manufacturer</label>
              <input
                type="text"
                value={general.manufacturer}
                onChange={(e) => update("manufacturer", e.target.value)}
                onBlur={() => markTouched("manufacturer")}
                placeholder="Precision Ltd."
                className={`${styles.input} ${showError("manufacturer") ? styles.inputError : ""}`}
              />
              {showError("manufacturer") && <p className={styles.errorText}>{errors.manufacturer}</p>}
            </div>
          </div>

          <div className={styles.mt}>
            <label className={`${styles.uploadBox} ${showError("invoice") ? styles.uploadBoxError : ""}`}>
              {invoiceName ? (
                <span className={styles.uploadFileName}>
                  📎 {invoiceName}
                  <span className={styles.uploadHint}> · tap to replace</span>
                </span>
              ) : (
                <span className={styles.uploadPlaceholder}>+ Upload Mould Invoice</span>
              )}
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => {
                  update("invoice", e.target.files?.[0] ?? null);
                  markTouched("invoice");
                }}
                className={styles.uploadInput}
              />
            </label>
            {showError("invoice") && <p className={styles.errorText}>{errors.invoice}</p>}
          </div>

          <div className={styles.mt}>
            <label className={styles.fieldLabel}>Mould Actual Value (₹)</label>
            <input
              type="text"
              inputMode="decimal"
              value={general.actualValue}
              onChange={(e) => handleNumericChange("actualValue", e.target.value)}
              onBlur={() => markTouched("actualValue")}
              placeholder="450000"
              className={`${styles.input} ${showError("actualValue") ? styles.inputError : ""}`}
            />
            {showError("actualValue") && <p className={styles.errorText}>{errors.actualValue}</p>}
          </div>

          <div className={styles.mt}>
            <label className={styles.fieldLabel}>Set of Moulds Involved</label>
            <input
              type="text"
              value={general.setOfMouldsInvolved}
              onChange={(e) => update("setOfMouldsInvolved", e.target.value)}
              onBlur={() => markTouched("setOfMouldsInvolved")}
              placeholder="e.g. Single mould / Cap + Body set"
              className={`${styles.input} ${showError("setOfMouldsInvolved") ? styles.inputError : ""}`}
            />
            {showError("setOfMouldsInvolved") && (
              <p className={styles.errorText}>{errors.setOfMouldsInvolved}</p>
            )}
          </div>

          <div className={styles.mt}>
            <label className={styles.fieldLabel}>Sales / State Eligibility</label>
            <select
              value={general.salesStateEligibility}
              onChange={(e) => update("salesStateEligibility", e.target.value)}
              className={styles.select}
            >
              {ELIGIBILITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.rentalCard}>
          <span className={styles.rentalPill}>RENTAL</span>
          <div className={styles.rentalPriceRow}>
            <span className={styles.rentalPrice}>₹{general.perDayCharges || "0"}</span>
            <span className={styles.rentalPeriod}>/ day</span>
          </div>
          <p className={styles.rentalSubtext}>Per day rental charges</p>

          <input
            type="text"
            inputMode="decimal"
            value={general.perDayCharges}
            onChange={(e) => handleNumericChange("perDayCharges", e.target.value)}
            onBlur={() => markTouched("perDayCharges")}
            placeholder="Enter amount"
            className={styles.rentalInput}
          />
          {showError("perDayCharges") && <p className={styles.rentalError}>{errors.perDayCharges}</p>}
        </div>
      </div>

      <div className={styles.ctaBar}>
        <button type="button" onClick={handleNext} className={`${styles.ctaBtn} btn-primary`}>
          Next: Product Details <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}