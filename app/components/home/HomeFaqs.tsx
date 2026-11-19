"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { faqsApi, type Faq } from "@/app/lib/faqs-api";
import styles from "./HomeFaqs.module.css";

interface HomeFaqsProps {
  title?: string;
  subtitle?: string;
  /** Id of the question that is open on first render. Pass null to start closed. */
  defaultOpenId?: string | null;
  /** Set to null to hide the "View all FAQs" link. */
  viewAllHref?: string | null;
}

// Escape "<" so the JSON can never close the script tag early.
const toJsonLd = (faqs: Faq[]) =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  }).replace(/</g, "\\u003c");

export default function HomeFaqs({
  title = "Frequently asked questions",
  subtitle = "Quick answers about booking, pricing and delivery",
  defaultOpenId,
  viewAllHref = "/faqs",
}: HomeFaqsProps) {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [openId, setOpenId] = useState<string | null | undefined>(defaultOpenId);

  useEffect(() => {
    const controller = new AbortController();
    faqsApi.home(controller.signal).then((items) => {
      if (!controller.signal.aborted) setFaqs(items);
    }).catch(() => {
      // Keep the rest of the homepage available if the FAQ request fails.
    });
    return () => controller.abort();
  }, []);

  if (faqs.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="home-faqs-title">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(faqs) }}
      />

      <div className={styles.inner}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>FAQs</span>
          <h2 id="home-faqs-title" className={styles.title}>
            {title}
          </h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </header>

        <div className={styles.list}>
          {faqs.map((faq) => {
            const open = (openId === undefined ? faqs[0]._id : openId) === faq._id;

            return (
              <div
                key={faq._id}
                className={`${styles.item} ${open ? styles.itemOpen : ""}`}
              >
                <h3 className={styles.qWrap}>
                  <button
                    type="button"
                    id={`home-faq-btn-${faq._id}`}
                    className={styles.question}
                    aria-expanded={open}
                    aria-controls={`home-faq-panel-${faq._id}`}
                    onClick={() => setOpenId(open ? null : faq._id)}
                  >
                    <span>{faq.question}</span>
                    <span className={styles.chevronWrap} aria-hidden>
                      <ChevronDown size={18} className={styles.chevron} />
                    </span>
                  </button>
                </h3>

                <div
                  id={`home-faq-panel-${faq._id}`}
                  role="region"
                  aria-labelledby={`home-faq-btn-${faq._id}`}
                  className={styles.panel}
                >
                  <div className={styles.panelInner}>
                    <p className={styles.answer}>{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {viewAllHref && (
          <div className={styles.footer}>
            <Link href={viewAllHref} className={styles.viewAll}>
              View all FAQs <span aria-hidden>→</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
