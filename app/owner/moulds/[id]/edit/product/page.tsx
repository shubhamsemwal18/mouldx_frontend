"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../EditForm.module.css";
import EditTop from "../EditTop";
import { useEditMould } from "../EditMouldProvider";
import { PRODUCT_CATEGORIES } from "../constants";
import { hasErrors, validateGeneral, validateProduct, validateTechnical } from "../validation";
import { ProductForm } from "../types";

type LocationStatus = "idle" | "fetching" | "done" | "denied";

export default function EditProductPage() {
  const router = useRouter();
  const { id, technical, general, product, setProduct, submitting, submit } = useEditMould();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(product.geo ? "done" : "idle");
  const [submitError, setSubmitError] = useState("");

  const base = `/owner/moulds/${id}/edit`;
  const errors = validateProduct(product);

  useEffect(() => {
    if (!product.image) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(product.image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [product.image]);

  const imageSrc = previewUrl ?? product.existingImageUrl;
  const videoName = product.video?.name ?? product.existingVideoName;

  const update = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setProduct((prev) => ({ ...prev, [key]: value }));
  };

  const markTouched = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }));

  const showError = (key: keyof typeof errors) => touched[key] && errors[key];

  const handleDecimalChange = (key: "length" | "breadth" | "height" | "weight", raw: string) => {
    let cleaned = raw.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
    update(key, cleaned);
  };

  const handleImageChange = (file: File | null) => {
    if (!file) return;
    markTouched("image");
    setProduct((prev) => ({ ...prev, image: file, geo: null }));

    if ("geolocation" in navigator) {
      setLocationStatus("fetching");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setProduct((prev) => ({
            ...prev,
            geo: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          }));
          setLocationStatus("done");
        },
        () => setLocationStatus("denied"),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLocationStatus("denied");
    }
  };

  const handleSubmit = async () => {
    setTouched(Object.fromEntries(Object.keys(errors).map((k) => [k, true])));
    setSubmitError("");
    if (hasErrors(errors)) return;

    if (hasErrors(validateTechnical(technical)) || hasErrors(validateGeneral(general))) {
      setSubmitError("Some details in the previous steps are incomplete. Go back and fix them.");
      return;
    }

    try {
      await submit();
      router.push(`${base}/status`);
    } catch {
      setSubmitError("Could not submit the listing. Please try again.");
    }
  };

  const geo = product.geo;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <EditTop backHref={`${base}/general`} backLabel="General details" />
        <h1 className={styles.title}>Product Details</h1>
        <p className={styles.subtitle}>Update the product this mould makes.</p>
        <div className={styles.card}>
          <label className={styles.fieldLabel}>Product Name</label>
          <input
            type="text"
            value={product.productName}
            onChange={(e) => update("productName", e.target.value)}
            onBlur={() => markTouched("productName")}
            placeholder="28mm PET Bottle Cap"
            className={`${styles.input} ${showError("productName") ? styles.inputError : ""}`}
          />
          {showError("productName") && <p className={styles.errorText}>{errors.productName}</p>}

          <div className={styles.mt}>
            <label className={styles.fieldLabel}>Category</label>
            <select
              value={product.category}
              onChange={(e) => update("category", e.target.value)}
              className={styles.select}
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className={`${styles.mt} ${styles.grid2}`}>
            <label className={`${styles.mediaBox} ${showError("image") ? styles.mediaBoxError : ""}`}>
              {imageSrc ? (
                <div className={styles.mediaPreviewWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageSrc} alt="Product preview" className={styles.mediaPreview} />
                  {locationStatus === "done" && geo && (
                    <span className={styles.geoBadge}>
                      📍 {geo.lat.toFixed(4)}°N, {geo.lng.toFixed(4)}°E
                    </span>
                  )}
                  {locationStatus === "fetching" && <span className={styles.geoBadge}>📍 Locating…</span>}
                </div>
              ) : (
                <>
                  <span className={styles.mediaPlus}>📷</span>
                  <span className={styles.mediaLabel}>Image</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                className={styles.mediaInput}
              />
            </label>

            <label className={styles.mediaBox}>
              {videoName ? (
                <span className={styles.mediaFileName}>🎥 {videoName}</span>
              ) : (
                <>
                  <span className={styles.mediaPlus}>+</span>
                  <span className={styles.mediaLabel}>Video</span>
                </>
              )}
              <input
                type="file"
                accept="video/*"
                onChange={(e) => update("video", e.target.files?.[0] ?? null)}
                className={styles.mediaInput}
              />
            </label>
          </div>
          {showError("image") && <p className={styles.errorText}>{errors.image}</p>}

          <div className={styles.geoFlag}>
            <span className={styles.geoFlagIcon} aria-hidden>
              i
            </span>
            <div>
              <p className={styles.geoFlagTitle}>Location capture</p>
              <p className={styles.geoFlagMsg}>
                {locationStatus === "idle" && "Location will be auto-attached once a new photo is captured."}
                {locationStatus === "fetching" && "Capturing location…"}
                {locationStatus === "done" &&
                  geo &&
                  `Captured at ${geo.lat.toFixed(4)}°N, ${geo.lng.toFixed(4)}°E — visible to customer with the listing.`}
                {locationStatus === "denied" &&
                  "Location permission was not granted — photo will upload without a geotag."}
              </p>
            </div>
          </div>

          <div className={`${styles.mt} ${styles.grid3}`}>
            <div>
              <label className={styles.fieldLabel}>L (mm)</label>
              <input
                type="text"
                inputMode="decimal"
                value={product.length}
                onChange={(e) => handleDecimalChange("length", e.target.value)}
                onBlur={() => markTouched("length")}
                placeholder="28"
                className={`${styles.input} ${showError("length") ? styles.inputError : ""}`}
              />
            </div>
            <div>
              <label className={styles.fieldLabel}>B (mm)</label>
              <input
                type="text"
                inputMode="decimal"
                value={product.breadth}
                onChange={(e) => handleDecimalChange("breadth", e.target.value)}
                onBlur={() => markTouched("breadth")}
                placeholder="28"
                className={`${styles.input} ${showError("breadth") ? styles.inputError : ""}`}
              />
            </div>
            <div>
              <label className={styles.fieldLabel}>H (mm)</label>
              <input
                type="text"
                inputMode="decimal"
                value={product.height}
                onChange={(e) => handleDecimalChange("height", e.target.value)}
                onBlur={() => markTouched("height")}
                placeholder="14"
                className={`${styles.input} ${showError("height") ? styles.inputError : ""}`}
              />
            </div>
          </div>
          {(showError("length") || showError("breadth") || showError("height")) && (
            <p className={styles.errorText}>All dimensions must be numeric</p>
          )}

          <div className={styles.mt}>
            <label className={styles.fieldLabel}>Weight (g)</label>
            <input
              type="text"
              inputMode="decimal"
              value={product.weight}
              onChange={(e) => handleDecimalChange("weight", e.target.value)}
              onBlur={() => markTouched("weight")}
              placeholder="3.2"
              className={`${styles.input} ${showError("weight") ? styles.inputError : ""}`}
            />
            {showError("weight") && <p className={styles.errorText}>{errors.weight}</p>}
          </div>

          <div className={`${styles.mt} ${styles.grid2}`}>
            <div>
              <label className={styles.fieldLabel}>Material</label>
              <input
                type="text"
                value={product.material}
                onChange={(e) => update("material", e.target.value)}
                onBlur={() => markTouched("material")}
                placeholder="HDPE"
                className={`${styles.input} ${showError("material") ? styles.inputError : ""}`}
              />
              {showError("material") && <p className={styles.errorText}>{errors.material}</p>}
            </div>
            <div>
              <label className={styles.fieldLabel}>Finish</label>
              <input
                type="text"
                value={product.finish}
                onChange={(e) => update("finish", e.target.value)}
                onBlur={() => markTouched("finish")}
                placeholder="Matte"
                className={`${styles.input} ${showError("finish") ? styles.inputError : ""}`}
              />
              {showError("finish") && <p className={styles.errorText}>{errors.finish}</p>}
            </div>
          </div>
        </div>

        {submitError && <p className={styles.submitError}>{submitError}</p>}
      </div>

      <div className={styles.ctaBar}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className={`${styles.ctaBtn} btn-primary`}
        >
          {submitting ? "Submitting..." : "Submit Listing for Approval"}
        </button>
      </div>
    </div>
  );
}