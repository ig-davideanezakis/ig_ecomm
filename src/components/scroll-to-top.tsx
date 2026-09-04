"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Global "scroll back to top" floating button — mounted once in the root
 * layout so it works on EVERY page of the application (shop front + admin
 * back, whatever the scroll container is).
 *
 * Strategy:
 * - `scroll` events do not bubble, but they DO pass through the capture
 *   phase (window → … → target). A capture listener on `document` therefore
 *   sees the scroll of ANY scrollable element on the page.
 * - The handler checks the event target's scrollTop plus the window and the
 *   first <main> as fallbacks, so the arrow appears no matter which element
 *   actually scrolls.
 * - The last real scroller is remembered, so clicking the arrow scrolls the
 *   right container back to the top.
 */
export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const scrollerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const windowTop = () =>
      window.scrollY || (document.scrollingElement ?? document.documentElement).scrollTop || 0;

    const update = (top: number) => setVisible(top > 300);

    const onWindowScroll = () => update(windowTop());

    // Capture phase: fires for the window/document AND for any inner
    // scrollable element (modal, table, custom container, …).
    const onAnyScroll = (e: Event) => {
      const target = e.target as HTMLElement | Document;
      let targetTop = 0;
      if (target !== document) {
        targetTop = (target as HTMLElement).scrollTop || 0;
        // Remember the deepest container that can actually scroll, so the
        // click scrolls the element the user was looking at.
        const el = target as HTMLElement;
        if (targetTop > 0 || el.scrollHeight > el.clientHeight) {
          scrollerRef.current = el;
        }
      }
      const mainTop = document.querySelector("main")?.scrollTop ?? 0;
      update(Math.max(targetTop, mainTop, windowTop()));
    };

    onWindowScroll();
    window.addEventListener("scroll", onWindowScroll, { passive: true });
    document.addEventListener("scroll", onAnyScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener("scroll", onWindowScroll);
      document.removeEventListener("scroll", onAnyScroll, true);
    };
  }, []);

  const scrollToTop = () => {
    const scroller = scrollerRef.current;
    if (scroller && scroller.scrollTop > 0) {
      scroller.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const mainEl = document.querySelector("main");
      if (mainEl) mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
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
