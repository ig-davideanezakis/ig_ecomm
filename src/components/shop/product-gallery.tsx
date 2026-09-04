"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

/**
 * Product image gallery (main image + thumbnails) with a full-screen lightbox.
 *
 * UX spec:
 * - the main image is clickable to enlarge it (lightbox), on mobile and desktop;
 * - inside the lightbox the user can navigate the images with prev/next buttons,
 *   with ArrowLeft/ArrowRight keys and by swiping horizontally on touch devices;
 * - ESC or the X button (or clicking the backdrop) closes the lightbox;
 * - a "N / M" counter shows the position.
 *
 * Accessibility:
 * - the lightbox is a role="dialog" aria-modal="true" element with a proper
 *   accessible name, focus moves to the close button on open and returns to the
 *   triggering image on close; Tab cycles through the dialog controls;
 * - the trigger and all controls are native <button>s with aria-labels;
 * - body scroll is locked while the lightbox is open.
 */

export interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
}

interface ProductGalleryProps {
  images: GalleryImage[];
  /** Product title — used for image alt text and the dialog accessible name. */
  title: string;
  /** Badges rendered over the main image top-left corner (discount, featured…). */
  badges?: React.ReactNode;
}

const wrap = (index: number, length: number) => ((index % length) + length) % length;

export function ProductGallery({ images, title, badges }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    // Focus returns to the trigger image
    triggerRef.current?.focus();
  }, []);

  const current = images[selected];

  return (
    <>
      <div className="min-w-0 space-y-4">
        {/* Main image — white frame: PrestaShop JPGs have a baked white background,
            so images blend seamlessly and are never cropped (object-contain) */}
        <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-white">
          {current ? (
            <Image
              src={current.url}
              alt={current.alt ?? title}
              className="h-full w-full object-contain p-3"
              width={800}
              height={800}
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}

          {/* Badges (discount / featured) — informational, not interactive */}
          {badges && (
            <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-2">
              {badges}
            </div>
          )}

          {/* Zoom affordance hint */}
          {current && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 bottom-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white opacity-90"
            >
              <ZoomIn className="h-4 w-4" />
            </span>
          )}

          {/* Click-to-zoom trigger covering the whole image */}
          {current && (
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label="Ingrandisci immagine"
              aria-expanded={lightboxOpen}
              aria-haspopup="dialog"
              className="absolute inset-0 z-20 cursor-zoom-in rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelected(i)}
                aria-label={`Mostra immagine ${i + 1}`}
                aria-current={i === selected ? "true" : undefined}
                className={`relative aspect-square w-20 shrink-0 overflow-hidden rounded-md border-2 bg-white transition-all ${
                  i === selected
                    ? "border-primary"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <Image
                  src={img.url}
                  alt={img.alt ?? `${title} ${i + 1}`}
                  className="h-full w-full object-contain p-0.5"
                  width={80}
                  height={80}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && current && (
        <ImageLightbox
          images={images}
          startIndex={selected}
          title={title}
          onIndexChange={setSelected}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────

interface ImageLightboxProps {
  images: GalleryImage[];
  startIndex: number;
  title: string;
  /** Called whenever the shown image changes (keeps the thumbnails in sync). */
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

function ImageLightbox({ images, startIndex, title, onIndexChange, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const prevButtonRef = useRef<HTMLButtonElement | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const count = images.length;
  const current = images[index];

  const goTo = useCallback(
    (dir: 1 | -1) => {
      setIndex((i) => {
        const next = wrap(i + dir, count);
        onIndexChange(next);
        return next;
      });
    },
    [count, onIndexChange],
  );

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousBodyOverflow = document.body.style.overflow;

    // Lock page scroll behind the lightbox + move focus into the dialog
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (count === 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(-1);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(1);
        return;
      }
      // Tab — keep focus inside the dialog (close / prev / next)
      if (e.key === "Tab") {
        const controls = [closeButtonRef.current, prevButtonRef.current, nextButtonRef.current].filter(
          (el): el is HTMLButtonElement => el !== null,
        );
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocused?.focus?.();
    };
    // Mount/unmount only: handlers read the latest state via closures captured
    // here (count/goTo/onClose are stable for the whole open session).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Anteprima immagini — ${title}`}
      onMouseDown={onClose}
      className="animate-in fixed inset-0 z-[1100] flex flex-col bg-black/90 backdrop-blur-sm"
    >
      {/* Top bar: counter + close */}
      <div className="flex items-center justify-between p-4 sm:p-6" onMouseDown={(e) => e.stopPropagation()}>
        <p aria-live="polite" className="text-sm font-medium text-white/85">
          <span className="sr-only">Immagine</span>
          {index + 1} / {count}
        </p>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Chiudi anteprima"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Stage: image + navigation */}
      <div
        className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2 pb-6"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const startX = touchStartX.current;
          touchStartX.current = null;
          if (startX === null || count === 1) return;
          const deltaX = (e.changedTouches[0]?.clientX ?? startX) - startX;
          if (deltaX <= -40) goTo(1);
          else if (deltaX >= 40) goTo(-1);
        }}
      >
        {count > 1 && (
          <button
            ref={prevButtonRef}
            type="button"
            onClick={() => goTo(-1)}
            aria-label="Immagine precedente"
            className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-5"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <Image
          src={current.url}
          alt={current.alt ?? `${title} — immagine ${index + 1}`}
          width={1600}
          height={1600}
          sizes="(max-width: 768px) 95vw, 80vw"
          priority
          className="max-h-[78vh] w-auto max-w-[92%] rounded object-contain sm:max-w-[80%]"
        />

        {count > 1 && (
          <button
            ref={nextButtonRef}
            type="button"
            onClick={() => goTo(1)}
            aria-label="Immagine successiva"
            className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-5"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  );
}
