import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import IcecatDialog from "@/components/admin/icecat-dialog";
import type { IcecatProductData } from "@/lib/icecat";

const data: IcecatProductData = {
  found: true,
  title: "HP Pavilion 15",
  brand: "HP",
  brandLogo: "https://cdn.icecat.biz/img/brand/hp.jpg",
  ean: "1234567890123",
  categoryHint: "Notebook",
  shortDesc: "Notebook leggero e potente.",
  longDesc: "<p>Descrizione lunga completa.</p>",
  weight: 1.85,
  dimensions: { width: "35.6", height: "2.2", depth: "25.2" },
  images: [
    { url: "https://cdn.icecat.biz/img/1.jpg", alt: "Front" },
    { url: "https://cdn.icecat.biz/img/2.jpg", alt: "" },
  ],
  specs: [
    { label: "CPU", value: "Intel i5" },
    { label: "RAM", value: "16 GB" },
  ],
  bulletPoints: "Sottile e leggero\nBatteria 10 ore",
};

const snapshot = {
  title: "",
  description: "",
  content: "",
  weight: "",
  brandId: "",
  categoryId: "",
};

const brands = [{ id: "b1", name: "HP", slug: "hp" }];
const categories = [{ id: "c1", name: "Notebook", slug: "notebook" }];

function renderDialog(overrides: Partial<Parameters<typeof IcecatDialog>[0]> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    data,
    snapshot,
    brands,
    categories,
    onApply: vi.fn(),
    ...overrides,
  };
  return render(<IcecatDialog {...props} />);
}

describe("IcecatDialog", () => {
  it("renders nothing when there is no data", () => {
    const { container } = renderDialog({ data: null });
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a section per importable field", () => {
    renderDialog();
    expect(screen.getByText("Dati trovati su Icecat")).toBeInTheDocument();
    for (const label of [
      "Titolo",
      "Descrizione breve",
      "Descrizione lunga",
      "Punti chiave",
      "Specifiche tecniche",
      "Peso",
      "Immagini",
      "Marca",
      "Categoria suggerita",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("pre-checks sections and allows toggling them off", () => {
    renderDialog();
    const titleCheckbox = screen.getByLabelText(/HP Pavilion 15/) as HTMLInputElement;
    // Labels wrap the whole section, so query the checkbox by its id instead.
    const checkbox = document.getElementById(
      "icecat-section-title",
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it("disables the apply button when no section is selected", () => {
    renderDialog();
    const applyButton = screen.getByRole("button", { name: /Importa selezionate/ });
    expect(applyButton).not.toBeDisabled();

    // Uncheck every section.
    const checkboxes = document.querySelectorAll<HTMLInputElement>(
      'input[id^="icecat-section-"]',
    );
    expect(checkboxes.length).toBeGreaterThan(0);
    checkboxes.forEach((cb) => {
      if (cb.checked) fireEvent.click(cb);
    });
    expect(applyButton).toBeDisabled();
  });

  it("calls onApply with the selected sections and closes", () => {
    const onApply = vi.fn();
    const onOpenChange = vi.fn();
    renderDialog({ onApply, onOpenChange });

    // Default: everything selected. Deselect only the title.
    fireEvent.click(document.getElementById("icecat-section-title") as HTMLInputElement);

    fireEvent.click(screen.getByRole("button", { name: /Importa selezionate/ }));
    expect(onApply).toHaveBeenCalledTimes(1);
    const selected = onApply.mock.calls[0][0] as Set<string>;
    expect(selected.has("title")).toBe(false);
    expect(selected.has("specs")).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows a warning badge for fields that would overwrite existing values", () => {
    renderDialog({
      snapshot: { ...snapshot, title: "Titolo esistente", weight: "2.1" },
    });
    const badges = screen.getAllByText(/già compilato/);
    expect(badges.length).toBe(2);
    const titleCheckbox = document.getElementById(
      "icecat-section-title",
    ) as HTMLInputElement;
    expect(titleCheckbox.checked).toBe(false);
  });

  it("shows image thumbnails when the images section is selected", () => {
    renderDialog();
    const imgs = document.querySelectorAll<HTMLImageElement>(
      'img[src^="https://cdn.icecat.biz"]',
    );
    expect(imgs.length).toBe(2);
  });

  it("closes without applying when cancelled", () => {
    const onOpenChange = vi.fn();
    const onApply = vi.fn();
    renderDialog({ onOpenChange, onApply });

    fireEvent.click(screen.getByRole("button", { name: "Annulla" }));
    expect(onApply).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalled();
  });
});
