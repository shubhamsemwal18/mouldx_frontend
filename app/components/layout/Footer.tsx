"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import { FaFacebookF, FaInstagram, FaXTwitter, FaLinkedinIn } from "react-icons/fa6";
import styles from "./Footer.module.css";


const SHOW_FOOTER_ON = ["/", "/home", "/owner" , "/about", "/faqs", "/agreement", "/contact", "/privacy-policy", "/terms"];

const SERVICEABLE_AREAS = ["Delhi", "Haryana", "Uttar Pradesh", "Punjab", "Chandigarh", "Uttarakhand"];

const QUICK_LINKS = [
  { label: "FAQs", href: "/faqs" },
  { label: "About Us", href: "/about" },
  { label: "Agreement", href: "/agreement" },
  { label: "Contact Us", href: "/contact" },
];

const SOCIAL_LINKS = [
  { label: "Facebook", href: "#", icon: FaFacebookF },
  { label: "Instagram", href: "#", icon: FaInstagram },
  { label: "Twitter", href: "#", icon: FaXTwitter },
  { label: "LinkedIn", href: "#", icon: FaLinkedinIn },
];

export default function Footer() {
  const pathname = usePathname(); 
  const year = new Date().getFullYear();

  const cleanPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  if (!SHOW_FOOTER_ON.includes(cleanPath)) return null;

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          {/* Brand */}
          <div className={styles.brandCol}>
            <Link href="/" className={styles.logoLink}>
              <Image
                src="/images/logo.png"
                alt="MouldX"
                width={140}
                height={32}
                className={styles.logoImg}
              />
            </Link>
            <p className={styles.tagline}>Smart. Reliable. Built for better connectivity.</p>

            <div className={styles.socialRow}>
              {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className={styles.socialBtn}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Serviceable areas */}
          <div className={styles.col}>
            <h3 className={styles.colTitle}>Serviceable Areas</h3>
            <ul className={styles.linkList}>
              {SERVICEABLE_AREAS.map((area) => (
                <li key={area} className={styles.linkItemStatic}>
                  {area}
                </li>
              ))}
            </ul>
          </div>

          {/* Quick links */}
          <div className={styles.col}>
            <h3 className={styles.colTitle}>Quick Links</h3>
            <ul className={styles.linkList}>
              {QUICK_LINKS.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={styles.linkItem}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className={styles.col}>
            <p className={styles.contactName}>MouldX Private Limited</p>
            <address className={styles.address}>
              Nadehi Road, KDK Complex,
              <br />
              Near Nirankari Bhawan,
              <br />
              Jaspur, Udham Singh Nagar,
              <br />
              Uttarakhand – 244712
            </address>
            <a href="tel:+917500152505" className={styles.phoneLink}>
              <Phone size={14} />
              +91-7500152505
            </a>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.bottomRow}>
          <p className={styles.copyright}>© {year} MouldX Private Limited</p>
          <div className={styles.legalLinks}>
            <Link href="/privacy-policy" className={styles.legalLink}>
              Privacy Policy
            </Link>
            <span className={styles.legalSep} aria-hidden>
              |
            </span>
            <Link href="/terms" className={styles.legalLink}>
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
