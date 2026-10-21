const dt = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
const d = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" });

export function fmtDateTime(v: Date | string | null | undefined): string {
  if (!v) return "–";
  return dt.format(typeof v === "string" ? new Date(v) : v);
}

export function fmtDate(v: Date | string | null | undefined): string {
  if (!v) return "–";
  return d.format(typeof v === "string" ? new Date(v) : v);
}

export function pct(v: number | null | undefined): string {
  return v == null ? "–" : `${Math.round(v * 10) / 10} %`;
}

export const kindLabel: Record<string, string> = { pre: "ก่อนเรียน", post: "หลังเรียน", challenge: "ภารกิจท้าทาย", final: "ปลายภาค" };
export const statusLabel: Record<string, string> = { submitted: "รอตรวจ", returned: "ส่งกลับแก้ไข", graded: "ให้คะแนนแล้ว", "not-submitted": "ยังไม่ส่ง", missing: "ยังไม่ส่ง" };
export const bloomLabel: Record<string, string> = { remember: "จำ", understand: "เข้าใจ", apply: "ประยุกต์", analyze: "วิเคราะห์", evaluate: "ประเมิน" };
export const roleLabel: Record<string, string> = { student: "นักเรียน", teacher: "ครู", admin: "ผู้ดูแลระบบ" };
export const levelLabel: Record<number, string> = { 4: "ดีมาก", 3: "ดี", 2: "พอใช้", 1: "ปรับปรุง" };

/** Rough plain-text view of a Markdown/KaTeX string for tables and previews. */
export function plain(md: string, max = 160): string {
  const s = md
    .replace(/\$\$?([^$]*)\$\$?/g, "$1")
    .replace(/\\(text|mathrm|mathbf)\{([^}]*)\}/g, "$2")
    .replace(/\\(times|cdot)/g, "×")
    .replace(/\\Omega/g, "Ω")
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "$1/$2")
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
