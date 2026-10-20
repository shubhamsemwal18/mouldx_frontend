import Image from "next/image";
import Link from "next/link";
import styles from "./AboutUs.module.css";

const FALLBACK = "/images/mould-and-chair.webp";
const IMG = {
  hero: FALLBACK, 
  story: FALLBACK,
  why: FALLBACK, 
  cta: FALLBACK, 
};

const STATS = [
  { value: "1,240+", label: "Verified moulds" },
  { value: "6", label: "States served" },
  { value: "800+", label: "Happy customers" },
  { value: "98%", label: "On-time delivery" },
];

const SERVICES = [
  { icon: "🏭", title: "Mould Rental", text: "Rent injection, blow and die-cast moulds by the day, week or month, with no heavy upfront cost." },
  { icon: "🛠️", title: "Custom Moulds", text: "Need something specific? We connect you with toolmakers who build to your drawing." },
  { icon: "🔍", title: "Quality Checks", text: "Every mould is inspected for wear, cavity condition and cycle life before it is listed." },
  { icon: "🚚", title: "Pickup & Delivery", text: "Safe handling and transport across Delhi, Haryana, UP, Punjab, Chandigarh and Uttarakhand." },
];

const STEPS = [
  { title: "Search", text: "Browse moulds by type, price, city and availability." },
  { title: "Book", text: "Pick your dates and confirm the booking online." },
  { title: "Receive", text: "The mould is delivered, inspected and ready to run." },
  { title: "Return", text: "Finish production and return it. We handle the rest." },
];

const WHY = [
  "Every listing is verified by our team",
  "Transparent pricing with no hidden charges",
  "Flexible rental durations",
  "Dedicated support on call and WhatsApp",
  "Simple agreement and secure booking",
];

const VALUES = [
  { icon: "🎯", title: "Precision", text: "Small tolerances decide big outcomes, so we treat details seriously." },
  { icon: "🤝", title: "Trust", text: "Honest listings and clear terms build long-term relationships." },
  { icon: "⚡", title: "Speed", text: "Faster bookings and quicker turnarounds keep your lines running." },
  { icon: "🌱", title: "Growth", text: "We grow when small and mid-size manufacturers grow." },
];

const JOURNEY = [
  { year: "2022", text: "MouldX idea born in Jaspur, Uttarakhand." },
  { year: "2023", text: "First 100 moulds listed with local partners." },
  { year: "2024", text: "Expanded to Delhi NCR, Haryana and Punjab." },
  { year: "2025", text: "Crossed 800 customers and 1,000 listings." },
  { year: "2026", text: "Launched the new MouldX booking platform." },
];

const TEAM = [
  { name: "Rohit Sharma", role: "Founder & CEO" },
  { name: "Neha Verma", role: "Head of Operations" },
  { name: "Aman Gupta", role: "Lead Engineer" },
  { name: "Priya Singh", role: "Customer Success" },
];

const REVIEWS = [
  { name: "Vikas Jain", firm: "Jain Plastics, Delhi", text: "We saved lakhs by renting instead of buying. Booking took ten minutes." },
  { name: "Sandeep Kaur", firm: "SK Moulders, Ludhiana", text: "Mould condition was exactly as listed. The support team was always reachable." },
  { name: "Imran Khan", firm: "Khan Industries, Bareilly", text: "Delivery was on time and the whole process was clear and simple." },
];

