"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search, Phone, X } from "lucide-react";
import { FAQ_CATEGORIES, FAQ_SEARCH_MAX_LENGTH, faqsApi, type FaqCategory, type FaqPage } from "@/app/lib/faqs-api";
import styles from "./Faqs.module.css";

const CATEGORIES = ["All", ...FAQ_CATEGORIES] as const;

export default function Faqs() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>();

  const search = query.trim();
  const hasQuery = search.length > 0;
  const categoryFilter = hasQuery || category === "All" ? undefined : category;

  return (
    <main className={styles.page}>
      {/* Hero + search */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Help center</p>
          <h1 className={styles.title}>Frequently asked questions</h1>
          <p className={styles.subtitle}>
            Quick answers about booking, pricing, delivery and quality.
          </p>

          <div className={styles.search}>
            <Search size={18} className={styles.searchIcon} aria-hidden />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your question..."
              className={styles.searchInput}
              aria-label="Search FAQs"
              autoComplete="off"
              maxLength={FAQ_SEARCH_MAX_LENGTH}
            />
            {hasQuery && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Tabs + list */}
      <section className={styles.content}>
        {!hasQuery && (
          <div className={styles.tabs} role="tablist" aria-label="FAQ categories">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={category === c}
                onClick={() => {
                  setCategory(c);
                  setOpenId(null);
                }}
                className={`${styles.tab} ${category === c ? styles.tabActive : ""}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <FaqResults
          key={JSON.stringify([search, categoryFilter])}
          search={search}
          category={categoryFilter}
          openId={openId}
          onOpen={setOpenId}
        />
      </section>

      {/* Contact CTA */}
      <section className={styles.ctaWrap}>
        <div className={styles.cta}>
          <div>
            <h2 className={styles.ctaTitle}>Still have questions?</h2>
            <p className={styles.ctaText}>
              Our team is happy to help with bookings, pricing and custom requirements.
            </p>
          </div>
          <div className={styles.ctaActions}>
            <a href="tel:+917500152505" className="btn-primary">
              <Phone size={16} /> Call us
            </a>
            <Link href="/about" className={styles.ghostBtn}>
              About MouldX
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

interface FaqResultsProps {
  search: string;
  category?: FaqCategory;
  openId: string | null | undefined;
  onOpen: (id: string | null) => void;
}

function FaqResults({ search, category, openId, onOpen }: FaqResultsProps) {
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<FaqPage>();
  const [error, setError] = useState("");
  const sentinel = useRef<HTMLDivElement>(null);
  const loading = !error && result?.pagination.page !== page;
  const moreAvailable = !loading && !error && result?.pagination.hasNextPage;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      faqsApi.list({ page, search: search || undefined, category }, controller.signal).then(
        (data) => {
          if (controller.signal.aborted) return;
          setResult((previous) => {
            if (page === 1 || !previous) return data;

            const loadedIds = new Set(previous.faqs.map((faq) => faq._id));
            return {
              ...data,
              faqs: [...previous.faqs, ...data.faqs.filter((faq) => !loadedIds.has(faq._id))],
            };
          });
        },
        () => {
          if (!controller.signal.aborted) setError("Could not load FAQs. Please try again.");
        },
      );
    }, page === 1 && search ? 250 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [attempt, category, page, search]);

  useEffect(() => {
    if (!moreAvailable || !sentinel.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setPage((current) => current === page ? current + 1 : current);
      }
    }, { rootMargin: "150px 0px" });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [moreAvailable, page]);

  const retry = () => {
    setError("");
    setAttempt((current) => current + 1);
  };
  const visible = result?.faqs ?? [];
  const hasQuery = search.length > 0;
  const total = result?.pagination.total ?? 0;
  const expandedId = openId === undefined && !search && !category ? visible[0]?._id : openId;

  return (
    <>
      {hasQuery && result && (
        <p className={styles.resultText} aria-live="polite">
          {total} result{total === 1 ? "" : "s"} for “{search}”
        </p>
      )}

      <div className={styles.list}>
        {visible.map((f) => {
          const open = expandedId === f._id;
          return (
            <div key={f._id} className={`${styles.item} ${open ? styles.itemOpen : ""}`}>
              <h3 className={styles.qWrap}>
                <button
                  type="button"
                  className={styles.question}
                  aria-expanded={open}
                  aria-controls={`panel-${f._id}`}
                  id={`btn-${f._id}`}
                  onClick={() => onOpen(open ? null : f._id)}
                >
                  <span>{f.question}</span>
                  <ChevronDown size={20} className={styles.chevron} aria-hidden />
                </button>
              </h3>
              <div
                id={`panel-${f._id}`}
                role="region"
                aria-labelledby={`btn-${f._id}`}
                className={styles.panel}
              >
                <div className={styles.panelInner}>
                  <p className={styles.answer}>{f.answer}</p>
                  {hasQuery && <span className={styles.badge}>{f.category}</span>}
                </div>
              </div>
            </div>
          );
        })}

        {result && visible.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No matching questions</p>
            <p className={styles.emptyText}>
              Try different words, or contact our team directly below.
            </p>
          </div>
        )}
      </div>
      {loading && (
        <p className={styles.resultText} role="status">{page === 1 ? "Loading FAQs…" : "Loading more FAQs…"}</p>
      )}
      {error && (
        <div className={styles.empty} role="alert">
          <p className={styles.emptyText}>{error}</p>
          <button type="button" className={styles.tab} onClick={retry}>Try again</button>
        </div>
      )}
      {moreAvailable && <div ref={sentinel} aria-hidden="true" style={{ height: 1 }} />}
    </>
  );
}
