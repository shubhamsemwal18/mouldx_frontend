"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LifeBuoy, MessageCircle } from "lucide-react";
import { chatApi } from "@/app/lib/chat-api";
import { getApiErrorMessage } from "@/app/lib/api";
import type { BookingStatus, BookingView } from "@/app/lib/booking-types";
import type { ChatKind, ChatParty } from "@/app/lib/chat-types";
import styles from "../bookings/Bookings.module.css";

export default function BookingHelp({ bookingId, status, view }: { bookingId: string; status: BookingStatus; view: BookingView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const admin = view === "admin";
  const start = async (kind: ChatKind, party?: ChatParty) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const thread = await chatApi.start(bookingId, kind, party, admin);
      router.push(`${admin ? "/admin/support" : "/inbox"}/${encodeURIComponent(thread._id)}`);
    } catch (err) { setError(getApiErrorMessage(err, "Unable to open this conversation. Please try again.")); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <section className={styles.detailSection}>
    <h2>{admin ? "Contact participants" : "Need help?"}</h2>
    <div className={styles.helpActions}>
      {admin ? <>
        <button className={`${styles.button} ${styles.primary}`} disabled={busy} onClick={() => start("support", "customer")}><MessageCircle size={17} />Message customer</button>
        {status === "approved" && <button className={styles.button} disabled={busy} onClick={() => start("support", "host")}><MessageCircle size={17} />Message host</button>}
      </> : <>
        <button className={`${styles.button} ${styles.primary}`} disabled={busy || status !== "approved"} onClick={() => start("booking")}><MessageCircle size={17} />{view === "host" ? "Message customer" : "Message owner"}</button>
        <button className={styles.button} disabled={busy} onClick={() => start("support")}><LifeBuoy size={17} />Raise an issue</button>
      </>}
    </div>
    {!admin && status !== "approved" && <p className={styles.note}>{view === "host" ? "Customer" : "Owner"} messaging is available after booking approval.</p>}
    {busy && <p className={styles.note} role="status">Opening conversation...</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </section>;
}