export default function AboutUs() {
  return (
    <main className={styles.page}>
      {/* 1. Hero */}
      <section className={styles.hero}>
        <Image src={IMG.hero} alt="MouldX factory" fill priority className={styles.cover} />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>About MouldX</p>
          <h1 className={styles.heroTitle}>Turning moulds into opportunities</h1>
          <p className={styles.heroText}>
            We help manufacturers across North India find, book and run quality moulds without the cost of owning them.
          </p>
          <Link href="/" className="btn-primary">Explore moulds <span aria-hidden>→</span></Link>
        </div>
      </section>

      {/* 2. Stats */}
      <section className={styles.statsWrap}>
        <div className={styles.stats}>
          {STATS.map((s) => (
            <div key={s.label} className={styles.stat}>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Story */}
      <section className={`${styles.section} ${styles.split}`}>
        <div className={styles.imgBox}>
          <Image src={IMG.story} alt="Our story" fill className={styles.cover} />
        </div>
        <div>
          <p className={styles.tag}>Our story</p>
          <h2 className={styles.h2}>Built from the factory floor</h2>
          <p className={styles.p}>
            MouldX started in Jaspur, where we saw good manufacturers lose weeks searching for the right mould, or tie up capital buying one they would use only a few times.
          </p>
          <p className={styles.p}>
            So we built a platform that lists verified moulds in one place, with clear prices and simple booking. Today we serve manufacturers across six regions.
          </p>
        </div>
      </section>

      {/* 4. Mission & Vision */}
      <section className={`${styles.section} ${styles.alt}`}>
        <div className={styles.twoCards}>
          <div className={styles.card}>
            <span className={styles.icon}>🚀</span>
            <h3 className={styles.h3}>Our Mission</h3>
            <p className={styles.p}>Make quality moulds accessible to every manufacturer, big or small, at a fair price.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.icon}>🔭</span>
            <h3 className={styles.h3}>Our Vision</h3>
            <p className={styles.p}>To be India&apos;s most trusted marketplace for industrial tooling and mould rentals.</p>
          </div>
        </div>
      </section>

      {/* 5. Services */}
      <section className={styles.section}>
        <Heading tag="What we do" title="Everything around your mould" />
        <div className={styles.grid4}>
          {SERVICES.map((s) => (
            <div key={s.title} className={styles.card}>
              <span className={styles.icon}>{s.icon}</span>
              <h3 className={styles.h3}>{s.title}</h3>
              <p className={styles.p}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. How it works */}
      <section className={`${styles.section} ${styles.alt}`}>
        <Heading tag="How it works" title="Four simple steps" />
        <div className={styles.grid4}>
          {STEPS.map((s, i) => (
            <div key={s.title} className={styles.step}>
              <span className={styles.stepNo}>{i + 1}</span>
              <h3 className={styles.h3}>{s.title}</h3>
              <p className={styles.p}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Why choose us */}
      <section className={`${styles.section} ${styles.split} ${styles.reverse}`}>
        <div>
          <p className={styles.tag}>Why MouldX</p>
          <h2 className={styles.h2}>Why manufacturers choose us</h2>
          <ul className={styles.checks}>
            {WHY.map((w) => (
              <li key={w}><span aria-hidden>✓</span>{w}</li>
            ))}
          </ul>
        </div>
        <div className={styles.imgBox}>
          <Image src={IMG.why} alt="Why choose MouldX" fill className={styles.cover} />
        </div>
      </section>

      {/* 8. Values */}
      <section className={`${styles.section} ${styles.alt}`}>
        <Heading tag="Our values" title="What drives us" />
        <div className={styles.grid4}>
          {VALUES.map((v) => (
            <div key={v.title} className={styles.card}>
              <span className={styles.icon}>{v.icon}</span>
              <h3 className={styles.h3}>{v.title}</h3>
              <p className={styles.p}>{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 9. Journey */}
      <section className={styles.section}>
        <Heading tag="Our journey" title="How we got here" />
        <ol className={styles.timeline}>
          {JOURNEY.map((j) => (
            <li key={j.year} className={styles.tItem}>
              <strong>{j.year}</strong>
              <p className={styles.p}>{j.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 10. Team */}
      <section className={`${styles.section} ${styles.alt}`}>
        <Heading tag="Our team" title="The people behind MouldX" />
        <div className={styles.grid4}>
          {TEAM.map((t) => (
            <div key={t.name} className={`${styles.card} ${styles.center}`}>
              <div className={styles.avatar}>
                {t.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <h3 className={styles.h3}>{t.name}</h3>
              <p className={styles.p}>{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 11. Testimonials */}
      <section className={styles.section}>
        <Heading tag="Testimonials" title="What customers say" />
        <div className={styles.grid3}>
          {REVIEWS.map((r) => (
            <figure key={r.name} className={styles.card}>
              <p className={styles.quote}>&ldquo;{r.text}&rdquo;</p>
              <figcaption>
                <strong>{r.name}</strong>
                <span className={styles.firm}>{r.firm}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* 12. CTA */}
      <section className={styles.cta}>
        <Image src={IMG.cta} alt="" fill className={styles.cover} aria-hidden />
        <div className={styles.heroOverlay} />
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Ready to find your mould?</h2>
          <p className={styles.heroText}>Join hundreds of manufacturers already running on MouldX.</p>
          <Link href="/" className="btn-primary">Get started <span aria-hidden>→</span></Link>
        </div>
      </section>
    </main>
  );
}

function Heading({ tag, title }: { tag: string; title: string }) {
  return (
    <div className={styles.head}>
      <p className={styles.tag}>{tag}</p>
      <h2 className={styles.h2}>{title}</h2>
    </div>
  );
}
