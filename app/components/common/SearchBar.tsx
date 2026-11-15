"use client";

import type { FormEvent, ReactNode } from "react";
import { Search, X } from "lucide-react";
import styles from "./SearchBar.module.css";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel?: string;
  maxLength?: number;
  onSubmit?: () => void;
  /** Optional right-side control (filter button, select, etc.) */
  children?: ReactNode;
  className?: string;
};

export default function SearchBar({
  value,
  onChange,
  placeholder,
  ariaLabel = "Search",
  maxLength = 100,
  onSubmit,
  children,
  className = "",
}: SearchBarProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <form
      className={`${styles.row} ${className}`}
      role="search"
      onSubmit={handleSubmit}
    >
      <label className={styles.field}>
        <Search size={18} className={styles.icon} aria-hidden="true" />
        <input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          className={styles.input}
          aria-label={ariaLabel}
          placeholder={placeholder}
          value={value}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
        {value && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => onChange("")}
            aria-label="Clear search"
            title="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </label>
      {children}
    </form>
  );
}