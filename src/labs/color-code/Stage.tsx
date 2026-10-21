/**
 * Static SVG drawings for the colour-code lab (no hooks — also used by
 * `previewStage` for server-side PNG rendering).
 */
import {
  COLOURS,
  bandRoles,
  colourMeaning,
  decodeSmd,
  formatOhm,
  formatOhmSig,
  formatPercent,
  roleTag,
  summarise,
  type BandCount,
  type ColourName,
  type SmdKind,
} from "./model";

const W = 640;
const H = 300;

/** Body outline: end bulbs + narrower middle ("dog-bone"). */
const BODY =
  "M150 94 C126 94 118 110 118 140 C118 170 126 186 150 186 C172 186 178 176 196 176 L444 176 C462 176 468 186 490 186 C514 186 522 170 522 140 C522 110 514 94 490 94 C468 94 462 104 444 104 L196 104 C178 104 172 94 150 94 Z";

/** x centre of each band. Tolerance band is separated by a wider gap (IEC 60062 reading rule). */
export function bandX(bandCount: BandCount): number[] {
  if (bandCount === 4) return [162, 216, 270, 446];
  if (bandCount === 5) return [162, 210, 258, 306, 446];
  return [162, 208, 254, 300, 412, 472];
}

export function ResistorStage({
  bandCount,
  bands,
  title,
  subtitle,
  activeBand,
  idSuffix = "s",
}: {
  bandCount: BandCount;
  bands: readonly ColourName[];
  title: string;
  subtitle?: string;
  activeBand?: number | null;
  idSuffix?: string;
}) {
  const roles = bandRoles(bandCount);
  const xs = bandX(bandCount);
  const clip = `cc-body-${idSuffix}`;
  const bodyFill = bandCount === 4 ? "#e3c99b" : "#8fb8de";
  let digitIdx = 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden="true">
      <text x={W / 2} y={34} fontSize={26} fontWeight={700} textAnchor="middle" fill="var(--fig-ink)">
        {title}
      </text>
      {subtitle ? (
        <text x={W / 2} y={60} fontSize={16} textAnchor="middle" fill="var(--fig-muted)">
          {subtitle}
        </text>
      ) : null}
      <text x={118} y={86} fontSize={14} fill="var(--fig-muted)">
        อ่านจากด้านนี้ →
      </text>
      {/* leads */}
      <line x1={14} x2={W - 14} y1={140} y2={140} stroke="var(--fig-muted)" strokeWidth={5} strokeLinecap="round" />
      <clipPath id={clip}>
        <path d={BODY} />
      </clipPath>
      <path d={BODY} fill={bodyFill} />
      <g clipPath={`url(#${clip})`}>
        {roles.map((r, i) => {
          const c = bands[i];
          if (!c) return null;
          if (c === "none")
            return (
              <rect key={i} x={xs[i] - 12} y={92} width={24} height={96} fill="none" stroke="#5a5a5a" strokeWidth={1.5} strokeDasharray="4 4" />
            );
          return (
            <rect
              key={i}
              x={xs[i] - 12}
              y={88}
              width={24}
              height={104}
              fill={COLOURS[c].hex}
              stroke="#000000"
              strokeOpacity={0.35}
              strokeWidth={1}
              className="transition-[fill] duration-200 motion-reduce:transition-none"
            />
          );
        })}
        {/* soft highlight for a 3-D look */}
        <rect x={110} y={108} width={420} height={10} fill="#ffffff" opacity={0.18} />
      </g>
      <path d={BODY} fill="none" stroke="#000000" strokeOpacity={0.45} strokeWidth={1.5} />
      {roles.map((r, i) => {
        const c = bands[i];
        const tag = roleTag(r, r === "digit" ? digitIdx++ : 0);
        const active = activeBand === i;
        return (
          <g key={`l${i}`}>
            {active ? <path d={`M${xs[i] - 9} 76 L${xs[i] + 9} 76 L${xs[i]} 90 Z`} fill="var(--fig-accent)" /> : null}
            <text x={xs[i]} y={212} fontSize={16} fontWeight={700} textAnchor="middle" fill={active ? "var(--fig-accent)" : "var(--fig-ink)"}>
              {tag}
            </text>
            <text x={xs[i]} y={234} fontSize={14} textAnchor="middle" fill="var(--fig-ink)">
              {c ? COLOURS[c].th : "?"}
            </text>
            <text x={xs[i]} y={254} fontSize={13} textAnchor="middle" fill="var(--fig-muted)">
              {c ? colourMeaning(c, r) : ""}
            </text>
          </g>
        );
      })}
      <text x={W / 2} y={288} fontSize={13} textAnchor="middle" fill="var(--fig-muted)">
        {bandCount} แถบ · ป้ายใต้แถบ: 1 2 3 = หลักตัวเลข, × = ตัวคูณ, ± = ค่าผิดพลาด{bandCount === 6 ? ", ppm = TCR" : ""}
      </text>
    </svg>
  );
}

