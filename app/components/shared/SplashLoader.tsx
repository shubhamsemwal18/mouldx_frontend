"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "splashShown";

export default function SplashLoader({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);

  const finishLoading = useCallback(() => {
    sessionStorage.setItem(KEY, "1");
    setLoading(false);
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem(KEY)) return;

    const startLoader = window.setTimeout(() => setLoading(true), 0);
    return () => window.clearTimeout(startLoader);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const fallback = setTimeout(() => finishLoading(), 6000);
    return () => clearTimeout(fallback);
  }, [finishLoading, loading]);

  if (!loading) return <>{children}</>;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <video
        autoPlay
        muted
        playsInline
        onEnded={finishLoading}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      >
        <source src="/videos/loader.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
