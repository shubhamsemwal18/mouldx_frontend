"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Grid3x3, Inbox, User } from "lucide-react";
import styles from "./OwnerBottomNav.module.css";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Bookings", href: "/owner/bookings", icon: ClipboardList },
  { label: "Moulds", href: "/owner/moulds", icon: Grid3x3 },
  { label: "Inbox", href: "/owner/inbox", icon: Inbox },
  { label: "Profile", href: "/profile", icon: User },
];

export default function OwnerBottomNav() {
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
