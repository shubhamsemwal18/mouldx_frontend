"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./Return.module.css";

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export default function ReturnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [mediaCaptured, setMediaCaptured] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: "cleaned", label: "Cleaned before return", checked: true },
    { id: "accessories", label: "All accessories included", checked: true },
    { id: "damage", label: "Damage to report", checked: false },
  ]);

  const toggleItem = (itemId: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleCapture = () => {
    setMediaCaptured(true);
  };

  const canSubmit = mediaCaptured;

  const handleSubmit = () => {
    if (!canSubmit) return;
    router.push(`/bookings/${id}`);
  };

  return (
    <div className={styles.page}>
     

      <div className={styles.content}>
        <h1 className={styles.title}>Return &amp; inspection</h1>
        <p className={styles.subtitle}>
          Upload post-return photo/video before dispatching back.
        </p>

        {/* ---------- Media capture ---------- */}
        <button
          type="button"
          className={`${styles.uploadBox} ${mediaCaptured ? styles.uploadBoxDone : ""}`}
          onClick={handleCapture}
        >
          <span className={styles.uploadIcon} aria-hidden>
            📷
          </span>
          <span className={styles.uploadText}>
            {mediaCaptured ? "Media captured ✓" : "Tap to capture return media"}
          </span>
          <span className={styles.uploadSubtext}>Geotag auto-attached</span>
        </button>

        {/* ---------- Checklist ---------- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Return Checklist</h2>
          {checklist.map((item) => (
            <label key={item.id} className={styles.checkRow}>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleItem(item.id)}
                className={styles.checkboxInput}
              />
              <span
                className={`${styles.checkbox} ${item.checked ? styles.checkboxChecked : ""
                  }`}
              >
                {item.checked && <span className={styles.checkboxTick}>✓</span>}
              </span>
              <span className={styles.checkLabel}>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ---------- Sticky submit ---------- */}
      <div className={styles.ctaBar}>
        <button
          type="button"
          className={`${styles.ctaBtn} btn-primary`}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          Submit for Host Inspection
        </button>
      </div>
    </div>
  );
}