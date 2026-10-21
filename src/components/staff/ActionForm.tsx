"use client";
import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Alert, Button, type ButtonVariant } from "@/components/ui";
import type { FormState } from "@/server/actions/form-state";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

/**
 * A form bound to a staff Server Action via useActionState: shows pending state,
 * Thai success/error messages, one-time secrets (temporary passwords) and CSV downloads.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "กำลังบันทึก…",
  variant = "primary",
  size = "md",
  confirm,
  className,
  inline = false,
  hideSubmit = false,
}: {
  action: Action;
  children?: ReactNode;
  submitLabel: ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  /** Ask for confirmation first (destructive actions). */
  confirm?: string;
  className?: string;
  inline?: boolean;
  hideSubmit?: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const live = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.ts && live.current) live.current.focus();
  }, [state.ts]);
  return (
    <form
      action={formAction}
      className={className ?? (inline ? "inline-flex flex-wrap items-center gap-2" : "space-y-4")}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {hideSubmit ? null : (
        <Button type="submit" variant={variant} size={size} disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      )}
      <div ref={live} tabIndex={-1} aria-live="polite" className={inline ? "w-full outline-none empty:hidden" : "outline-none empty:hidden"}>
        {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
        {state.ok && state.message ? (
          <Alert tone="ok">
            <span className="whitespace-pre-line">{state.message}</span>
          </Alert>
        ) : null}
        {state.secrets?.length ? <Secrets items={state.secrets} /> : null}
        {state.csv ? <CsvLink csv={state.csv} /> : null}
      </div>
    </form>
  );
}

function Secrets({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="mt-2 rounded-md border border-signal/50 bg-signal-soft px-4 py-3">
      <p className="font-semibold text-ink">แสดงเพียงครั้งเดียว — คัดลอกหรือดาวน์โหลดเก็บไว้ก่อนออกจากหน้านี้</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((s) => (
          <li key={s.label + s.value} className="flex flex-wrap items-center gap-2">
            <span className="text-ink-2">{s.label}:</span>
            <code className="readout rounded-sm bg-panel px-2 py-0.5 text-ink">{s.value}</code>
            <CopyButton value={s.value} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center gap-1 rounded-sm px-2 text-[0.85rem] text-ink-2 hover:bg-panel"
      onClick={() => {
        void navigator.clipboard?.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      {done ? "คัดลอกแล้ว" : "คัดลอก"}
    </button>
  );
}

function CsvLink({ csv }: { csv: { fileName: string; text: string } }) {
  const href = useMemo(() => URL.createObjectURL(new Blob([csv.text], { type: "text/csv;charset=utf-8" })), [csv.text]);
  useEffect(() => () => URL.revokeObjectURL(href), [href]);
  return (
    <a href={href} download={csv.fileName} className="mt-2 inline-flex items-center gap-2 font-semibold text-cobalt hover:underline">
      <Download size={16} aria-hidden />
      ดาวน์โหลดรายชื่อและรหัสผ่าน (CSV)
    </a>
  );
}
