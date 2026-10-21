"use client";
/**
 * Shared lab UI kit. Every lab composes these so the 10 simulations share one
 * look: a schematic "stage" (SVG drawing of the circuit/device), a controls
 * column, and instrument-style readouts in a monospace face.
 */
import { useId, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatSI } from "./format";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function LabShell({
  stage,
  controls,
  readouts,
  footer,
  compact = false,
  stageLabel,
}: {
  /** Main visual (SVG drawing / scope screen). */
  stage: ReactNode;
  controls: ReactNode;
  readouts?: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
  /** Accessible description of the stage (what is drawn). */
  stageLabel: string;
}) {
  return (
    <div className={cn("grid gap-4", compact ? "lg:grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_320px]")}>
      <div className="min-w-0 space-y-3">
        <div
          className="overflow-hidden rounded-md border border-line bg-[var(--fig-bg)] p-2"
          role="img"
          aria-label={stageLabel}
        >
          {stage}
        </div>
        {readouts ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">{readouts}</div> : null}
      </div>
      <div className="space-y-4 rounded-md border border-line bg-panel p-4">{controls}</div>
      {footer ? <div className={cn(compact ? "" : "lg:col-span-2")}>{footer}</div> : null}
    </div>
  );
}

export function ControlGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 font-semibold text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit = "",
  log = false,
  format,
  disabled,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Logarithmic slider (for R, C, f spanning decades). */
  log?: boolean;
  format?: (v: number) => string;
  disabled?: boolean;
  hint?: string;
}) {
  const id = useId();
  const [text, setText] = useState<string | null>(null);
  const pos = log ? (Math.log10(value) - Math.log10(min)) / (Math.log10(max) - Math.log10(min)) : (value - min) / (max - min);
  const toValue = (p: number) => {
    if (!log) {
      const raw = min + p * (max - min);
      const s = step ?? (max - min) / 200;
      return Math.min(max, Math.max(min, Math.round(raw / s) * s));
    }
    const v = 10 ** (Math.log10(min) + p * (Math.log10(max) - Math.log10(min)));
    // snap to 3 significant digits
    return Math.min(max, Math.max(min, Number(v.toPrecision(2))));
  };
  const shown = format ? format(value) : formatSI(value, unit);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[0.95rem] font-medium text-ink">
          {label}
        </label>
        <input
          aria-label={`${label} (พิมพ์ค่า)`}
          className="readout w-28 rounded-sm border border-line bg-panel-2 px-2 py-0.5 text-right text-[0.92rem] text-ink"
          value={text ?? shown}
          disabled={disabled}
          onFocus={() => setText(String(Number(value.toPrecision(6))))}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            if (text !== null) {
              const v = parseNumberLoose(text);
              if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
            }
            setText(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={1000}
        step={1}
        disabled={disabled}
        value={Math.round(Math.min(1, Math.max(0, pos)) * 1000)}
        aria-valuetext={shown}
        onChange={(e) => onChange(toValue(Number(e.target.value) / 1000))}
        className="w-full accent-[var(--cobalt)]"
      />
      {hint ? <p className="text-[0.82rem] text-ink-3">{hint}</p> : null}
    </div>
  );
}

function parseNumberLoose(s: string): number {
  const t = s.trim().replace(/,/g, "");
  const m = t.match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)\s*([GMkKmuµμnp])?/);
  if (!m) return NaN;
  const mult: Record<string, number> = { G: 1e9, M: 1e6, k: 1e3, K: 1e3, m: 1e-3, u: 1e-6, µ: 1e-6, μ: 1e-6, n: 1e-9, p: 1e-12 };
  return Number(m[1]) * (m[2] ? mult[m[2]] : 1);
}

export function LabSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-[0.95rem] font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 w-full rounded-sm border border-line-strong bg-panel px-2 text-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Segmented radio group (e.g. topology, dial positions, tabs inside a lab). */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  size = "md",
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  size?: "sm" | "md";
}) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className="space-y-1">
      <div className="text-[0.95rem] font-medium text-ink">{label}</div>
      <div className="flex flex-wrap gap-1 rounded-sm border border-line bg-panel-2 p-1">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <label
              key={o.value}
              className={cn(
                "cursor-pointer rounded-[5px] px-3 text-center font-medium transition-colors",
                size === "sm" ? "py-1 text-[0.85rem]" : "py-1.5 text-[0.92rem]",
                active ? "bg-panel text-cobalt-ink shadow-1" : "text-ink-2 hover:text-ink",
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={active}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-3">
      <label htmlFor={id} className="cursor-pointer">
        <span className="font-medium text-ink">{label}</span>
        {description ? <span className="block text-[0.85rem] text-ink-3">{description}</span> : null}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-1 h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked ? "border-cobalt bg-cobalt" : "border-line-strong bg-panel-2",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-1 transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
        <span className="sr-only">{checked ? "เปิด" : "ปิด"}</span>
      </button>
    </div>
  );
}

