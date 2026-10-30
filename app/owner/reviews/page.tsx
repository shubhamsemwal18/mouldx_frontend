"use client";
import ReviewList from "@/app/components/reviews/ReviewList";
import styles from "./OwnerReviews.module.css";
export default function OwnerReviewsPage() {
  return <div className={styles.page}><div className={styles.content}><header className={styles.header}><h1 className={styles.title}>Your Ratings</h1></header>
    <p className={styles.summaryLabel}>Reviews of your products from completed bookings.</p><ReviewList scope="host" />
  </div></div>;
}
