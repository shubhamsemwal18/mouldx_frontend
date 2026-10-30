"use client";

import { useEffect, useState } from "react";
import { publicApi, type CatalogueCategory } from "./public-api";

// Share requests across the landing page and the search/filter panels.
const requests = new Map<string, { expires: number; promise: Promise<CatalogueCategory[]> }>();
const EMPTY: CatalogueCategory[] = [];

export function useCatalogueCategories(showAll = true, parentSlug?: string, enabled = true) {
  const key = JSON.stringify([showAll, parentSlug ?? ""]);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; categories: CatalogueCategory[]; loading: boolean; error: boolean }>({
    key: "", categories: EMPTY, loading: true, error: false,
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setState({ key, categories: EMPTY, loading: true, error: false });
      let request = requests.get(key);
      if (!request || request.expires <= Date.now()) {
        request = { expires: Date.now() + 60_000, promise: publicApi.listCategories({ showAll, ...(parentSlug ? { parentSlug } : {}) }) };
        requests.set(key, request);
        const current = request;
        request.promise.catch(() => { if (requests.get(key) === current) requests.delete(key); });
      }
      request.promise.then((categories) => {
        if (!cancelled) setState({ key, categories, loading: false, error: false });
      }).catch(() => {
        if (!cancelled) setState({ key, categories: EMPTY, loading: false, error: true });
      });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [key, showAll, parentSlug, enabled, attempt]);

  return {
    categories: enabled && state.key === key ? state.categories : EMPTY,
    loading: enabled && (state.key !== key || state.loading),
    error: enabled && state.key === key && state.error,
    retry: () => { requests.delete(key); setAttempt((value) => value + 1); },
  };
}
