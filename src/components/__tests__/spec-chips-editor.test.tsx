import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpecChipsEditor } from "@/components/admin/spec-chips-editor";
import { DEFAULT_SPEC_CHIPS } from "@/lib/spec-chips";

const DEFAULTS_JSON = JSON.stringify(DEFAULT_SPEC_CHIPS);

function lastPayload(mock: ReturnType<typeof vi.fn>): unknown[] {
  const call = mock.mock.calls.at(-1)?.[0] as string;
  return JSON.parse(call);
}

describe("SpecChipsEditor", () => {
  it("renders one editable row per configured chip", () => {
    const onChange = vi.fn();
    render(<SpecChipsEditor value={DEFAULTS_JSON} onChange={onChange} />);
    expect(screen.getAllByPlaceholderText("es. CPU, RAM, Archiviazione")).toHaveLength(
      DEFAULT_SPEC_CHIPS.length,
    );
    expect(screen.getAllByLabelText("Icona")).toHaveLength(DEFAULT_SPEC_CHIPS.length);
    // Live icon previews render for every row
    expect(document.querySelectorAll("svg")).toHaveLength(DEFAULT_SPEC_CHIPS.length);
  });

  it("edits a label and serializes the change back", () => {
    const onChange = vi.fn();
    render(<SpecChipsEditor value={DEFAULTS_JSON} onChange={onChange} />);
    const labelInputs = screen.getAllByPlaceholderText("es. CPU, RAM, Archiviazione");
    fireEvent.change(labelInputs[0], { target: { value: "Processore" } });
    const parsed = lastPayload(onChange);
    expect(parsed[0].label).toBe("Processore");
    expect(parsed).toHaveLength(DEFAULT_SPEC_CHIPS.length);
  });

  it("removes a chip from the configuration", () => {
    const onChange = vi.fn();
    render(<SpecChipsEditor value={DEFAULTS_JSON} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Rimuovi CPU" }));
    const parsed = lastPayload(onChange);
    expect(parsed).toHaveLength(DEFAULT_SPEC_CHIPS.length - 1);
    expect(parsed[0].label).toBe("RAM");
  });

  it("reorders chips via the up arrow", () => {
    const onChange = vi.fn();
    render(<SpecChipsEditor value={DEFAULTS_JSON} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Sposta RAM in alto" }));
    const parsed = lastPayload(onChange);
    expect(parsed[0].label).toBe("RAM");
    expect(parsed[1].label).toBe("CPU");
  });

  it("adds an empty row (dropped on save until filled)", () => {
    const onChange = vi.fn();
    render(<SpecChipsEditor value={DEFAULTS_JSON} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Aggiungi caratteristica" }));
    expect(screen.getAllByPlaceholderText("es. CPU, RAM, Archiviazione")).toHaveLength(
      DEFAULT_SPEC_CHIPS.length + 1,
    );
    // Blank rows are filtered out of the serialized config
    expect(lastPayload(onChange)).toHaveLength(DEFAULT_SPEC_CHIPS.length);
  });

  it("shows the empty state and restores defaults on demand", () => {
    const onChange = vi.fn();
    render(<SpecChipsEditor value="[]" onChange={onChange} />);
    expect(screen.getByText(/Nessuna chip configurata/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Carica chip predefinite" }));
    expect(lastPayload(onChange)).toHaveLength(DEFAULT_SPEC_CHIPS.length);
    expect(
      screen.getAllByPlaceholderText("es. CPU, RAM, Archiviazione")[0],
    ).toHaveValue("CPU");
  });

  it("falls back to the defaults when the stored value is malformed", () => {
    const onChange = vi.fn();
    render(<SpecChipsEditor value="not-json" onChange={onChange} />);
    expect(screen.getAllByPlaceholderText("es. CPU, RAM, Archiviazione")).toHaveLength(
      DEFAULT_SPEC_CHIPS.length,
    );
  });
});
