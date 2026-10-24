"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./Onboarding.module.css";

interface Step {
  number: string;
  title: string;
  badge: string;
  badgeVariant: "cyan" | "blue" | "purple" | "green";
}

const STEPS: Step[] = [
  { number: "01", title: "Profile Creation", badge: "KYC", badgeVariant: "cyan" },
  { number: "02", title: "Mould Details", badge: "TECHNICAL + GENERAL", badgeVariant: "blue" },
  { number: "03", title: "Product Details", badge: "MEDIA", badgeVariant: "purple" },
  { number: "04", title: "Mould Live", badge: "APPROVAL", badgeVariant: "green" },
];

export default function OwnerOnboardingPage() {
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(0);

  // Reveal steps one by one for the "first this, then this" effect
  useEffect(() => {
    if (visibleCount >= STEPS.length) return;
    const timer = setTimeout(() => {
      setVisibleCount((prev) => prev + 1);
    }, 350);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  const handleStart = () => {
    router.push("/owner/onboarding/profile");
  };

  return (
    <div className={`${styles.page} flex h-screen flex-col justify-between overflow-hidden bg-white px-6 pt-12 pb-6`}>
      <div>
       

        {/* ---------- Title ---------- */}
        <div className={styles.titleBlock}>
          <h1 className="text-[26px] font-extrabold leading-tight text-gray-900">
            Complete your listing
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Four steps from host registration to a user-visible mould.
          </p>
        </div>

        {/* ---------- Steps card ---------- */}
        <div className={styles.stepsCard}>
          {STEPS.map((step, index) => (
            <div
              key={step.number}
              className={`${styles.stepRow} ${index < visibleCount ? styles.stepRowVisible : ""} ${
                index < STEPS.length - 1 ? styles.stepRowBorder : ""
              }`}
            >
              <div className="min-w-0">
                <span className={styles.stepNumber}>{step.number}</span>
                <p className="mt-1 text-[15px] font-bold text-gray-900">{step.title}</p>
              </div>
              <span className={`${styles.badge} ${styles[`badge${capitalize(step.badgeVariant)}`]}`}>
                {step.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- CTA ---------- */}
      <div className={styles.ctaWrap}>
        <button type="button" onClick={handleStart} className={`${styles.ctaBtn} btn-primary`}>
          Start Profile <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}