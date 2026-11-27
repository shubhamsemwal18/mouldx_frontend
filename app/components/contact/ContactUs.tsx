import Image from "next/image";
import styles from "./ContactUs.module.css";

const FALLBACK = "/images/mould-and-chair.webp";
const IMG = {
  hero: FALLBACK,
  cta: FALLBACK,
};

const PHONE_DISPLAY = "+91 9258021090";
const PHONE_TEL = "+919258021090";
const WHATSAPP_NUMBER = "919258021090";
const WHATSAPP_MSG = "Hello MouldX, I would like some information about mould rental.";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MSG)}`;

const EMAIL = "info@mouldx.in";

const ADDRESS_LINES = [
  "Nadehi Road, KDK Complex,",
  "Near Nirankari Bhawan,",
  "Jaspur, Udham Singh Nagar,",
  "Uttarakhand – 244712",
];

const MAP_SRC =
  "https://www.google.com/maps?q=" +
  encodeURIComponent("KDK Complex, Nadehi Road, Jaspur, Uttarakhand 244712") +
  "&output=embed";
const MAP_LINK =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("KDK Complex, Nadehi Road, Jaspur, Uttarakhand 244712");

const METHODS = [
  { icon: "📞", title: "Call us", text: "Talk to our team directly for bookings and quick questions.", value: PHONE_DISPLAY, href: `tel:${PHONE_TEL}` },
  { icon: "💬", title: "WhatsApp", text: "Tap to chat with us instantly. We usually reply within minutes.", value: "Chat on WhatsApp", href: WHATSAPP_URL, external: true },
  { icon: "✉️", title: "Email", text: "Send us your requirement or drawing and we will get back to you.", value: EMAIL, href: `mailto:${EMAIL}` },
  { icon: "📍", title: "Visit us", text: "Drop by our Jaspur office during working hours.", value: "Get directions", href: MAP_LINK, external: true },
];

const SOCIALS = [
  // {
  //   name: "Facebook",
  //   href: "https://facebook.com/",
  //   icon: (
  //     <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
  //       <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
  //     </svg>
  //   ),
  // },
  {
    name: "Instagram",
    href: "https://instagram.com/",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com/",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4v11.5H3zM9.5 9.75h3.83v1.57h.05c.53-1 1.84-2.07 3.79-2.07 4.05 0 4.8 2.66 4.8 6.12v5.88h-4v-5.2c0-1.24-.02-2.84-1.73-2.84-1.73 0-2 1.35-2 2.75v5.29h-4z" />
      </svg>
    ),
  },
  // {
  //   name: "YouTube",
  //   href: "https://youtube.com/",
  //   icon: (
  //     <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
  //       <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.3 5 12 5 12 5s-6.3 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2C2 8.75 2 12 2 12s0 3.25.4 4.8a2.5 2.5 0 0 0 1.76 1.77C5.7 19 12 19 12 19s6.3 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77C22 15.25 22 12 22 12s0-3.25-.4-4.8zM10 15V9l5.2 3z" />
  //     </svg>
  //   ),
  // },
];

const FAQ = [
  {
    q: "How do I make a booking?",
    a: "Choose a mould on the website, select your dates and confirm the booking. You can also talk to us directly on WhatsApp.",
  },
  {
    q: "Which areas do you deliver to?",
    a: "We offer pickup and delivery in Delhi, Haryana, UP, Punjab, Chandigarh and Uttarakhand.",
  },
  {
    q: "What if I need a custom mould?",
    a: "Send us your drawing on WhatsApp or email and we will connect you with the right toolmaker.",
  },
];

export default function ContactUs() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Image src={IMG.hero} alt="MouldX office" fill priority className={styles.cover} />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Contact MouldX</p>
          <h1 className={styles.heroTitle}>Let&apos;s get your production moving</h1>
          <p className={styles.heroText}>
            Call, WhatsApp or visit us. Our team is ready to help you find, book and run the right mould.
          </p>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Chat on WhatsApp <span aria-hidden>→</span>
          </a>
        </div>
      </section>

      <section className={styles.cardsWrap}>
        <div className={styles.methods}>
          {METHODS.map((m) => (
            <a
              key={m.title}
              href={m.href}
              className={styles.method}
              {...(m.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              <span className={styles.icon}>{m.icon}</span>
              <h3 className={styles.h3}>{m.title}</h3>
              <p className={styles.p}>{m.text}</p>
              <span className={styles.value}>{m.value}</span>
            </a>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.split}`}>
        <div>
          <p className={styles.tag}>Find us</p>
          <h2 className={styles.h2}>Our office in Jaspur</h2>
          <address className={styles.address}>
            {ADDRESS_LINES.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </address>

          <ul className={styles.info}>
            <li>
              <span className={styles.infoIcon} aria-hidden>📞</span>
              <a href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>
            </li>
            <li>
              <span className={styles.infoIcon} aria-hidden>✉️</span>
              <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            </li>
            <li>
              <span className={styles.infoIcon} aria-hidden>🕘</span>
              <span>Mon – Sat, 9:00 AM – 7:00 PM</span>
            </li>
          </ul>

          <div className={styles.actions}>
            <a href={MAP_LINK} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Open in Google Maps <span aria-hidden>→</span>
            </a>
          </div>
        </div>

        <div className={styles.mapBox}>
          <iframe
            title="MouldX location on Google Maps"
            src={MAP_SRC}
            className={styles.map}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <section className={`${styles.section} ${styles.alt}`}>
        <div className={styles.head}>
          <p className={styles.tag}>Follow us</p>
          <h2 className={styles.h2}>Stay connected on social media</h2>
        </div>
        <ul className={styles.socials}>
          {SOCIALS.map((s) => (
            <li key={s.name}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
                className={styles.social}
              >
                {s.icon}
                <span>{s.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* <section className={styles.section}>
        <div className={styles.head}>
          <p className={styles.tag}>Quick answers</p>
          <h2 className={styles.h2}>Common questions</h2>
        </div>
        <div className={styles.grid3}>
          {FAQ.map((f) => (
            <div key={f.q} className={styles.card}>
              <h3 className={styles.h3}>{f.q}</h3>
              <p className={styles.p}>{f.a}</p>
            </div>
          ))}
        </div>
      </section> */}

      <section className={styles.cta}>
        <Image src={IMG.cta} alt="" fill className={styles.cover} aria-hidden />
        <div className={styles.heroOverlay} />
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Have a question? Just message us.</h2>
          <p className={styles.heroText}>No forms, no waiting. Tap below and we will reply on WhatsApp.</p>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Start WhatsApp chat <span aria-hidden>→</span>
          </a>
        </div>
      </section>
    </main>
  );
}