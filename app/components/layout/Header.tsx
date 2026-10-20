"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Menu, X, Bell, User, Repeat, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { useActiveRole } from "@/app/lib/active-role";
import styles from "./Header.module.css";

type MenuItem =
  | { key: string; label: string; icon: typeof Bell; href: string }
  | { key: string; label: string; icon: typeof Bell; onSelect: () => void };

export default function Header() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user, loading } = useAuth();
  const { activeRole, switchRole } = useActiveRole();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const isAdmin = Boolean(user?.approvedRoles?.includes("admin"));
  const isSignedIn = Boolean(user);

  const homeHref = isAdmin ? "/admin" : activeRole === "owner" ? "/owner" : "/";

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
      label: nextRole === "owner" ? "Switch to Owner" : "Switch to Customer",
      icon: Repeat,
      onSelect: () => {
        switchRole(nextRole);
        router.push(nextRole === "owner" ? "/owner" : "/");
      },
    });

    return items;
  };

  const menuItems = buildMenuItems();

  return (
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
  );
}
