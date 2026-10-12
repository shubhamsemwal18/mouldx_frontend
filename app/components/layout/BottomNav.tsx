"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Inbox, User } from "lucide-react";
import styles from "./BottomNav.module.css";

const NAV_ITEMS = [
  { label: "Explore", href: "/", icon: Home },
  { label: "Booking", href: "/bookings", icon: Calendar },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Profile", href: "/profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`${styles.item} ${active ? styles.active : ""}`}
          >
            <span className={styles.iconWrap}>
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
            </span>
            <span className={styles.label}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
