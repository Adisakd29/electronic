import { describe, expect, it } from "vitest";
import { buildBoard } from "./roadmap-geometry";

describe("buildBoard", () => {
  const b = buildBoard(18, 6, { dx: 200, dy: 150, margin: 90, r: 34 });
  it("lays 18 pads out as a serpentine", () => {
    expect(b.pads).toHaveLength(18);
    expect(b.width).toBe(90 * 2 + 200 * 5);
    expect(b.height).toBe(90 * 2 + 150 * 2);
    // row 0 left→right, row 1 right→left
    expect(b.pads[0]).toMatchObject({ x: 90, y: 90, row: 0 });
    expect(b.pads[5]).toMatchObject({ x: 1090, row: 0 });
    expect(b.pads[6]).toMatchObject({ x: 1090, y: 240, row: 1 });
    expect(b.pads[11]).toMatchObject({ x: 90, row: 1 });
    expect(b.pads[12]).toMatchObject({ x: 90, row: 2 });
  });
  it("has one trace per consecutive pair and routes row changes outside the board edge pads", () => {
    expect(b.traces).toHaveLength(17);
    expect(b.traces[0]).toBe("M 124 90 L 256 90");
    // segment 5 (week 6 → 7) bends on the right side
    expect(b.traces[5].startsWith("M 1124 90")).toBe(true);
    expect(b.traces[11].startsWith("M 56 240")).toBe(true);
  });
  it("handles an incomplete last row", () => {
    const c = buildBoard(18, 4, { dx: 100, dy: 100, margin: 60, r: 20 });
    expect(c.pads[17].row).toBe(4);
    expect(c.height).toBe(60 * 2 + 100 * 4);
  });
});
