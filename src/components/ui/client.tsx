"use client";
/**
 * Client-side primitives: Dialog / Drawer (native <dialog>: focus trap, Escape,
 * focus return), Disclosure, Tooltip, Tabs, Segmented control.
 */
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ Dialog */

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  side,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  /** Drawer mode: slide in from the left edge. */
  side?: "left";
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Close when hidden by <Activity> (navigating away keeps the page mounted).
  useLayoutEffect(() => {
    const d = ref.current;
    return () => {
      if (d?.open) d.close();
    };
  }, []);

  const sizes = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", full: "max-w-[min(1400px,calc(100vw-1rem))]" } as const;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop
      }}
      className={cn(
        "ee-dialog m-auto bg-transparent p-0 text-ink backdrop:bg-[rgb(10_18_30/0.55)]",
        side === "left"
          ? "ee-drawer ml-0 h-dvh max-h-dvh w-[min(22rem,88vw)] max-w-none"
          : cn("w-[calc(100vw-1rem)]", sizes[size]),
        className,
      )}
    >
      {open ? (
        <div
          className={cn(
            "flex flex-col border border-line bg-panel shadow-2",
            side === "left" ? "h-full rounded-none" : "max-h-[calc(100dvh-2rem)] rounded-lg",
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-[1.1rem] font-semibold leading-snug">
                {title}
              </h2>
              {description ? (
                <p id={descId} className="text-[0.92rem] text-ink-3">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 grid size-10 shrink-0 place-items-center rounded-sm text-ink-2 hover:bg-panel-2 hover:text-ink"
              aria-label="ปิด"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}

/* -------------------------------------------------------------- Disclosure */

export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  className,
  buttonClassName,
  icon,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  buttonClassName?: string;
  icon?: ReactNode;
}) {
  const [inner, setInner] = useState(defaultOpen);
  const open = openProp ?? inner;
  const id = useId();
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setInner(!open);
          onOpenChange?.(!open);
        }}
        className={cn(
          "flex w-full items-center gap-3 rounded-sm px-4 py-3 text-left font-semibold text-ink hover:bg-panel-2",
          buttonClassName,
        )}
      >
        {icon}
        <span className="min-w-0 flex-1">{summary}</span>
        <ChevronDown className={cn("size-5 shrink-0 text-ink-3 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      <div id={id} hidden={!open}>
        {children}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Tooltip */

/**
 * Shows `content` on hover and keyboard focus; the trigger gets
 * aria-describedby. Escape hides it. The trigger must be focusable.
 */
export function Tooltip({ content, children, side = "top" }: { content: ReactNode; children: ReactElement<Record<string, unknown>>; side?: "top" | "right" | "bottom" }) {
  const [show, setShow] = useState(false);
  const id = useId();
  const child = Children.only(children);
  if (!isValidElement(child)) return child;
  const trigger = cloneElement(child, {
    "aria-describedby": id,
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    onFocus: () => setShow(true),
    onBlur: () => setShow(false),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Escape") setShow(false);
      const orig = child.props.onKeyDown as ((e: KeyboardEvent) => void) | undefined;
      orig?.(e);
    },
  });
  const pos = {
    top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
    bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
    right: "left-full top-1/2 ml-2 -translate-y-1/2",
  }[side];
  return (
    <span className="relative inline-flex">
      {trigger}
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 w-max max-w-[16rem] rounded-sm border border-line-strong bg-ink px-2.5 py-1.5 text-[0.85rem] leading-snug text-paper shadow-2",
          pos,
          show ? "opacity-100" : "sr-only opacity-0",
        )}
      >
        {content}
      </span>
    </span>
  );
}

/* -------------------------------------------------------------------- Tabs */

export function Tabs<K extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: { key: K; label: ReactNode }[];
  value: K;
  onChange: (k: K) => void;
  label: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    let j = i;
    if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[j].key);
    refs.current[j]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-1 overflow-x-auto border-b border-line", className)}>
      {tabs.map((t, i) => (
        <button
          key={t.key}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          aria-selected={t.key === value}
          tabIndex={t.key === value ? 0 : -1}
          onClick={() => onChange(t.key)}
          onKeyDown={(e) => onKey(e, i)}
          className={cn(
            "-mb-px whitespace-nowrap border-b-2 px-3 py-2 font-semibold",
            t.key === value ? "border-cobalt text-ink" : "border-transparent text-ink-3 hover:text-ink",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- Segmented */

export function Segmented<K extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { key: K; label: ReactNode; icon?: ReactNode }[];
  value: K;
  onChange: (k: K) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex rounded-sm border border-line-strong bg-panel p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={o.key === value}
          onClick={() => onChange(o.key)}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-[4px] px-3 text-[0.9rem] font-semibold",
            o.key === value ? "bg-ink text-paper" : "text-ink-2 hover:bg-panel-2",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- useDebounced */

export function useDebouncedCallback<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  const fnRef = useRef(fn);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => () => {
    if (t.current) clearTimeout(t.current);
  }, []);
  return useCallback(
    (...a: A) => {
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => fnRef.current(...a), ms);
    },
    [ms],
  );
}
