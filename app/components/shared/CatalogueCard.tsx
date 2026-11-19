"use client";

import { useState } from "react";
import Link from "next/link";
import { ImageOff, Star, Wrench } from "lucide-react";
import type { PublicProductCard } from "@/app/lib/types";
import styles from "./CatalogueCard.module.css";

export default function CatalogueCard({ product, className = "", onNavigate }: {
  product: PublicProductCard; className?: string; onNavigate?: () => void;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const imageUrl = product.image?.url;
  const reviewCount = product.reviewCount ?? 0;
  const avgRating = product.avgRating ?? 0;
  const hasRating = reviewCount > 0 && avgRating > 0;

  return (
    <article className={`${styles.card} ${className}`}>
      <Link href={`/explore/${product.slug}`} className={styles.link} onClick={onNavigate}>
        <div className={styles.imageWrap}>
          {imageUrl && failedImage !== imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={product.name} loading="lazy" className={styles.image} onError={() => setFailedImage(imageUrl)} />
          ) : <span className={styles.placeholder} aria-hidden="true"><ImageOff size={28} strokeWidth={1.4} /></span>}
          {product.availability === "maintenance" && <span className={styles.maintenanceBadge}><Wrench size={12} aria-hidden="true" />Maintenance</span>}
          {hasRating && (
            <span
              className={styles.ratingBadge}
              aria-label={`Rated ${avgRating.toFixed(1)} out of 5 from ${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}`}
            >
              {avgRating.toFixed(1)}
              <Star size={11} fill="currentColor" strokeWidth={0} aria-hidden="true" />
            </span>
          )}
        </div>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.price}>{product.pricing?.perDayCharges === undefined ? "Price on request" : `₹${product.pricing.perDayCharges.toLocaleString("en-IN")}/day`}</p>
        <p className={styles.meta}>{[product.category?.title, product.subCategory?.title, product.code].filter(Boolean).join(" · ")}</p>
      </Link>
    </article>
  );
}