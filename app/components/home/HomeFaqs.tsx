"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import styles from "./HomeFaqs.module.css";

export interface HomeFaq {
  id: string;
  q: string;
  a: string;
}

const DEFAULT_FAQS: HomeFaq[] = [
  {
    id: "h1",
    q: "What is MouldX?",
    a: "MouldX is a platform where manufacturers can find, book and rent verified injection, blow and die-cast moulds without buying them.",
  },
  {
    id: "h2",
    q: "Who can rent a mould?",
    a: "Any registered manufacturer, workshop or business can rent. You only need valid business details and a signed rental agreement.",
  },
  {
    id: "h3",
    q: "How do I book a mould?",
    a: "Search for the mould you need, check its availability, choose your dates and confirm the booking. Our team then contacts you to finalise the details.",
  },
  {
    id: "h4",
    q: "How is the rental price decided?",
    a: "Pricing depends on the mould type, size, cavity count and rental duration. The price is shown clearly on every listing, with no hidden charges.",
  },
  {
    id: "h5",
    q: "Is a security deposit required?",
    a: "A refundable security deposit may be required for some moulds. It is returned after the mould passes inspection on return.",
  },
  {
    id: "h6",
    q: "How long does delivery take?",
    a: "Most deliveries in our serviceable areas are completed within 2 to 4 working days after confirmation. Self pickup is also available.",
  },
  {
    id: "h7",
    q: "Are the moulds verified?",
    a: "Yes. Every mould is inspected for wear, cavity condition and cycle life before it is listed on MouldX.",
  },
];

interface HomeFaqsProps {
  title?: string;
  subtitle?: string;
  faqs?: HomeFaq[];
  /** Id of the question that is open on first render. Pass null to start closed. */
  defaultOpenId?: string | null;
  /** Set to null to hide the "View all FAQs" link. */
  viewAllHref?: string | null;
}

// Escape "<" so the JSON can never close the script tag early.
const toJsonLd = (faqs: HomeFaq[]) =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }).replace(/</g, "\\u003c");

export default function HomeFaqs({
  title = "Frequently asked questions",
  subtitle = "Quick answers about booking, pricing and delivery",
  faqs = DEFAULT_FAQS,
  defaultOpenId = DEFAULT_FAQS[0].id,
  viewAllHref = "/faqs",
}: HomeFaqsProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId);

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
            const open = openId === faq.id;

            return (
              <div
                key={faq.id}
                className={`${styles.item} ${open ? styles.itemOpen : ""}`}
              >
                <h3 className={styles.qWrap}>
                  <button
                    type="button"
                    id={`home-faq-btn-${faq.id}`}
                    className={styles.question}
                    aria-expanded={open}
                    aria-controls={`home-faq-panel-${faq.id}`}
                    onClick={() => setOpenId(open ? null : faq.id)}
                  >
                    <span>{faq.q}</span>
                    <span className={styles.chevronWrap} aria-hidden>
                      <ChevronDown size={18} className={styles.chevron} />
                    </span>
                  </button>
                </h3>

                <div
                  id={`home-faq-panel-${faq.id}`}
                  role="region"
                  aria-labelledby={`home-faq-btn-${faq.id}`}
                  className={styles.panel}
                >
                  <div className={styles.panelInner}>
                    <p className={styles.answer}>{faq.a}</p>
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