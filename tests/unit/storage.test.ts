import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isValidKey, LocalDiskStorage, randomKey, safeFileName, sniffFileType } from "@/lib/storage";
import { toCsv, BOM } from "@/lib/export";

const pad = (b: number[], n = 64) => new Uint8Array([...b, ...new Array(Math.max(0, n - b.length)).fill(0)]);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe("file type sniffing", () => {
  it("detects allowed types from magic bytes", () => {
    expect(sniffFileType(pad(ascii("%PDF-1.7\n")))).toBe("pdf");
    expect(sniffFileType(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(sniffFileType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("png");
    expect(sniffFileType(pad([...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WEBPVP8 ")]))).toBe("webp");
    expect(sniffFileType(pad([0, 0, 0, 0x18, ...ascii("ftypheic")]))).toBe("heic");
    expect(sniffFileType(pad([0x50, 0x4b, 0x03, 0x04, ...ascii("....[Content_Types].xml....word/document.xml")]))).toBe("docx");
  });
  it("rejects everything else", () => {
    expect(sniffFileType(pad(ascii("<html><script>")))).toBeNull();
    expect(sniffFileType(pad(ascii("MZ executable")))).toBeNull();
    expect(sniffFileType(pad([0x50, 0x4b, 0x03, 0x04, ...ascii("plain.zip")]))).toBeNull(); // zip, not docx
    expect(sniffFileType(pad([0, 0, 0, 0x18, ...ascii("ftypmp42")]))).toBeNull(); // mp4
    expect(sniffFileType(new Uint8Array([0x25, 0x50]))).toBeNull(); // too short
  });
  it("keys are random and validated (no path traversal)", () => {
    const k = randomKey("pdf");
    expect(isValidKey(k)).toBe(true);
    expect(randomKey("pdf")).not.toBe(k);
    expect(isValidKey("../etc/passwd")).toBe(false);
    expect(isValidKey("abc.pdf")).toBe(false);
  });
  it("sanitises display file names", () => {
    expect(safeFileName("C:\\Users\\x\\ใบงาน 1.pdf", "pdf")).toBe("ใบงาน 1.pdf");
    expect(safeFileName("", "png")).toBe("file.png");
  });
  it("local disk adapter round-trips", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "eel-"));
    try {
      const s = new LocalDiskStorage(dir);
      const k = randomKey("png");
      await s.put(k, new Uint8Array([1, 2, 3]), "image/png");
      expect([...(await s.get(k))!]).toEqual([1, 2, 3]);
      await s.delete(k);
      expect(await s.get(k)).toBeNull();
      await expect(s.put("../x.pdf", new Uint8Array([1]), "x")).rejects.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("csv export", () => {
  it("adds BOM, escapes and neutralises formulas", () => {
    const csv = toCsv([["ชื่อ", "a,b", '"q"', "=SUM(A1)", 5, null]]);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv).toContain('"a,b"');
    expect(csv).toContain('"""q"""');
    expect(csv).toContain("'=SUM(A1)");
    expect(csv.trim().endsWith("5,")).toBe(true);
  });
});
