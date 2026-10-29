"use client";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useLogout } from "@/app/lib/use-logout";
import { useAuth } from "@/app/lib/auth-context";
import { authApi } from "@/app/lib/auth-api";
import { useActiveRole } from "@/app/lib/active-role";
import { getApiErrorMessage } from "@/app/lib/api";
import { getPrivateFilePreviewUrl } from "@/app/lib/upload-api";
import { useBookingQuery } from "@/app/components/bookings/useBookingQuery";
import ReviewList from "@/app/components/reviews/ReviewList";
import { RatingSummary } from "@/app/components/reviews/ReviewElements";
import { emptyRating } from "@/app/lib/review-api";
import type { MediaRef } from "@/app/lib/types";
import styles from "./Profile.module.css";

const statusLabels = { pending: "Profile pending", in_review: "Under review", approved: "Verified", rejected: "Rejected" };
export default function ProfilePage() {
  const { user: sessionUser } = useAuth();
  const router = useRouter();
  const { activeRole, switchRole } = useActiveRole(sessionUser?.approvedRoles.includes("owner"));
  const [moreOpen, setMoreOpen] = useState(false);
  const { handleLogout, loggingOut, logoutError } = useLogout();
  const fetcher = useCallback((signal: AbortSignal) => authApi.me(signal), []);
  const query = useBookingQuery(sessionUser?._id || "profile", fetcher, Boolean(sessionUser));
  if (query.loading) return <div className={styles.page}><p role="status">Loading profile…</p></div>;
  if (!query.data) return <div className={styles.page}><h1>Profile</h1><p role="alert">{query.error?.message || "Could not load your profile"}</p><button className={styles.switchProfileBtn} onClick={query.reload}>Try again</button><button className={styles.logoutRow} onClick={handleLogout} disabled={loggingOut}>Logout</button>{logoutError && <p role="alert">{logoutError}</p>}</div>;
  const { user } = query.data;
  const verification = query.data.profileVerification || query.data.ownerProfileVerification;
  const status = verification?.status || user.profileVerificationStatus;
  const firm = verification?.firmDetails;
  const personal = verification?.personalDetails;
  const payout = verification?.payoutDetails;
  const roles = user.approvedRoles.filter((r) => r !== "admin").map((r) => r === "owner" ? "Host" : "User").join(", ");
  const phone = user.phone.startsWith("+") ? user.phone : `+91 ${user.phone}`;
  const canSwitch = user.approvedRoles.includes("owner") && user.approvedRoles.includes("customer") && status === "approved";
  return <div className={styles.page}>
    <div className={styles.heading}><h1>Profile</h1><button className={styles.refresh} aria-label="Refresh profile" onClick={query.reload}><RefreshCw size={18} /></button></div>
    <div className={styles.identityCard}><div className={styles.avatar}>{user.fullName.split(/\s+/).map((p) => p[0]).join("").slice(0, 2)}</div>
      <div className={styles.identity}><strong>{user.fullName}</strong><p>{phone} · {roles}</p></div><span className={`${styles.statusBadge} ${styles[`status-${status}`]}`}>{statusLabels[status]}</span>
    </div>
    <RatingSummary summary={query.data.customerRating || emptyRating} label="Your rating as a customer" />
    <Section title="Personal Details"><Fields items={[["Name", user.fullName], ["Phone No.", phone], ["Email ID", user.email], ["PAN", personal?.panNumber]]} /></Section>
    <Section title="Firm Details"><Fields items={[["Firm", firm?.name], ["GSTIN", firm?.gstNumber], ["Email", firm?.email], ["Address", firm?.address]]} /></Section>
    <Section title="Payout Details"><Fields items={[["Account Holder", payout?.accountHolderName], ["Bank Account", payout?.bankAccountNumber ? `•••• ${payout.bankAccountNumber.slice(-4)}` : undefined], ["Bank", payout?.bankName], ["IFSC", payout?.ifscCode], ["UPI", payout?.upiId]]} /></Section>
    <Section title="Verification Documents"><div className={styles.documents}>
      <Document label="PAN Card" file={personal?.panCard} /><Document label="GST Certificate" file={firm?.gstCertificate} /><Document label="MSME Certificate" file={firm?.msmeCertificate} /><Document label="Electricity Bill" file={firm?.electricityBill} />
    </div></Section>
    <Section title="Your Rating as a Customer"><p className={styles.description}>Reviews received from hosts after your completed rentals.</p><ReviewList scope="customer" showSummary={false} /></Section>
    <div className={styles.sectionCard}><button type="button" onClick={() => setMoreOpen((v) => !v)} className={styles.moreToggle} aria-expanded={moreOpen}><span className={styles.sectionTitle}>More</span><span aria-hidden>▾</span></button>
      {moreOpen && <div className={styles.moreGrid}><Link className={styles.moreCard} href="/faqs">FAQs</Link><Link className={styles.moreCard} href="/contact">Contact MouldX</Link></div>}
    </div>
    <button className={styles.logoutRow} onClick={handleLogout} disabled={loggingOut}>{loggingOut ? "Logging out…" : "Logout"}</button>{logoutError && <p role="alert">{logoutError}</p>}
    {canSwitch && <button className={styles.switchProfileBtn} onClick={() => { switchRole(activeRole === "owner" ? "customer" : "owner"); router.push("/"); }}>Switch to {activeRole === "owner" ? "User" : "Host"} Mode</button>}
  </div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className={styles.sectionCard}><h2 className={styles.sectionTitle}>{title}</h2>{children}</section>;
}
function Fields({ items }: { items: [string, string | undefined][] }) {
  return <dl className={styles.fieldGrid}>{items.map(([label, value]) => <div key={label} className={styles.fieldItem}><dt className={styles.fieldLabel}>{label}</dt><dd className={styles.fieldValue}>{value || "Not added"}</dd></div>)}</dl>;
}
function Document({ label, file }: { label: string; file?: MediaRef }) {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const open = async () => {
    if (!file?.key || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    try { const url = await getPrivateFilePreviewUrl(file.key); if (popup) popup.location.replace(url); else window.location.assign(url); }
    catch (err) { popup?.close(); setError(getApiErrorMessage(err, "Could not open the document")); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <div><button className={styles.document} onClick={() => void open()} disabled={busy || !file?.key}>{busy ? "Opening…" : label}{file?.key ? " ↗" : " · Not added"}</button>{error && <p className={styles.description} role="alert">{error}</p>}</div>;
}