export function SmdStage({ code, title, subtitle }: { code: string; title: string; subtitle?: string }) {
  const shown = code.trim().toUpperCase().slice(0, 6) || "—";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden="true">
      <text x={W / 2} y={40} fontSize={16} textAnchor="middle" fill="var(--fig-muted)">
        ชิปตัวต้านทาน SMD (มองจากด้านบน ขยายภาพ)
      </text>
      {/* PCB pads */}
      <rect x={150} y={96} width={70} height={108} rx={4} fill="var(--fig-copper)" opacity={0.85} />
      <rect x={420} y={96} width={70} height={108} rx={4} fill="var(--fig-copper)" opacity={0.85} />
      {/* end terminations */}
      <rect x={176} y={86} width={34} height={128} rx={3} fill="#b9bec5" stroke="#6b7078" />
      <rect x={430} y={86} width={34} height={128} rx={3} fill="#b9bec5" stroke="#6b7078" />
      {/* body */}
      <rect x={206} y={86} width={228} height={128} rx={3} fill="#1f1f1f" stroke="#000000" />
      <text x={320} y={168} fontSize={58} fontWeight={700} textAnchor="middle" fill="#f4f4f4" fontFamily="DejaVu Sans Mono, monospace" letterSpacing={4}>
        {shown}
      </text>
      <text x={W / 2} y={252} fontSize={26} fontWeight={700} textAnchor="middle" fill="var(--fig-ink)">
        {title}
      </text>
      {subtitle ? (
        <text x={W / 2} y={280} fontSize={15} textAnchor="middle" fill="var(--fig-muted)">
          {subtitle}
        </text>
      ) : null}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Captions shared by the live lab and previewStage
// ---------------------------------------------------------------------------

export function resistorCaption(bands: readonly ColourName[], bandCount: BandCount): { title: string; subtitle: string } {
  const { decoded: d, series } = summarise(bands, bandCount);
  if (!d.ok) return { title: "รหัสสีไม่ถูกต้อง", subtitle: d.errors[0] ?? "" };
  const tc = d.tempco !== undefined ? ` · ${d.tempco} ppm/K` : "";
  const title = `${bandCount === 4 ? formatOhm(d.value) : formatOhmSig(d.value, 3)} ${formatPercent(d.tolerance)}${tc}`;
  const subtitle =
    d.value === 0
      ? "ตัวต้านทาน 0 Ω (จัมเปอร์) — ไม่อยู่ใน E-series"
      : series
        ? `✓ เป็นค่ามาตรฐานอนุกรม ${series}`
        : "✗ ไม่ใช่ค่ามาตรฐาน E12/E24/E96 — ตรวจการอ่านอีกครั้ง";
  return { title, subtitle };
}

export const SMD_KIND_TH: Record<SmdKind, string> = {
  zero: "ตัวต้านทาน 0 Ω",
  "3digit": "รหัส 3 หลัก (โดยทั่วไป ±5%)",
  "4digit": "รหัส 4 หลัก (โดยทั่วไป ±1%)",
  R: "รหัส R แทนจุดทศนิยม",
  RKM: "รหัส RKM (IEC 60062)",
  EIA96: "รหัส EIA-96 (±1%)",
};

export function smdCaption(code: string): { title: string; subtitle: string } {
  const r = decodeSmd(code);
  if (!r.ok) return { title: "อ่านรหัสไม่ได้", subtitle: "รองรับ 472 · 4701 · 4R7 · 01C" };
  return { title: `= ${formatOhm(r.value)}`, subtitle: SMD_KIND_TH[r.kind] };
}
