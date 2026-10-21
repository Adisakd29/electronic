import { describe, expect, it } from "vitest";
import { formatSI, parseSI, eSeriesValues, E12, oneTwoFive } from "./format";

describe("formatSI", () => {
  it("formats with prefixes", () => {
    expect(formatSI(0.0123, "A")).toBe("12.3 mA");
    expect(formatSI(4700, "Ω")).toBe("4.7 kΩ");
    expect(formatSI(1e-4, "F")).toBe("100 µF");
    expect(formatSI(12, "V")).toBe("12 V");
    expect(formatSI(0, "A")).toBe("0 A");
    expect(formatSI(Infinity, "Ω")).toBe("∞ Ω");
    expect(formatSI(999.96, "Ω")).toBe("1 kΩ");
  });
});

describe("parseSI", () => {
  it("parses common notations", () => {
    expect(parseSI("4.7k")).toBe(4700);
    expect(parseSI("4k7")).toBeCloseTo(4700);
    expect(parseSI("4R7")).toBeCloseTo(4.7);
    expect(parseSI("100 µF", "F")).toBeCloseTo(1e-4);
    expect(parseSI("2,200")).toBe(2200);
    expect(parseSI("abc")).toBeNaN();
  });
});

describe("series", () => {
  it("E12 decade", () => {
    expect(eSeriesValues(E12, 100, 1000)).toEqual([100, 120, 150, 180, 220, 270, 330, 390, 470, 560, 680, 820, 1000]);
  });
  it("1-2-5", () => {
    expect(oneTwoFive(0.001, 0.01)).toEqual([0.001, 0.002, 0.005, 0.01]);
  });
});
