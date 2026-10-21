/**
 * Simple grouped bar chart (SVG, design tokens only). Server-safe.
 */
export function BarChart({
  data,
  series,
  max,
  label,
  unit = "",
}: {
  data: { label: string; values: (number | null)[] }[];
  series: { name: string; color: string }[];
  max: number;
  label: string;
  unit?: string;
}) {
  const W = 720;
  const H = 220;
  const pad = { l: 36, r: 8, t: 12, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const group = iw / Math.max(1, data.length);
  const bw = Math.max(3, (group * 0.75) / series.length);
  const m = Math.max(1, max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(m * f));
  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full">
        {ticks.map((t) => {
          const y = pad.t + ih - (t / m) * ih;
          return (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="var(--line)" strokeWidth={1} />
              <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize={11} fill="var(--ink-3)">
                {t}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => (
          <g key={d.label}>
            {d.values.map((v, j) => {
              const h = ((v ?? 0) / m) * ih;
              const x = pad.l + i * group + (group - bw * series.length) / 2 + j * bw;
              return (
                <rect key={j} x={x} y={pad.t + ih - h} width={bw - 1} height={h} rx={2} fill={series[j].color}>
                  <title>{`${d.label} · ${series[j].name}: ${v ?? "–"}${unit}`}</title>
                </rect>
              );
            })}
            <text x={pad.l + i * group + group / 2} y={H - 10} textAnchor="middle" fontSize={11} fill="var(--ink-3)">
              {d.label}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-[0.9rem] text-ink-2">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} aria-hidden />
            {s.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
