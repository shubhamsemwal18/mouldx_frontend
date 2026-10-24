"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./DamageClaim.module.css";

const MAX_FILES = 5;

interface EvidenceFile {
  file: File;
  preview: string;
  coords: { lat: number; lng: number } | null;
}

const BOOKING_REF: Record<string, { code: string; deposit: number }> = {
  "1": { code: "MX-000123", deposit: 50000 },
  "2": { code: "MX-000198", deposit: 18000 },
  "4": { code: "MX-000045", deposit: 30000 },
};

export default function DamageClaimPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const booking = BOOKING_REF[id];

  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);
  const [claimAmount, setClaimAmount] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  // ---------- Geo-tag state ----------
  const [locationStatus, setLocationStatus] = useState<"idle" | "fetching" | "done" | "denied">(
    "idle"
  );

  const markTouched = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }));

  const getCurrentCoords = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  };

  const handleFilesChange = async (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList).slice(0, MAX_FILES - evidence.length);
    if (newFiles.length === 0) return;

    markTouched("files");
    setLocationStatus("fetching");
    const coords = await getCurrentCoords();
    setLocationStatus(coords ? "done" : "denied");

    const newEvidence: EvidenceFile[] = newFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      coords,
    }));

    setEvidence((prev) => [...prev, ...newEvidence].slice(0, MAX_FILES));
  };

  const removeEvidence = (index: number) => {
    setEvidence((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAmountChange = (raw: string) => {
    let cleaned = raw.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
    setClaimAmount(cleaned);
  };

  const errors = {
    description: description.trim() === "" ? "Damage description is required" : "",
    files: evidence.length === 0 ? "At least one photo/video is required" : "",
    claimAmount:
      claimAmount.trim() === ""
        ? "Required"
        : !/^\d+(\.\d{1,2})?$/.test(claimAmount.trim())
        ? "Numeric value only"
        : booking && Number(claimAmount) > booking.deposit
        ? `Cannot exceed deposit of ₹${booking.deposit.toLocaleString("en-IN")}`
        : "",
  };

  const isValid = !errors.description && !errors.files && !errors.claimAmount;

  const handleSubmit = () => {
    setTouched({ description: true, files: true, claimAmount: true });
    if (!isValid || submitting) return;
    setSubmitting(true);
   
    router.push(`/owner/bookings/${id}?status=claim-submitted`);
  };

  if (!booking) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>Booking not found.</p>
        <Link href="/owner/bookings" className={styles.notFoundLink}>
          ← Back to Bookings
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {/* ---------- Header row with back button ---------- */}
        <div className={styles.titleRow}>
          <Link href={`/owner/bookings/${id}/return`} className={styles.backBtn} aria-label="Go back">
            ‹
          </Link>
          <h1 className={styles.title}>Raise Damage Claim</h1>
        </div>
        <p className={styles.subtitle}>
          Deducted from user security deposit after claim process.
        </p>

        {/* ---------- Evidence required warning ---------- */}
        <div className={styles.warningCard}>
          <span className={styles.warningIcon} aria-hidden>
            !
          </span>
          <div>
            <p className={styles.warningTitle}>Evidence required</p>
            <p className={styles.warningText}>Attach clear photos/videos of damaged parts.</p>
          </div>
        </div>

        {/* ---------- Claim form ---------- */}
        <div className={styles.card}>
          <label className={styles.fieldLabel}>
            Damage Description <span className={styles.required}>*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => markTouched("description")}
            placeholder="Describe the damage in detail..."
            rows={3}
            className={`${styles.textarea} ${touched.description && errors.description ? styles.inputError : ""}`}
          />
          {touched.description && errors.description && (
            <p className={styles.errorText}>{errors.description}</p>
          )}

          <label className={`${styles.uploadBox} ${evidence.length >= MAX_FILES ? styles.uploadBoxDisabled : ""}`}>
            <span className={styles.uploadPlaceholder}>
              {locationStatus === "fetching"
                ? "📍 Capturing location…"
                : `+ Upload Photos / Videos (${evidence.length}/${MAX_FILES})`}
            </span>
            <input
              type="file"
              accept="image/*,video/*"
              capture="environment"
              multiple
              onChange={(e) => handleFilesChange(e.target.files)}
              className={styles.uploadInput}
              disabled={evidence.length >= MAX_FILES}
            />
          </label>
          {touched.files && errors.files && <p className={styles.errorText}>{errors.files}</p>}

          {locationStatus === "denied" && (
            <p className={styles.geoWarning}>
              Location permission not granted — evidence will upload without a geotag.
            </p>
          )}

          {/* ---------- Evidence thumbnails with geo badge ---------- */}
          {evidence.length > 0 && (
            <div className={styles.evidenceGrid}>
              {evidence.map((item, i) => (
                <div key={i} className={styles.evidenceThumb}>
                  {item.file.type.startsWith("video") ? (
                    <div className={styles.evidenceVideoPlaceholder}>🎥</div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.preview} alt="Evidence" className={styles.evidenceImg} />
                  )}
                  {item.coords && (
                    <span className={styles.evidenceGeoBadge}>
                      📍 {item.coords.lat.toFixed(4)}, {item.coords.lng.toFixed(4)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeEvidence(i)}
                    className={styles.evidenceRemoveBtn}
                    aria-label="Remove file"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className={styles.fieldLabelSpaced}>Claim Amount</label>
          <div className={styles.amountWrap}>
            <span className={styles.amountPrefix}>₹</span>
            <input
              type="text"
              inputMode="decimal"
              value={claimAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              onBlur={() => markTouched("claimAmount")}
              placeholder="12,000"
              className={`${styles.amountInput} ${
                touched.claimAmount && errors.claimAmount ? styles.inputError : ""
              }`}
            />
          </div>
          {touched.claimAmount && errors.claimAmount && (
            <p className={styles.errorText}>{errors.claimAmount}</p>
          )}
        </div>
      </div>

      {/* ---------- Sticky submit ---------- */}
      <div className={styles.ctaBar}>
        <button type="button" onClick={handleSubmit} disabled={submitting} className={styles.submitBtn}>
          {submitting ? "Submitting…" : "Submit Damage Claim"}
        </button>
      </div>
    </div>
  );
}