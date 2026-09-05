import { describe, expect, it } from "vitest";
import { parseSpecGroups, serializeSpecGroups } from "@/components/admin/specifications-editor";
import type { SpecGroupDraft } from "@/components/admin/specifications-editor";

describe("specifications editor helpers", () => {
  it("parses a grouped JSON string into editable groups", () => {
    const groups = parseSpecGroups(
      JSON.stringify([
        { group: "Display", rows: [{ label: "Risoluzione", value: "3440 x 1440" }] },
        { group: "Processore", rows: [{ label: "Famiglia processore", value: "Intel Core Ultra 7" }] },
      ]),
    );
    expect(groups).toHaveLength(2);
    expect(groups![0].group).toBe("Display");
    expect(groups![1].rows[0].label).toBe("Famiglia processore");
  });

  it("returns null for legacy HTML content and [] for empty input", () => {
    expect(parseSpecGroups("<table><tr><td>Legacy</td></tr></table>")).toBeNull();
    expect(parseSpecGroups("")).toEqual([]);
    expect(parseSpecGroups("   ")).toEqual([]);
    expect(parseSpecGroups("not json")).toBeNull();
  });

  it("serializes groups back to JSON, dropping empty rows/groups", () => {
    const groups: SpecGroupDraft[] = [
      { group: " Display ", rows: [{ label: "Risoluzione", value: "3440 x 1440" }, { label: "", value: "" }] },
      { group: "", rows: [{ label: "", value: "" }] },
    ];
    const json = serializeSpecGroups(groups);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].group).toBe("Display");
    expect(parsed[0].rows).toHaveLength(1);
  });

  it("round-trips parse → serialize → parse without data loss", () => {
    const original = [
      { group: "Memoria", rows: [{ label: "RAM installata", value: "32 GB" }] },
    ];
    const json = serializeSpecGroups(original);
    expect(parseSpecGroups(json)).toEqual(original);
  });
});
