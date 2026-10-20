"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import AdminHeader from "@/app/components/layout/AdminHeader";
import { useAuth } from "@/app/lib/auth-context";
import styles from "./AdminLayout.module.css";

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { label: "Overview", href: "/admin", icon: "◈" },
      { label: "Activity Log", href: "/admin/activity", icon: "🕒" },
    ],
  },
  {
    label: "Approvals",
    items: [
      { label: "KYC", href: "/admin/kyc", icon: "🪪", badge: 4 },
      { label: "Bookings", href: "/admin/bookings", icon: "☰", badge: 3 },
      { label: "Damage Claims", href: "/admin/damage-claims", icon: "⚠" },
    ],
  },
  {
    label: "Product",
    items: [
      { label: "Categories", href: "/admin/categories", icon: "▣" },
      { label: "Listings", href: "/admin/listings", icon: "▦", badge: 7 },
      { label: "Active Listings", href: "/admin/active-listings", icon: "▤" },
    ],
  },
  {
    label: "Operations",
    items: [
      // { label: "Owners", href: "/admin/owners", icon: "🏭" },
      { label: "Support", href: "/admin/support", icon: "💬", badge: 2 },
      { label: "Payments", href: "/admin/payments", icon: "₹" },
      { label: "Users", href: "/admin/users", icon: "◎" },
       { label: "Reviews", href: "/admin/reviews", icon: "▦" },
      
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = Boolean(user?.approvedRoles.includes("admin"));

  useEffect(() => {
    if (loading || isAdmin) return;
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [isAdmin, loading, pathname, router]);

  if (loading) {
    return null;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className={styles.shell}>
      {/* ---------- Mobile top bar ---------- */}
      <div className={styles.mobileBar}>
        <button
          type="button"
          onClick={() => setMobileOpen((p) => !p)}
          className={styles.mobileMenuBtn}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo.png" alt="MouldX" className={styles.logoImg} />
        <span className={styles.mobileSpacer} />
      </div>

      {mobileOpen && <div className={styles.backdrop} onClick={() => setMobileOpen(false)} />}

      {/* ---------- Sidebar ---------- */}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.brandRow}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="MouldX" className={styles.logoImg} />
        </div>

        <nav className={styles.nav}>
          {NAV_SECTIONS.map((section, i) => (
            <div key={i} className={styles.navSection}>
              {section.label && <p className={styles.navSectionLabel}>{section.label}</p>}
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                  >
                    <span className={styles.navIcon} aria-hidden>
                      {item.icon}
                    </span>
                    <span className={styles.navLabel}>{item.label}</span>
                    {"badge" in item && item.badge && (
                      <span className={styles.navBadge}>{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* ---------- Main content ---------- */}
      <main className={styles.main}>
        <AdminHeader />
        {children}
      </main>
    </div>
  );
}
