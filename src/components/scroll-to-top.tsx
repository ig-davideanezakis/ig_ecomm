"use client";

import { useEffect, useState } from "react";

/**
 * Global "scroll back to top" floating button — mounted once in the root
 * layout so it works on the whole application (shop front + admin back).
 *
 * The scrollable element depends on the layout: the shop scrolls the window,
 * the admin area scrolls <main> (overflow-auto). Listen to the window AND to
 * every scroll event at the document capture phase (scroll does not bubble),
 * then check both offsets.
 */
export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const mainEl = document.querySelector("main");
      const top = Math.max(window.scrollY || 0, mainEl ? mainEl.scrollTop : 0);
      setVisible(top > 400);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  const scrollToTop = () => {
    const mainEl = document.querySelector("main");
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Torna in alto"
      title="Torna in alto"
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_18px_rgba(255,12,60,0.45)] transition-all hover:bg-primary/90 hover:scale-105 animate-in fade-in"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
  );
}
