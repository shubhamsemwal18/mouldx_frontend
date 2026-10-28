"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardCheck, FileText, UserRound } from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { getOnboardingPath } from "@/app/lib/auth-routing";
import styles from "./Onboarding.module.css";

const STEPS = [
  { icon: UserRound, title: "Personal and firm details", description: "Complete your profile details." },
  { icon: FileText, title: "Verification documents", description: "Submit your KYC documents." },
  { icon: ClipboardCheck, title: "Admin review", description: "Your account is verified after approval." },
];

export default function OnboardingPage() {
  const { user, ownerProfileVerification, loading } = useAuth();
  const router = useRouter();
  const status = ownerProfileVerification?.status || user?.profileVerificationStatus;
  useEffect(() => {
    if (!loading && user && status && status !== "pending") router.replace(getOnboardingPath(status));
  }, [loading, user, status, router]);
  if (loading || !user || (status && status !== "pending")) return null;
  return (
    <div className={styles.page}>
      <h1>Complete your profile</h1>
      <p className={styles.subtitle}>Verify your details to book or list moulds.</p>
      <ol className={styles.steps}>
        {STEPS.map(({ icon: Icon, title, description }) => (
          <li key={title}><span className={styles.icon}><Icon size={22} aria-hidden="true" /></span><div><h2>{title}</h2><p>{description}</p></div></li>
        ))}
      </ol>
      <Link href="/onboarding/profile" className={styles.start}>Start Profile <ArrowRight size={18} aria-hidden="true" /></Link>
    </div>
  );
}
