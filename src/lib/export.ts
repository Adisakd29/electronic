/**
 * CSV / Excel export helpers. CSV is UTF-8 with BOM so Excel shows Thai.
 */
export type Cell = string | number | boolean | null | undefined;

export const BOM = "﻿";

function csvCell(v: Cell): string {
  if (v == null) return "";
  let s = typeof v === "number" ? (Number.isFinite(v) ? String(v) : "") : String(v);
  // Neutralise spreadsheet formula injection (=, +, -, @ at the start of text).
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Cell[][]): string {
  return BOM + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export interface Sheet {
  name: string;
  rows: Cell[][]; // first row = header
}

export async function toXlsx(sheets: Sheet[]): Promise<Buffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "eelearn";
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name.slice(0, 31).replace(/[\\/?*[\]:]/g, " "));
    for (const r of s.rows) ws.addRow(r.map((c) => (c == null ? null : c)));
    if (s.rows.length) {
      ws.getRow(1).font = { bold: true };
      ws.views = [{ state: "frozen", ySplit: 1 }];
      ws.columns.forEach((col, i) => {
        const max = Math.max(...s.rows.map((r) => String(r[i] ?? "").length), 6);
        col.width = Math.min(40, max + 2);
      });
    }
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

/** RFC 5987 Content-Disposition with a Thai-safe file name. */
export function attachment(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
