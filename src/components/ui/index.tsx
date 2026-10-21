/**
 * Shared UI primitives (server-safe; no hooks). Interactive ones live in ./client.tsx.
 * Visual language: "workshop schematic" — panels are white sheets on grid paper,
 * 1px ink-tinted borders, radius hierarchy sm (controls) / md (panels) / lg (hero).
 */
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "cobalt" | "ok" | "warn" | "danger" | "info" | "signal" | "copper";

const toneBg: Record<Tone, string> = {
  neutral: "bg-panel-2 text-ink-2 border-line",
  cobalt: "bg-cobalt-soft text-cobalt-ink border-cobalt/30",
  ok: "bg-ok-soft text-ok border-ok/30",
  warn: "bg-warn-soft text-warn border-warn/30",
  danger: "bg-danger-soft text-danger border-danger/30",
  info: "bg-info-soft text-info border-info/30",
  signal: "bg-signal-soft text-ink border-signal/50",
  copper: "bg-copper-soft text-copper border-copper/30",
};

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap";
const btnVariant = {
  primary: "bg-cobalt text-white hover:bg-cobalt-ink dark:text-paper",
  secondary: "bg-panel text-ink border border-line-strong hover:bg-panel-2",
  ghost: "text-ink-2 hover:bg-panel-2 hover:text-ink",
  danger: "bg-danger text-white hover:opacity-90",
  ok: "bg-ok text-white hover:opacity-90",
} as const;
const btnSize = {
  sm: "h-9 px-3 text-[0.9rem]",
  md: "h-11 px-4 text-base",
  lg: "h-13 px-6 text-[1.05rem]",
} as const;

export type ButtonVariant = keyof typeof btnVariant;
export type ButtonSize = keyof typeof btnSize;

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(btnBase, btnVariant[variant], btnSize[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Panel({ className, ...props }: Omit<ComponentProps<"section">, "ref">) {
  return <section className={cn("rounded-md border border-line bg-panel shadow-1", className)} {...props} />;
}

export function PanelHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[1.1rem] font-semibold leading-snug text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-[0.92rem] text-ink-3">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[0.82rem] font-medium leading-6", toneBg[tone], className)}>
      {children}
    </span>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Exclude<Tone, "neutral" | "cobalt" | "copper">;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-md border px-4 py-3", toneBg[tone], className)}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className="text-ink-2">{children}</div> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  label,
  color = "var(--cobalt)",
  className,
}: {
  value: number;
  max?: number;
  label: string; // accessible label
  color?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-panel-2", className)}
    >
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 40,
  stroke = 4,
  color = "var(--cobalt)",
  label,
  children,
}: {
  value: number; // 0–100
  size?: number;
  stroke?: number;
  color?: string;
  label: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--panel-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children ? <span className="absolute inset-0 grid place-items-center text-[0.72rem] font-semibold">{children}</span> : null}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  kicker,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** small context line above the title, e.g. breadcrumbs — sentence case, not all caps */
  kicker?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker ? <div className="mb-1 text-[0.9rem] text-ink-3">{kicker}</div> : null}
        <h1 className="text-[1.6rem] font-bold leading-tight text-ink md:text-[1.9rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-[65ch] text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-line-strong bg-panel px-6 py-10 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {children ? <div className="mx-auto mt-1 max-w-[50ch] text-ink-3">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-panel px-4 py-3">
      <div className="text-[0.88rem] text-ink-3">{label}</div>
      <div className="readout mt-1 text-[1.5rem] font-semibold leading-tight text-ink">{value}</div>
      {hint ? <div className="mt-0.5 text-[0.85rem] text-ink-3">{hint}</div> : null}
    </div>
  );
}

/* ---------------- Forms ---------------- */

export function Field({ label, htmlFor, hint, error, children }: { label: ReactNode; htmlFor: string; hint?: ReactNode; error?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-[0.88rem] text-ink-3">{hint}</p> : null}
      {error ? (
        <p className="text-[0.9rem] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputCls =
  "w-full rounded-sm border border-line-strong bg-panel px-3 h-11 text-ink placeholder:text-ink-3 focus-visible:border-cobalt";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputCls, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputCls, "pr-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputCls, "h-auto min-h-24 py-2 leading-relaxed", className)} {...props} />;
}

/* ---------------- Tables ---------------- */

export function DataTable({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-panel">
      <table className="w-full min-w-[560px] border-collapse text-[0.95rem]">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}
export function Th({ className, ...p }: ComponentProps<"th">) {
  return <th scope="col" className={cn("border-b border-line bg-panel-2 px-3 py-2 text-left font-semibold text-ink-2", className)} {...p} />;
}
export function Td({ className, ...p }: ComponentProps<"td">) {
  return <td className={cn("border-b border-line px-3 py-2 align-top", className)} {...p} />;
}
