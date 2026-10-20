import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import MouldExplore from "@/app/components/home/MouldExplore";
import styles from "./ExplorePage.module.css";

export default function ExplorePage() {
  return (
    <>
      <div className={styles.backBar}>
        <Link href="/" className={styles.backBtn} aria-label="Go back">
          <ArrowLeft size={18} />
          <span>Back</span>
        </Link>
      </div>
      <MouldExplore />
    </>
  );
}
