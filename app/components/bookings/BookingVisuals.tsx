"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import type { BookingStatus, RentalPhase } from "@/app/lib/booking-types";
import styles from "./Bookings.module.css";

export const paymentMethodLabel = { owner: "Pay owner directly", bank_transfer: "Bank transfer to host", upi: "UPI to host", platform: "Pay through MouldX" };

export function BookingBadge({ status, phase }: { status: BookingStatus; phase?: RentalPhase | null }) {
  const label = status === "approved" && phase ? phase : status === "pending" ? "Pending approval" : status;
  return <span className={`${styles.badge} ${styles[status]} ${phase ? styles[phase] : ""}`}>{label}</span>;
}

export function BookingProductImage({ src, name, large = false }: { src?: string; name: string; large?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  return <div className={large ? styles.productHeroImage : styles.productThumbnail}>
    {src && failedSrc !== src
      ? <Image src={src} alt={name} fill sizes={large ? "(max-width: 767px) 100vw, 620px" : "120px"} unoptimized onError={() => setFailedSrc(src)} />
      : <Package size={large ? 56 : 32} strokeWidth={1.4} aria-hidden="true" />}
  </div>;
}
