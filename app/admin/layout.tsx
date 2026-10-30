"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import AdminHeader from "@/app/components/layout/AdminHeader";
import { useAuth } from "@/app/lib/auth-context";
import { AdminNotificationProvider, useAdminNotifications } from "@/app/lib/admin-notification-context";
import { adminApi, type PendingCounts } from "@/app/lib/admin-api";
import styles from "./AdminLayout.module.css";

type NavItem = { label: string; href: string; icon: string; badge?: keyof PendingCounts };

const NAV_SECTIONS: { label: string | null; items: NavItem[] }[] = [
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
      { label: "KYC", href: "/admin/kyc", icon: "🪪", badge: "kyc" },
      { label: "Bookings", href: "/admin/bookings", icon: "☰", badge: "bookings" },
    ],
  },
  {
    label: "Product",
    items: [
      { label: "Categories", href: "/admin/categories", icon: "▣" },
      { label: "Listings", href: "/admin/listings", icon: "▦", badge: "listings" },
      { label: "Active Listings", href: "/admin/active-listings", icon: "▤" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Support", href: "/admin/support", icon: "💬" },
      { label: "Users", href: "/admin/users", icon: "◎" },
      { label: "Reviews", href: "/admin/reviews", icon: "★" },
    ],
  },
];

const BADGE_REFRESH_MS = 60000;

/** Live counts of items awaiting review; refreshed on navigation, admin activity and a timer. */
function usePendingCounts(pathname: string) {
  const { version } = useAdminNotifications();
  const [counts, setCounts] = useState<PendingCounts | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (document.visibilityState === "hidden") return;
      adminApi.getPendingCounts()
        .then((next) => { if (!cancelled) setCounts(next); })
        .catch(() => { /* Badges are advisory; keep the last known counts. */ });
    };
    const initial = window.setTimeout(load, 0);
    const timer = window.setInterval(load, BADGE_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [pathname, version]);

  return counts;
}

function isActive(pathname: string, href: string) {
  // Overview is the admin root; every other admin path starts with it.
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

function AdminNav({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const counts = usePendingCounts(pathname);

  return (
    <nav className={styles.nav}>
      {NAV_SECTIONS.map((section, i) => (
        <div key={i} className={styles.navSection}>
          {section.label && <p className={styles.navSectionLabel}>{section.label}</p>}
          {section.items.map((item) => {
            const active = isActive(pathname, item.href);
            const badge = item.badge && counts ? counts[item.badge] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              >
                <span className={styles.navIcon} aria-hidden>
                  {item.icon}
                </span>
                <span className={styles.navLabel}>{item.label}</span>
                {badge > 0 && (
                  <span className={styles.navBadge} aria-label={`${badge} pending review`}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = Boolean(user?.approvedRoles.includes("admin"));
  const isSupportChat = /^\/admin\/support\/[^/]+$/.test(pathname);

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
    <AdminNotificationProvider key={user?._id}><div className={styles.shell}>
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

        <AdminNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* ---------- Main content ---------- */}
      <main className={`${styles.main} ${isSupportChat ? styles.chatMain : ""}`}>
        {!isSupportChat && <AdminHeader />}
        {children}
      </main>
    </div></AdminNotificationProvider>
  );
}
