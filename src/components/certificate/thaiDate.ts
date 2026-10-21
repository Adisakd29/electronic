/** Thai (Buddhist era) date formatting for certificates, fixed to Asia/Bangkok. */
const fmt = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });

function parts(iso: string) {
  const p = fmt.formatToParts(new Date(iso));
  const get = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)?.value ?? "";
  return { day: get("day"), month: get("month"), year: get("year") };
}

/** "15 ตุลาคม 2569" */
export function thaiDate(iso: string): string {
  const { day, month, year } = parts(iso);
  return `${day} ${month} ${year}`;
}

/** "วันที่ 15 เดือนตุลาคม พุทธศักราช 2569" — the formal wording on certificates. */
export function thaiDateFormal(iso: string): string {
  const { day, month, year } = parts(iso);
  return `วันที่ ${day} เดือน${month} พุทธศักราช ${year}`;
}
