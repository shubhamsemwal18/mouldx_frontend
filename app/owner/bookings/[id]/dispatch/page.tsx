"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./DispatchMould.module.css";

// TEMP dummy data — real booking API se aayega
const BOOKING_REF: Record<string, { code: string; total: number; rentalLabel: string }> = {
  "1": { code: "MX-000123", total: 126000, rentalLabel: "rental + security deposit" },
  "2": { code: "MX-000198", total: 72000, rentalLabel: "rental + security deposit" },
  "4": { code: "MX-000045", total: 108000, rentalLabel: "rental + security deposit" },
};

const STATUS_OPTIONS = ["Active", "In Transit", "Delayed"];

export default function DispatchMouldPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const booking = BOOKING_REF[id];

  const [date, setDate] = useState("2026-09-14");
  const [time, setTime] = useState("11:00");
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ---------- Geo-tag state (reused pattern) ----------
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "fetching" | "done" | "denied">(
    "idle"
  );

  const handlePhotoChange = (file: File | null) => {
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);

    if (file && locationStatus === "idle" && "geolocation" in navigator) {
      setLocationStatus("fetching");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationStatus("done");
        },
        () => setLocationStatus("denied"),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const canSubmit = confirmed && Boolean(photo);

  const handleDispatch = () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    // TODO: call dispatch API with { bookingId: id, date, time, status, photo, geoLocation: coords }
    router.push(`/owner/bookings/${id}?status=active`);
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
          <Link href={`/owner/bookings/${id}`} className={styles.backBtn} aria-label="Go back">
            ‹
          </Link>
          <h1 className={styles.title}>Upcoming Booking</h1>
        </div>
        <p className={styles.subtitle}>Prepare dispatch and mark active.</p>

        {/* ---------- Booking summary ---------- */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryTopRow}>
            <span className={styles.codeText}>{booking.code}</span>
            <span className={styles.summaryPill}>PAYMENT · ADMIN</span>
          </div>
          <p className={styles.summaryText}>
            User payment ₹{booking.total.toLocaleString("en-IN")} {booking.rentalLabel} under
            admin supervision.
          </p>
        </div>

        {/* ---------- Dispatch form ---------- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Dispatch</h2>

          <div className={styles.grid2}>
            <div>
              <label className={styles.fieldLabel}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={styles.input}
              />
            </div>
            <div>
              <label className={styles.fieldLabel}>Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          <div className="mt-3">
            <label className={styles.fieldLabel}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={styles.select}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* ---------- Pre-dispatch photo upload ---------- */}
          <div className="mt-3">
            <label className={styles.uploadBox}>
              {photoPreview ? (
                <div className={styles.uploadPreviewWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Pre-dispatch condition" className={styles.uploadPreview} />
                  {locationStatus === "done" && coords && (
                    <span className={styles.geoBadge}>
                      📍 {coords.lat.toFixed(4)}°N, {coords.lng.toFixed(4)}°E
                    </span>
                  )}
                  {locationStatus === "fetching" && (
                    <span className={styles.geoBadge}>📍 Locating…</span>
                  )}
                </div>
              ) : (
                <span className={styles.uploadPlaceholder}>+ Upload pre-dispatch condition photos</span>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
                className={styles.uploadInput}
              />
            </label>
          </div>

          {/* ---------- Confirmation checkbox ---------- */}
          <label className={styles.checkRow}>
            <span
              className={`${styles.checkBox} ${confirmed ? styles.checkBoxOn : ""}`}
              onClick={() => setConfirmed((prev) => !prev)}
              role="checkbox"
              aria-checked={confirmed}
            >
              {confirmed && "✓"}
            </span>
            I confirm pre-dispatch condition is recorded.
          </label>
        </div>
      </div>

      {/* ---------- Sticky CTA ---------- */}
      <div className={styles.ctaBar}>
        <button
          type="button"
          onClick={handleDispatch}
          disabled={!canSubmit || submitting}
          className={`${styles.ctaBtn} ${canSubmit ? styles.ctaBtnActive : styles.ctaBtnDisabled}`}
        >
          {submitting ? "Dispatching…" : "Dispatch & Mark Active →"}
        </button>
      </div>
    </div>
  );
}