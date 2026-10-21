/**
 * Summary mind map. Wide containers: SVG radial diagram (centre + branches on
 * both sides, copper traces, text in foreignObject so Thai wraps). Narrow
 * containers: the same data as an indented tree. Server/client safe.
 */
import type { CSSProperties } from "react";

interface Map {
  center: string;
  branches: { label: string; items: string[] }[];
}

const W = 1000;
const BOX_W = 330;
const PAD = 14;
const FONT = 19;
const LINE = 28;
const CHARS = 24; // ≈ Thai characters per line at FONT inside BOX_W

const lines = (s: string, chars = CHARS) => Math.max(1, Math.ceil([...s].length / chars));

function layout(m: Map) {
  const n = m.branches.length;
  const leftN = Math.ceil(n / 2);
  const boxes = m.branches.map((b, i) => {
    const head = lines(b.label, CHARS - 2) * (LINE + 2) + 10;
    const body = b.items.reduce((a, it) => a + lines(it, CHARS - 2) * LINE + 4, 0);
    return { ...b, i, side: i < leftN ? ("left" as const) : ("right" as const), h: head + body + PAD * 2 + 4, head };
  });
  const gap = 22;
  const colH = (side: "left" | "right") => boxes.filter((b) => b.side === side).reduce((a, b) => a + b.h + gap, -gap);
  const H = Math.max(320, colH("left"), colH("right")) + 40;
  const placed = boxes.map((b) => ({ ...b, x: b.side === "left" ? 10 : W - BOX_W - 10, y: 0 }));
  for (const side of ["left", "right"] as const) {
    let y = (H - colH(side)) / 2;
    for (const b of placed.filter((p) => p.side === side)) {
      b.y = y;
      y += b.h + gap;
    }
  }
  return { H, placed };
}

export function MindMap({ map, color = "var(--copper)" }: { map: Map; color?: string }) {
  if (!map.center || !map.branches.length) return null;
  const { H, placed } = layout(map);
  const cx = W / 2;
  const cy = H / 2;
  const r = 92;
  const textStyle: CSSProperties = { fontSize: FONT, lineHeight: `${LINE}px`, fontFamily: "var(--font-sans)" };
  return (
    <div className="ee-mindmap @container">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="hidden h-auto w-full @[44rem]:block print:block"
        aria-hidden="true"
      >
        {placed.map((b) => {
          const ex = b.side === "left" ? b.x + BOX_W : b.x;
          const ey = b.y + PAD + b.head / 2;
          const sx = b.side === "left" ? cx - r : cx + r;
          const mx = (sx + ex) / 2;
          return (
            <path
              key={`p${b.i}`}
              d={`M ${sx} ${cy} C ${mx} ${cy}, ${mx} ${ey}, ${ex} ${ey}`}
              fill="none"
              stroke={color}
              strokeWidth={4}
              strokeLinecap="round"
            />
          );
        })}
        {placed.map((b) => (
          <g key={`b${b.i}`}>
            <circle cx={b.side === "left" ? b.x + BOX_W : b.x} cy={b.y + PAD + b.head / 2} r={7} fill="var(--panel)" stroke={color} strokeWidth={4} />
            <foreignObject x={b.x} y={b.y} width={BOX_W} height={b.h}>
              <div
                style={{ ...textStyle, height: "100%", boxSizing: "border-box", padding: PAD, borderRadius: 10, border: "2px solid var(--line-strong)", background: "var(--panel)", color: "var(--ink-2)" }}
              >
                <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 6, fontSize: FONT + 1 }}>{b.label}</div>
                {b.items.map((it, j) => (
                  <div key={j} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                    <span style={{ flex: "none", width: 7, height: 7, borderRadius: 9, background: color, marginTop: LINE / 2 - 3 }} />
                    <span>{it}</span>
                  </div>
                ))}
              </div>
            </foreignObject>
          </g>
        ))}
        <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke={color} strokeWidth={2} strokeDasharray="6 8" />
        <circle cx={cx} cy={cy} r={r} fill="var(--panel)" stroke={color} strokeWidth={5} />
        <foreignObject x={cx - r + 10} y={cy - r + 10} width={(r - 10) * 2} height={(r - 10) * 2}>
          <div style={{ ...textStyle, height: "100%", display: "grid", placeItems: "center", textAlign: "center", fontWeight: 700, color: "var(--ink)", fontSize: FONT + 2, lineHeight: "26px" }}>
            {map.center}
          </div>
        </foreignObject>
      </svg>

      <div className="@[44rem]:sr-only print:hidden">
        <p className="mb-2 inline-flex rounded-full border-[3px] px-4 py-1 font-bold text-ink" style={{ borderColor: color }}>
          {map.center}
        </p>
        <ul className="ml-4 border-l-[3px] pl-4" style={{ borderColor: color }}>
          {map.branches.map((b, i) => (
            <li key={i} className="relative py-2">
              <span aria-hidden className="absolute -left-4 top-[1.15rem] h-[3px] w-3" style={{ background: color }} />
              <p className="font-semibold text-ink">{b.label}</p>
              <ul className="mt-1 space-y-0.5 pl-1 text-ink-2">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2">
                    <span aria-hidden className="mt-[0.7em] size-1.5 shrink-0 rounded-full" style={{ background: color }} />
                    {it}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
