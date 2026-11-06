"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import MouldExplore from "./MouldExplore";
import Testimonials from "./Testimonials";
import GetStartedModal from "./GetStartedModal";
import SearchBar from "../shared/SearchBar";
import SearchOverlay from "../shared/SearchOverlay";
import styles from "./CustomerHome.module.css";
import mouldchair from "@/public/images/mould-and-chair.webp";
import { useAuth } from "@/app/lib/auth-context";
import {
  DEFAULT_FILTERS,
  countActiveFilters,
  type CatalogueFilters,
} from "@/app/lib/catalogue-filters";
import HomeFaqs from "./HomeFaqs";

export default function CustomerHome() {
  const { user, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [autoVoice, setAutoVoice] = useState(false);
  // Shared by the hero bar, the search sheet and the results section below,
  // so a search made anywhere filters the listings on this page.
  const [search, setSearch] = useState("");
  // The filter panel lives in the listings section; the sticky bar toggles it.
  const [filterOpen, setFilterOpen] = useState(false);
  // Shared like `search`, so filters picked in the sheet also apply below.
  const [filters, setFilters] = useState<CatalogueFilters>(DEFAULT_FILTERS);
  const activeFilterCount = countActiveFilters(filters);

  const openSearch = (options?: { voice?: boolean }) => {
    setAutoVoice(Boolean(options?.voice));
    setSearchOpen(true);
  };

  const showFilters = () => {
    setFilterOpen(true);
    // The panel sits below the hero, so bring it into view when opening.
    document.getElementById("mould-explore")?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleFilters = () => {
    if (filterOpen) setFilterOpen(false);
    else showFilters();
  };

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setAutoVoice(false);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.searchBarSticky}>
        <div className={styles.searchBarInner}>
          <SearchBar
            value={search}
            onChange={setSearch}
            onOpen={openSearch}
            onFilterToggle={toggleFilters}
            filterOpen={filterOpen}
            activeFilterCount={activeFilterCount}
          />
        </div>
      </div>

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
          {user && (
            <p className={styles.eyebrow}>Hi {user.fullName}, welcome to MouldX</p>
          )}

          <h1 className={styles.heading}>
            <span className={styles.headingAccent}>Turning Moulds</span>
            <br />
            <span className={styles.headingUnderline}>into Opportunities </span>
          </h1>

          {!loading && !user && (
            <div className={styles.ctaRow}>
              <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
                Get Started
              </button>
            </div>
          )}
        </div>
      </section>

      <MouldExplore
        enabled={!searchOpen}
        search={search}
        onSearchChange={setSearch}
        filterOpen={filterOpen}
        onFilterOpenChange={setFilterOpen}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <Testimonials />

      <HomeFaqs />

      <GetStartedModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Zomato/Blinkit style full-screen search */}
      <SearchOverlay
        open={searchOpen}
        query={search}
        onQueryChange={setSearch}
        onClose={closeSearch}
        autoVoice={autoVoice}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
}