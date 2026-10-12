"use client";

import { useState } from "react";
import Image from "next/image";
import MouldExplore from "./MouldExplore";
import GetStartedModal from "./GetStartedModal";
import SearchBar from "../shared/SearchBar";
import SearchOverlay from "../shared/SearchOverlay";
import styles from "./CustomerHome.module.css";
import mouldchair from "@/public/images/mould-and-chair.webp";
import { useAuth } from "@/app/lib/auth-context";

export default function CustomerHome() {
  const { user, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <div className={styles.page}>
      <section className={styles.heroSection}>
        <Image
          src={mouldchair}
          alt="Chair mould factory"
          fill
          priority
          className={styles.heroBg}
        />
        <div className={styles.heroOverlay} />

        <div className={styles.content}>
          <div className={styles.searchRow}>
            <SearchBar
              value={search}
              onChange={setSearch}
              onOpen={() => setSearchOpen(true)}
            />
          </div>

          <p className={styles.eyebrow}>
            {user ? `Hi ${user.fullName}, welcome to MouldX` : "Precision Engineered"}
          </p>

          <h1 className={styles.heading}>
            <span className={styles.headingAccent}>Turning Moulds</span>
            <br />
            <span className={styles.headingUnderline}>into Opportunities </span>
          </h1>

          {!loading && !user && (
            <div className={styles.ctaRow}>
              <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
                Get Started <span aria-hidden>→</span>
              </button>
            </div>
          )}
        </div>
      </section>

      
      <MouldExplore />

      <GetStartedModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Zomato/Blinkit style full-screen search */}
      <SearchOverlay
        open={searchOpen}
        query={search}
        onQueryChange={setSearch}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
