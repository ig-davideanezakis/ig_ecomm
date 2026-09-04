import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ProductGallery, type GalleryImage } from "@/components/shop/product-gallery";

// next/image needs the remote pattern config; in jsdom a plain <img> is enough
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
  }) =>
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} width={props.width} height={props.height} className={props.className} />,
}));

const IMAGES: GalleryImage[] = [
  { id: "img-1", url: "https://img.example/1.webp", alt: "Vista frontale" },
  { id: "img-2", url: "https://img.example/2.webp", alt: "Vista posteriore" },
  { id: "img-3", url: "https://img.example/3.webp", alt: null },
];

const renderGallery = (overrides?: { images?: GalleryImage[]; badges?: React.ReactNode }) =>
  render(
    <ProductGallery
      images={overrides?.images ?? IMAGES}
      title="Notebook Test"
      badges={overrides?.badges}
    />,
  );

const dialog = () => screen.queryByRole("dialog", { name: /Anteprima immagini/ });
const closeButton = () => screen.queryByRole("button", { name: "Chiudi anteprima" });

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("ProductGallery", () => {
  it("shows the main image with its alt and the zoom trigger", () => {
    renderGallery();
    const img = document.querySelector<HTMLImageElement>("img[alt='Vista frontale']");
    expect(img).toBeTruthy();
    const zoom = screen.getByRole("button", { name: "Ingrandisci immagine" });
    expect(zoom).toHaveAttribute("aria-expanded", "false");
    expect(zoom).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("falls back to the product title when the image has no alt", () => {
    renderGallery({ images: [{ id: "img-x", url: "https://img.example/x.webp", alt: null }] });
    expect(document.querySelector<HTMLImageElement>("img[alt='Notebook Test']")).toBeTruthy();
  });

  it("renders one thumbnail per extra image and switches the main image on click", () => {
    renderGallery();
    expect(screen.getByRole("button", { name: "Mostra immagine 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mostra immagine 3" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mostra immagine 2" }));
    expect(document.querySelector<HTMLImageElement>("img[alt='Vista posteriore']")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mostra immagine 2" })).toHaveAttribute("aria-current", "true");
  });

  it("does not render thumbnails for a single image", () => {
    renderGallery({ images: [IMAGES[0]] });
    expect(screen.queryByRole("button", { name: /Mostra immagine 2/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ingrandisci immagine" })).toBeInTheDocument();
  });

  it("opens the lightbox on click and moves focus to the close button", () => {
    renderGallery();
    fireEvent.click(screen.getByRole("button", { name: "Ingrandisci immagine" }));

    const dlg = dialog();
    expect(dlg).toBeInTheDocument();
    expect(dlg).toHaveAttribute("aria-modal", "true");
    expect(within(dlg!).getByText(/1 \/ 3/)).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.activeElement).toBe(closeButton());
  });

  it("navigates with the next/previous buttons, wrapping around", () => {
    renderGallery();
    fireEvent.click(screen.getByRole("button", { name: "Ingrandisci immagine" }));
    const dlg = dialog()!;

    fireEvent.click(within(dlg).getByRole("button", { name: "Immagine successiva" }));
    expect(within(dlg).getByText(/2 \/ 3/)).toBeInTheDocument();

    fireEvent.click(within(dlg).getByRole("button", { name: "Immagine precedente" }));
    expect(within(dlg).getByText(/1 \/ 3/)).toBeInTheDocument();

    // Previous on the first image wraps to the last one
    fireEvent.click(within(dlg).getByRole("button", { name: "Immagine precedente" }));
    expect(within(dlg).getByText(/3 \/ 3/)).toBeInTheDocument();
    expect(document.querySelector<HTMLImageElement>("img[alt='Notebook Test — immagine 3']")).toBeTruthy();
  });

  it("navigates with the arrow keys and closes with Escape", () => {
    renderGallery();
    fireEvent.click(screen.getByRole("button", { name: "Ingrandisci immagine" }));

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(within(dialog()!).getByText(/2 \/ 3/)).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(within(dialog()!).getByText(/1 \/ 3/)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(dialog()).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("restores focus to the triggering image on close", () => {
    renderGallery();
    const trigger = screen.getByRole("button", { name: "Ingrandisci immagine" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(document.activeElement).toBe(closeButton());

    fireEvent.click(closeButton()!);
    expect(dialog()).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes when clicking the backdrop", () => {
    renderGallery();
    fireEvent.click(screen.getByRole("button", { name: "Ingrandisci immagine" }));
    expect(dialog()).toBeInTheDocument();

    // mousedown directly on the dialog root = click on the backdrop
    fireEvent.mouseDown(dialog()!);
    expect(dialog()).not.toBeInTheDocument();
  });

  it("swipes left/right to navigate on touch devices", () => {
    renderGallery();
    fireEvent.click(screen.getByRole("button", { name: "Ingrandisci immagine" }));
    const dlg = dialog()!;
    const stage = dlg.querySelector("[class*='touch-pan-y']") as HTMLElement;
    expect(stage).toBeTruthy();

    // Swipe left → next image
    fireEvent.touchStart(stage, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 120 }] });
    expect(within(dlg).getByText(/2 \/ 3/)).toBeInTheDocument();

    // Swipe right → previous image
    fireEvent.touchStart(stage, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 260 }] });
    expect(within(dlg).getByText(/1 \/ 3/)).toBeInTheDocument();

    // Tiny movement → no navigation
    fireEvent.touchStart(stage, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 210 }] });
    expect(within(dlg).getByText(/1 \/ 3/)).toBeInTheDocument();
  });

  it("keeps the thumbnails in sync while navigating the lightbox", () => {
    renderGallery();
    fireEvent.click(screen.getByRole("button", { name: "Ingrandisci immagine" }));
    fireEvent.keyDown(document, { key: "ArrowRight" });
    fireEvent.keyDown(document, { key: "ArrowRight" });

    expect(dialog()).toBeInTheDocument(); // still open
    // thumbnail 3 is now selected
    expect(screen.getByRole("button", { name: "Mostra immagine 3" })).toHaveAttribute("aria-current", "true");
  });

  it("single image: no navigation controls, still opens full screen", () => {
    renderGallery({ images: [IMAGES[0]] });
    fireEvent.click(screen.getByRole("button", { name: "Ingrandisci immagine" }));

    const dlg = dialog()!;
    expect(within(dlg).getByText(/1 \/ 1/)).toBeInTheDocument();
    expect(within(dlg).queryByRole("button", { name: "Immagine successiva" })).not.toBeInTheDocument();
    expect(within(dlg).queryByRole("button", { name: "Immagine precedente" })).not.toBeInTheDocument();
  });

  it("renders badges over the main image without swallowing clicks", () => {
    renderGallery({ badges: <span className="badge-test">-20%</span> });
    const badge = screen.getByText("-20%");
    expect(badge).toBeInTheDocument();
    // The badge wrapper must not be interactive (no role)
    expect(badge.parentElement).not.toHaveAttribute("role");
  });
});
