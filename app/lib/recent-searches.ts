"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Recently searched terms, kept in the browser so the search sheet can offer
 * them again. Per-device convenience only — never sent to the server.
 */
const RECENT_SEARCHES_KEY = "mouldx_recent_searches";
const RECENT_SEARCHES_CHANGED_EVENT = "mouldx:recent-searches-changed";
const MAX_RECENT = 8;
const MAX_TERM_LENGTH = 80;

const EMPTY: string[] = [];

/** Cached so useSyncExternalStore sees a stable reference between reads. */
let snapshot: string[] = EMPTY;
let snapshotRaw: string | null = null;

const read = (): string[] => {
  if (typeof window === "undefined") return EMPTY;

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);

    if (raw === snapshotRaw) return snapshot;
    snapshotRaw = raw;

    if (!raw) {
      snapshot = EMPTY;
      return snapshot;
    }

    const parsed: unknown = JSON.parse(raw);
    snapshot = Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === "string").slice(0, MAX_RECENT)
      : EMPTY;

    return snapshot;
  } catch {
    snapshot = EMPTY;
    return snapshot;
  }
};

const write = (terms: string[]) => {
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(terms));
  } catch {
    // Private mode or blocked storage: history simply does not persist.
  }

  window.dispatchEvent(new CustomEvent(RECENT_SEARCHES_CHANGED_EVENT));
};

export function getRecentSearches(): string[] {
  return read();
}

/** Newest first, case-insensitively de-duplicated, capped at MAX_RECENT. */
export function addRecentSearch(term: string) {
  if (typeof window === "undefined") return;

  const trimmed = term.trim().slice(0, MAX_TERM_LENGTH);
  if (!trimmed) return;

  const existing = read();
  const next = [
    trimmed,
    ...existing.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_RECENT);

  write(next);
}

export function removeRecentSearch(term: string) {
  if (typeof window === "undefined") return;
  write(read().filter((item) => item.toLowerCase() !== term.toLowerCase()));
}

export function clearRecentSearches() {
  if (typeof window === "undefined") return;
  write([]);
}

const subscribe = (onChange: () => void) => {
  window.addEventListener(RECENT_SEARCHES_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(RECENT_SEARCHES_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};

const getServerSnapshot = (): string[] => EMPTY;

export function useRecentSearches() {
  const recent = useSyncExternalStore(subscribe, read, getServerSnapshot);

  return {
    recent,
    add: useCallback((term: string) => addRecentSearch(term), []),
    remove: useCallback((term: string) => removeRecentSearch(term), []),
    clear: useCallback(() => clearRecentSearches(), []),
  };
}
