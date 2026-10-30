"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search, Phone, X } from "lucide-react";
import styles from "./Faqs.module.css";

interface Faq {
  id: string;
  category: string;
  q: string;
  a: string;
}

const CATEGORIES = ["All", "General", "Booking", "Pricing", "Delivery", "Quality"] as const;

const FAQS: Faq[] = [
  // General
  { id: "g1", category: "General", q: "What is MouldX?", a: "MouldX is a platform where manufacturers can find, book and rent verified injection, blow and die-cast moulds without buying them." },
  { id: "g2", category: "General", q: "Which areas do you serve?", a: "We currently serve Delhi, Haryana, Uttar Pradesh, Punjab, Chandigarh and Uttarakhand. We are adding more regions soon." },
  { id: "g3", category: "General", q: "Who can rent a mould?", a: "Any registered manufacturer, workshop or business can rent. You only need valid business details and a signed rental agreement." },
  { id: "g4", category: "General", q: "Do I need to create an account?", a: "You can browse moulds without an account. To book, you need to sign up so we can verify your details." },
  { id: "g5", category: "General", q: "Which types of moulds are available?", a: "You can find chair, table, stool, crate and bucket moulds across injection, blow and die-cast categories." },

  // Booking
  { id: "b1", category: "Booking", q: "How do I book a mould?", a: "Search for the mould you need, check its availability, choose your dates and confirm the booking. Our team then contacts you to finalise details." },
  { id: "b2", category: "Booking", q: "What does FREE, 2 LEFT or BOOKED mean?", a: "FREE means the mould is available now. 2 LEFT means only two slots remain. BOOKED means it is currently rented out." },
  { id: "b3", category: "Booking", q: "Can I book a mould for a few days only?", a: "Yes. You can rent by the day, week or month depending on the mould and its availability." },
  { id: "b4", category: "Booking", q: "Can I cancel or change my booking?", a: "Yes. You can cancel or reschedule before the mould is dispatched. Cancellation terms are listed in the rental agreement." },
  { id: "b5", category: "Booking", q: "What is the rental agreement?", a: "It is a simple document covering rental period, responsibilities, damage terms and return conditions. You can read it on the Agreement page." },

  // Pricing
  { id: "p1", category: "Pricing", q: "How is the rental price decided?", a: "Pricing depends on the mould type, size, cavity count and rental duration. The price is shown clearly on every listing." },
  { id: "p2", category: "Pricing", q: "Are there any hidden charges?", a: "No. Rent, deposit, and delivery charges are shown before you confirm. Any extra cost is explained upfront." },
  { id: "p3", category: "Pricing", q: "Is a security deposit required?", a: "A refundable security deposit may be required for some moulds. It is returned after the mould passes inspection on return." },
  { id: "p4", category: "Pricing", q: "Which payment methods are accepted?", a: "We accept UPI, net banking, cards and bank transfer. A GST invoice is provided for every booking." },
  { id: "p5", category: "Pricing", q: "Do you offer discounts for long rentals?", a: "Yes. Longer rental periods and repeat users can get special pricing. Contact our team for a custom quote." },

  // Delivery
  { id: "d1", category: "Delivery", q: "How is the mould delivered?", a: "We arrange safe transport to your factory. Moulds are packed and handled by trained staff to avoid any damage." },
  { id: "d2", category: "Delivery", q: "How long does delivery take?", a: "Most deliveries in our serviceable areas are completed within 2 to 4 working days after confirmation." },
  { id: "d3", category: "Delivery", q: "Can I pick up the mould myself?", a: "Yes. Self pickup is available from the listed city. Please carry valid ID and the booking confirmation." },
  { id: "d4", category: "Delivery", q: "How do I return the mould?", a: "Tell us when you are done. We schedule a pickup, inspect the mould and close your booking." },

  // Quality
  { id: "q1", category: "Quality", q: "Are the moulds verified?", a: "Yes. Every mould is inspected for wear, cavity condition and cycle life before it is listed on MouldX." },
  { id: "q2", category: "Quality", q: "What if the mould has a problem after delivery?", a: "Report it within 24 hours of delivery. We will inspect it and arrange a repair, replacement or refund as per the agreement." },
  { id: "q3", category: "Quality", q: "Who is responsible for damage during use?", a: "Normal wear is covered. Damage caused by misuse or negligence is the renter's responsibility, as mentioned in the agreement." },
  { id: "q4", category: "Quality", q: "How can I contact support?", a: "Call us on +91-7500152505. Our team is available during working hours to help with bookings and issues." },
];

export default function Faqs() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(FAQS[0].id);

  const hasQuery = query.trim().length > 0;

  const visible = useMemo(() => {
    const q = query.toLowerCase().trim();
    return FAQS.filter((f) => {
      // Search karte waqt saari categories mein dhundhega
      if (q) return `${f.q} ${f.a}`.toLowerCase().includes(q);
      return category === "All" || f.category === category;
    });
  }, [query, category]);

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

        {hasQuery && (
          <p className={styles.resultText}>
            {visible.length} result{visible.length === 1 ? "" : "s"} for “{query.trim()}”
          </p>
        )}

        <div className={styles.list}>
          {visible.map((f) => {
            const open = openId === f.id;
            return (
              <div key={f.id} className={`${styles.item} ${open ? styles.itemOpen : ""}`}>
                <h3 className={styles.qWrap}>
                  <button
                    type="button"
                    className={styles.question}
                    aria-expanded={open}
                    aria-controls={`panel-${f.id}`}
                    id={`btn-${f.id}`}
                    onClick={() => setOpenId(open ? null : f.id)}
                  >
                    <span>{f.q}</span>
                    <ChevronDown size={20} className={styles.chevron} aria-hidden />
                  </button>
                </h3>
                <div
                  id={`panel-${f.id}`}
                  role="region"
                  aria-labelledby={`btn-${f.id}`}
                  className={styles.panel}
                >
                  <div className={styles.panelInner}>
                    <p className={styles.answer}>{f.a}</p>
                    {hasQuery && <span className={styles.badge}>{f.category}</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {visible.length === 0 && (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>No matching questions</p>
              <p className={styles.emptyText}>
                Try different words, or contact our team directly below.
              </p>
            </div>
          )}
        </div>
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