export function LabButton({
  children,
  onClick,
  tone = "secondary",
  disabled,
  pressed,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "danger" | "ok";
  disabled?: boolean;
  /** For momentary push-buttons rendered as toggles. */
  pressed?: boolean;
  className?: string;
}) {
  const tones = {
    primary: "bg-cobalt text-white hover:bg-cobalt-ink",
    secondary: "bg-panel text-ink border border-line-strong hover:bg-panel-2",
    danger: "bg-danger text-white hover:opacity-90",
    ok: "bg-ok text-white hover:opacity-90",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={cn("h-10 rounded-sm px-3 font-semibold transition-colors disabled:opacity-50", tones[tone], className)}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Readouts
// ---------------------------------------------------------------------------

export function Readout({
  label,
  value,
  unit,
  digits = 3,
  tone = "neutral",
  text,
}: {
  label: string;
  /** Numeric value in base SI unit; formatted with prefix. */
  value?: number;
  unit?: string;
  digits?: number;
  tone?: "neutral" | "ok" | "warn" | "danger";
  /** Pre-formatted text instead of value/unit. */
  text?: string;
}) {
  const tones = {
    neutral: "border-line",
    ok: "border-ok/50 bg-ok-soft",
    warn: "border-warn/50 bg-warn-soft",
    danger: "border-danger/50 bg-danger-soft",
  };
  const shown = text ?? (value === undefined ? "—" : formatSI(value, unit ?? "", digits));
  return (
    <div className={cn("rounded-sm border bg-panel px-3 py-2", tones[tone])} aria-live="polite">
      <div className="text-[0.82rem] text-ink-3">{label}</div>
      <div className="readout text-[1.15rem] font-semibold leading-tight text-ink">{shown}</div>
    </div>
  );
}

/** Seven-segment style digital display (multimeter, bench supply). */
export function DigitalDisplay({ text, unit, label, dim = false }: { text: string; unit?: string; label: string; dim?: boolean }) {
  return (
    <div
      aria-label={`${label}: ${text} ${unit ?? ""}`}
      role="status"
      className="flex items-baseline justify-end gap-2 rounded-sm border-2 border-[#3b4a3a] bg-[#c9d6b8] px-3 py-2 text-[#1d2a1c] shadow-inner dark:bg-[#9fb08f]"
    >
      <span className={cn("readout text-[2rem] font-bold tracking-wider", dim && "opacity-30")}>{text}</span>
      {unit ? <span className="readout text-[1rem] font-semibold">{unit}</span> : null}
    </div>
  );
}

export function AssumptionsPanel({ items }: { items: string[] }) {
  return (
    <details className="rounded-md border border-line bg-panel-2 px-4 py-3">
      <summary className="cursor-pointer font-semibold text-ink">ข้อสมมติและขอบเขตความแม่นยำของแบบจำลอง</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.92rem] text-ink-2">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </details>
  );
}

export function SimNotice({ children, tone = "warn" }: { children: ReactNode; tone?: "warn" | "danger" | "info" }) {
  const tones = {
    warn: "border-warn/40 bg-warn-soft",
    danger: "border-danger/40 bg-danger-soft",
    info: "border-info/40 bg-info-soft",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-sm border px-3 py-2 text-[0.92rem] text-ink", tones[tone])}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plot (SVG line chart)
// ---------------------------------------------------------------------------

export interface PlotSeries {
  name: string;
  points: [number, number][];
  color?: string; // CSS colour or var()
  dashed?: boolean;
  /** Draw as markers only (recorded data points). */
  markers?: boolean;
}

export function Plot({
  series,
  xLabel,
  yLabel,
  xUnit = "",
  yUnit = "",
  xDomain,
  yDomain,
  height = 260,
  vLines = [],
  hLines = [],
  cursorX,
  title,
}: {
  series: PlotSeries[];
  xLabel: string;
  yLabel: string;
  xUnit?: string;
  yUnit?: string;
  xDomain?: [number, number];
  yDomain?: [number, number];
  height?: number;
  vLines?: { x: number; label?: string; color?: string }[];
  hLines?: { y: number; label?: string; color?: string }[];
  cursorX?: number;
  title: string; // accessible
}) {
  const clipId = "clip" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const W = 600;
  const H = height;
  const m = { l: 64, r: 16, t: 16, b: 52 };
  const all = series.flatMap((s) => s.points);
  const [x0, x1] = xDomain ?? extent(all.map((p) => p[0]));
  const [y0, y1] = yDomain ?? niceDomain(extent(all.map((p) => p[1])));
  const sx = (x: number) => m.l + ((x - x0) / (x1 - x0 || 1)) * (W - m.l - m.r);
  const sy = (y: number) => H - m.b - ((y - y0) / (y1 - y0 || 1)) * (H - m.t - m.b);
  const xt = useMemo(() => ticks(x0, x1, 5), [x0, x1]);
  const yt = useMemo(() => ticks(y0, y1, 5), [y0, y1]);
  const palette = ["var(--fig-accent)", "var(--fig-current)", "var(--fig-ok)", "var(--fig-accent-2)"];
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={title}>
        <rect x={m.l} y={m.t} width={W - m.l - m.r} height={H - m.t - m.b} fill="var(--fig-bg)" stroke="var(--fig-grid)" />
        {xt.map((t) => (
          <g key={`x${t}`}>
            <line x1={sx(t)} x2={sx(t)} y1={m.t} y2={H - m.b} stroke="var(--fig-grid)" />
            <text x={sx(t)} y={H - m.b + 20} fontSize={15} textAnchor="middle" fill="var(--fig-muted)">
              {formatSI(t, "", 3)}
            </text>
          </g>
        ))}
        {yt.map((t) => (
          <g key={`y${t}`}>
            <line x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} stroke="var(--fig-grid)" />
            <text x={m.l - 8} y={sy(t)} fontSize={15} textAnchor="end" dominantBaseline="middle" fill="var(--fig-muted)">
              {formatSI(t, "", 3)}
            </text>
          </g>
        ))}
        <text x={(m.l + W - m.r) / 2} y={H - 10} fontSize={16} textAnchor="middle" fill="var(--fig-ink)">
          {xLabel}
          {xUnit ? ` (${xUnit})` : ""}
        </text>
        <text
          x={16}
          y={(m.t + H - m.b) / 2}
          fontSize={16}
          textAnchor="middle"
          fill="var(--fig-ink)"
          transform={`rotate(-90 16 ${(m.t + H - m.b) / 2})`}
        >
          {yLabel}
          {yUnit ? ` (${yUnit})` : ""}
        </text>
        <clipPath id={clipId}>
          <rect x={m.l} y={m.t} width={W - m.l - m.r} height={H - m.t - m.b} />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          {vLines.map((v, i) => (
            <g key={`v${i}`}>
              <line x1={sx(v.x)} x2={sx(v.x)} y1={m.t} y2={H - m.b} stroke={v.color ?? "var(--fig-muted)"} strokeDasharray="5 4" />
              {v.label ? (
                <text x={sx(v.x) + 4} y={m.t + 16} fontSize={14} fill={v.color ?? "var(--fig-muted)"}>
                  {v.label}
                </text>
              ) : null}
            </g>
          ))}
          {hLines.map((h, i) => (
            <g key={`h${i}`}>
              <line x1={m.l} x2={W - m.r} y1={sy(h.y)} y2={sy(h.y)} stroke={h.color ?? "var(--fig-muted)"} strokeDasharray="5 4" />
              {h.label ? (
                <text x={W - m.r - 4} y={sy(h.y) - 6} fontSize={14} textAnchor="end" fill={h.color ?? "var(--fig-muted)"}>
                  {h.label}
                </text>
              ) : null}
            </g>
          ))}
          {series.map((s, i) => {
            const color = s.color ?? palette[i % palette.length];
            if (s.markers)
              return (
                <g key={s.name}>
                  {s.points.map(([x, y], j) => (
                    <circle key={j} cx={sx(x)} cy={sy(y)} r={5} fill={color} stroke="var(--fig-bg)" strokeWidth={1.5} />
                  ))}
                </g>
              );
            const d = s.points.map(([x, y], j) => `${j ? "L" : "M"}${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`).join(" ");
            return <path key={s.name} d={d} fill="none" stroke={color} strokeWidth={2.5} strokeDasharray={s.dashed ? "7 5" : undefined} />;
          })}
          {cursorX !== undefined ? (
            <line x1={sx(cursorX)} x2={sx(cursorX)} y1={m.t} y2={H - m.b} stroke="var(--fig-ink)" strokeWidth={1.5} />
          ) : null}
        </g>
      </svg>
      {series.length > 1 ? (
        <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[0.85rem] text-ink-2">
          {series.map((s, i) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-0.5 w-5"
                style={{ background: s.color ?? palette[i % palette.length], borderTop: s.dashed ? "2px dashed" : undefined }}
              />
              {s.name}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}

function extent(v: number[]): [number, number] {
  if (!v.length) return [0, 1];
  let a = Infinity;
  let b = -Infinity;
  for (const x of v) {
    if (Number.isFinite(x)) {
      if (x < a) a = x;
      if (x > b) b = x;
    }
  }
  if (a === b) return [a - 1, b + 1];
  return [a, b];
}

function niceDomain([a, b]: [number, number]): [number, number] {
  const span = b - a;
  const pad = span * 0.08;
  return [a >= 0 && a - pad < 0 ? 0 : a - pad, b + pad];
}

function ticks(a: number, b: number, n: number): number[] {
  const span = b - a;
  if (!(span > 0)) return [a];
  const raw = span / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let t = Math.ceil(a / step) * step; t <= b + step * 1e-9; t += step) out.push(Number(t.toPrecision(10)));
  return out;
}
