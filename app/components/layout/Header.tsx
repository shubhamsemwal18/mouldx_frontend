"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  Bell,
  User,
  Repeat,
  LayoutDashboard,
  CircleCheck,
  Store,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { useActiveRole, type ActiveRole } from "@/app/lib/active-role";
import styles from "./Header.module.css";

type MenuItem =
  | { key: string; label: string; icon: typeof Bell; href: string }
  | { key: string; label: string; icon: typeof Bell; onSelect: () => void };

/** Keep in sync with the `roleToastLife` animation duration in the CSS module. */
const ROLE_TOAST_DURATION_MS = 3000;

const ROLE_META: Record<
  ActiveRole,
  { label: string; icon: typeof Bell; className: string; message: string }
> = {
  owner: {
    label: "Host",
    icon: Store,
    className: styles.roleOwner,
    message: "You are now using the website as a Host.",
  },
  customer: {
    label: "User",
    icon: UserRound,
    className: styles.roleCustomer,
    message: "You are now using the website as a User.",
  },
};

export default function Header() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { activeRole, switchRole } = useActiveRole();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // The role a switch was requested to, held until `activeRole` actually
  // reflects it. Leaving the owner area only settles once the route changes,
  // so the toast waits for that instead of announcing a switch that has not
  // landed — and never appears if it does not.
  const [pendingToastRole, setPendingToastRole] = useState<ActiveRole | null>(null);
  // `id` remounts the toast, so a repeat switch restarts it rather than stacking.
  const [roleToast, setRoleToast] = useState<{ role: ActiveRole; id: number } | null>(
    null,
  );

  if (pendingToastRole && pendingToastRole === activeRole) {
    setPendingToastRole(null);
    setRoleToast({ role: activeRole, id: (roleToast?.id ?? 0) + 1 });
  }

  useEffect(() => {
    if (!roleToast) return;

    const timer = window.setTimeout(() => setRoleToast(null), ROLE_TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [roleToast]);

  const isAdmin = Boolean(user?.approvedRoles?.includes("admin"));
  const isSignedIn = Boolean(user);

  // Both modes share `/`; the active role decides which home it renders.
  const homeHref = isAdmin ? "/admin" : "/";

  const closeMenu = () => {
    setOpen(false);
    menuButtonRef.current?.focus();
  };

  // Escape closes the menu. The listener is attached only while it is open.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  /**
   * Admins get a direct route to their dashboard. Everyone else gets a switch
   * between the customer and owner profiles, labelled by the role they are
   * *not* currently in.
   */
  const buildMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [
      // Static for now — there is no notifications backend yet.
      { key: "notifications", label: "Notifications", icon: Bell, href: "#" },
      { key: "profile", label: "Profile", icon: User, href: "/profile" },
    ];

    if (isAdmin) {
      items.push({
        key: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/admin",
      });

      return items;
    }

    const nextRole = activeRole === "owner" ? "customer" : "owner";

    items.push({
      key: "switch-role",
      label: `Switch to ${ROLE_META[nextRole].label}`,
      icon: Repeat,
      onSelect: () => {
        setPendingToastRole(nextRole);
        switchRole(nextRole);
        // On `/` the switch alone swaps the home; elsewhere, go to it.
        if (pathname !== "/") router.push("/");
      },
    });

    return items;
  };

  const menuItems = buildMenuItems();
  const roleMeta = ROLE_META[activeRole];
  const RoleIcon = roleMeta.icon;
  const toastMeta = roleToast ? ROLE_META[roleToast.role] : null;

  return (
    <>
      <header className={styles.header}>
        <Link href={homeHref} className={styles.logoLink}>
          <Image
            src="/images/logo.png"
            alt="MouldX"
            width={140}
            height={32}
            priority
            className={styles.logoImg}
          />
        </Link>

        {/* The menu only exists for a signed-in user. While auth is still
            resolving we render nothing rather than flashing the wrong state. */}
        {!loading && isSignedIn && (
          <>
            <div className={styles.headerActions}>
              {/* Admins have no profile switch, so there is no mode to show. */}
              {!isAdmin && (
                <span
                  className={`${styles.roleBadge} ${roleMeta.className}`}
                  title="Your current mode"
                >
                  <RoleIcon size={14} aria-hidden="true" />
                  {roleMeta.label} Mode
                </span>
              )}

              <button
                ref={menuButtonRef}
                type="button"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                aria-haspopup="menu"
                className={styles.menuBtn}
                onClick={() => setOpen((prev) => !prev)}
              >
                {open ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>

            {open && (
              <>
                {/* click outside to close */}
                <div className={styles.backdrop} onClick={closeMenu} />

                <div className={styles.dropdown} role="menu">
                  {menuItems.map((item) => {
                    const Icon = item.icon;

                    if ("href" in item) {
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          role="menuitem"
                          className={styles.dropdownItem}
                          onClick={() => setOpen(false)}
                        >
                          <Icon size={18} />
                          {item.label}
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={item.key}
                        type="button"
                        role="menuitem"
                        className={styles.dropdownItem}
                        onClick={() => {
                          setOpen(false);
                          item.onSelect();
                        }}
                      >
                        <Icon size={18} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </header>

      {/* Rendered outside <header> so its stacking context cannot clip it. */}
      {roleToast && toastMeta && (
        <div
          key={roleToast.id}
          className={`${styles.roleToast} ${toastMeta.className}`}
          role="status"
          aria-live="polite"
        >
          <span className={styles.roleToastIcon}>
            <CircleCheck size={20} aria-hidden="true" />
          </span>
          <div className={styles.roleToastBody}>
            <p className={styles.roleToastTitle}>Switched to {toastMeta.label} Mode</p>
            <p className={styles.roleToastMessage}>{toastMeta.message}</p>
          </div>
        </div>
      )}
    </>
  );
}
