import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScrollToTop from "@/components/scroll-to-top";

/**
 * ScrollToTop component tests.
 *
 * Spec under test:
 * - appears only when the scroll position exceeds 300px (page OR scrollable
 *   container), hidden otherwise (aria-hidden + not focusable);
 * - 200ms CSS fade transition wired for both directions;
 * - fixed bottom-right, above the rest of the UI (z-index 1000);
 * - click (or Enter/Space on the focused button) scrolls back to the top with
 *   behavior "smooth" (or "auto" under prefers-reduced-motion);
 * - stays hidden while a dialog is open.
 *
 * jsdom has no layout, so scroll geometry is mocked and scroll events are
 * dispatched manually on window / on a fake scrollable container.
 */

const scrollButton = () => screen.queryByRole("button", { name: "Torna su" });
const domButton = () =>
  document.querySelector('button[aria-label="Torna su"]') as HTMLButtonElement | null;

const mockWindowScrollY = (top: number) => {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    writable: true,
    value: top,
  });
};

/** Make an element look like a scrollable container with the given offset. */
const makeScrollable = (el: HTMLElement, scrollTop: number) => {
  Object.defineProperties(el, {
    scrollTop: { configurable: true, writable: true, value: scrollTop },
    scrollHeight: { configurable: true, writable: true, value: scrollTop + 2400 },
    clientHeight: { configurable: true, writable: true, value: 400 },
  });
};

beforeEach(() => {
  mockWindowScrollY(0);
  window.scrollTo = vi.fn();
  Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("ScrollToTop", () => {
  it("is hidden (aria-hidden, not focusable, opacity 0) at the top of the page", () => {
    render(<ScrollToTop />);

    expect(scrollButton()).not.toBeInTheDocument();
    const button = domButton();
    expect(button).not.toBeNull();
    expect(button).toHaveAttribute("aria-hidden", "true");
    expect(button).toHaveAttribute("tabindex", "-1");
    // Fade wiring: 200ms transition present in both states.
    expect(button!.className).toContain("duration-200");
    expect(button!.className).toContain("transition-all");
    expect(button!.className).toContain("opacity-0");
    expect(button!.className).toContain("pointer-events-none");
    // Spec placement: fixed bottom-right above everything else.
    expect(button!.className).toContain("fixed");
    expect(button!.className).toContain("bottom-6");
    expect(button!.className).toContain("right-6");
    expect(button!.className).toContain("z-[1000]");
  });

  it("appears only when the vertical scroll exceeds 300px", () => {
    render(<ScrollToTop />);

    mockWindowScrollY(300); // exactly at the threshold → still hidden
    fireEvent.scroll(window);
    expect(scrollButton()).not.toBeInTheDocument();
    expect(domButton()).toHaveAttribute("aria-hidden", "true");

    mockWindowScrollY(301);
    fireEvent.scroll(window);
    const button = scrollButton();
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Torna su");
    expect(button).toHaveAttribute("aria-hidden", "false");
    expect(button).not.toHaveAttribute("tabindex");
    expect(domButton()!.className).toContain("opacity-100");
  });

  it("scrolling back above the threshold hides the button again", () => {
    render(<ScrollToTop />);

    mockWindowScrollY(800);
    fireEvent.scroll(window);
    expect(scrollButton()).toBeInTheDocument();

    mockWindowScrollY(150);
    fireEvent.scroll(window);
    expect(scrollButton()).not.toBeInTheDocument();
    expect(domButton()).toHaveAttribute("aria-hidden", "true");
    expect(domButton()!.className).toContain("opacity-0");
    expect(domButton()!.className).toContain("pointer-events-none");
  });

  it("click scrolls the window back to the top with smooth behavior", () => {
    render(<ScrollToTop />);

    mockWindowScrollY(900);
    fireEvent.scroll(window);
    fireEvent.click(scrollButton()!);

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("tracks a custom scroll container and scrolls THAT back to the top", () => {
    render(<ScrollToTop />);

    const container = document.createElement("div");
    document.body.appendChild(container);
    makeScrollable(container, 600);

    fireEvent.scroll(container);
    expect(scrollButton()).toBeInTheDocument();

    fireEvent.click(scrollButton()!);
    expect(container.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    // Window is at the top here, so only the container call matters — but the
    // window scroll is still attempted (covers the shop front).
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it("is reachable and activatable via keyboard (Enter and Space)", async () => {
    const user = userEvent.setup();
    render(<ScrollToTop />);

    mockWindowScrollY(900);
    fireEvent.scroll(window);

    const button = scrollButton()!;
    expect(button).toBeInTheDocument();
    button.focus();
    expect(document.activeElement).toBe(button);

    await user.keyboard("{Enter}");
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });

    mockWindowScrollY(900); // back down again for the second activation
    fireEvent.scroll(window);
    button.focus();
    await user.keyboard(" ");
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
  });

  it("uses an instant jump when prefers-reduced-motion is set", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    render(<ScrollToTop />);

    mockWindowScrollY(900);
    fireEvent.scroll(window);
    fireEvent.click(scrollButton()!);

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });

  it("stays hidden while a dialog is open and reappears once it closes", () => {
    render(<ScrollToTop />);

    mockWindowScrollY(900);
    fireEvent.scroll(window);
    expect(scrollButton()).toBeInTheDocument();

    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);

    // Opening a dialog never scrolls the page: the click re-evaluation hides it.
    fireEvent.click(document.body);
    expect(scrollButton()).not.toBeInTheDocument();
    expect(domButton()).toHaveAttribute("aria-hidden", "true");

    // Dialog closed (removed) and focus returns to the trigger → reappears.
    dialog.remove();
    fireEvent.focusIn(document.body);
    expect(scrollButton()).toBeInTheDocument();
  });

  it("drops focus when it disappears while focused (no aria-hidden focused element)", () => {
    render(<ScrollToTop />);

    mockWindowScrollY(900);
    fireEvent.scroll(window);
    const button = scrollButton()!;
    button.focus();
    expect(document.activeElement).toBe(button);

    mockWindowScrollY(0);
    fireEvent.scroll(window);
    expect(document.activeElement).not.toBe(button);
    expect(domButton()).toHaveAttribute("aria-hidden", "true");
  });
});
