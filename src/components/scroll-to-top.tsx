"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Global "Torna su" floating button — mounted once in the root layout so it
 * works on EVERY page of the application (shop front + admin back, whatever
 * the scroll container is).
 *
 * Functional/UI spec:
 * - appears only when the vertical scroll position exceeds 300px;
 * - 200ms fade-in / fade-out (opacity transition) instead of popping in;
 * - fixed bottom-right, above the rest of the UI (z-index: 1000);
 * - smooth scroll back to the top of the page OR of the remembered scrollable
 *   container (the element the user was actually scrolling);
 * - native <button> with aria-label="Torna su": reachable via Tab and
 *   activated with Enter/Space. prefers-reduced-motion users get an instant
 *   jump instead of a smooth scroll.
 *
 * Implementation notes:
 * - `scroll` events do not bubble, but they DO pass through the capture phase
 *   (window → … → target). A capture listener on `document` therefore sees the
 *   scroll of ANY scrollable element on the page. The last real scroller is
 *   remembered so clicking the button scrolls the right container back.
 * - The button stays mounted and toggles opacity/pointer-events/aria-hidden,
 *   which is what lets CSS transition animate BOTH directions (no
 *   exit-animation timers, no @starting-style tricks).
 * - While a dialog is open ([role="dialog"] / [aria-modal="true"]) the button
 *   stays hidden so that, at z-1000, it never floats above a modal. Visibility
 *   is re-evaluated on scroll, click and focusin (a click is what opens/closes
 *   dialogs; focusin fires after the modal is removed and focus returns).
 */

const SHOW_AFTER_PX = 300;

const isDialogOpen = () =>
  document.querySelector('[role="dialog"], [aria-modal="true"]') !== null;

/** "smooth" unless the user asked for reduced motion. */
const getScrollBehavior = (): ScrollBehavior =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  // Last measured scroll depth — used to re-evaluate visibility when a click
  // or a focus change happens without an accompanying scroll event.
  const depthRef = useRef(0);

  useEffect(() => {
    const windowTop = () =>
      window.scrollY || (document.scrollingElement ?? document.documentElement).scrollTop || 0;

    const update = (top: number) => setVisible(top > SHOW_AFTER_PX && !isDialogOpen());

    const onWindowScroll = () => {
      depthRef.current = windowTop();
      update(depthRef.current);
    };

    // Capture phase: fires for the window/document AND for any inner
    // scrollable element (modal, table, custom container, …).
    const onAnyScroll = (e: Event) => {
      const target = e.target as HTMLElement | Document;
      let targetTop = 0;
      if (target !== document) {
        const el = target as HTMLElement;
        targetTop = el.scrollTop || 0;
        // Remember the deepest container that can actually scroll, so the
        // click scrolls the element the user was looking at. Skip containers
        // inside an open dialog (their ref would go stale when it closes).
        if (!isDialogOpen() && (targetTop > 0 || el.scrollHeight > el.clientHeight)) {
          scrollerRef.current = el;
        }
      }
      const mainTop = document.querySelector("main")?.scrollTop ?? 0;
      depthRef.current = Math.max(targetTop, mainTop, windowTop());
      update(depthRef.current);
    };

    // Opening/closing a dialog never scrolls: re-evaluate visibility on click
    // and focusin (focus moves back to the trigger when the dialog closes).
    const reEvaluate = () => update(depthRef.current);

    onWindowScroll();
    window.addEventListener("scroll", onWindowScroll, { passive: true });
    document.addEventListener("scroll", onAnyScroll, { capture: true, passive: true });
    document.addEventListener("click", reEvaluate);
    document.addEventListener("focusin", reEvaluate);
    return () => {
      window.removeEventListener("scroll", onWindowScroll);
      document.removeEventListener("scroll", onAnyScroll, true);
      document.removeEventListener("click", reEvaluate);
      document.removeEventListener("focusin", reEvaluate);
    };
  }, []);

  // When the button disappears while focused (e.g. keyboard user scrolls back
  // above the threshold), drop focus so it is never an aria-hidden focused
  // element (axe "aria-hidden-focus").
  useEffect(() => {
    if (!visible && document.activeElement === buttonRef.current) {
      buttonRef.current?.blur();
    }
  }, [visible]);

  const scrollToTop = () => {
    const behavior = getScrollBehavior();
    // Prefer the remembered scroller, but only if it is still attached to the
    // page and not inside an open dialog; fall back to the admin <main> scroll
    // container. The window scroll below covers the shop front.
    const remembered = scrollerRef.current;
    const scroller =
      remembered && remembered.isConnected && !remembered.closest('[role="dialog"], [aria-modal="true"]')
        ? remembered
        : document.querySelector("main");
    if (scroller && scroller.scrollTop > 0) {
      scroller.scrollTo({ top: 0, behavior });
    }
    window.scrollTo({ top: 0, behavior });
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={scrollToTop}
      aria-label="Torna su"
      title="Torna su"
      aria-hidden={!visible}
      tabIndex={visible ? undefined : -1}
      className={`fixed bottom-6 right-6 z-[1000] flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_18px_rgba(255,12,60,0.45)] transition-all duration-200 ease-out outline-none hover:bg-primary/90 hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
  );
}
