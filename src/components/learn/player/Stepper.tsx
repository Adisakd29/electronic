/**
 * Learning-path stepper drawn as a circuit line with nodes (vias).
 * Server-safe; used live in the player and as the Suspense fallback.
 */
import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { stages, type StageKey } from "@/content/course";
import { cn } from "@/lib/cn";

export function stageState(key: StageKey, done: readonly StageKey[]) {
  const i = stages.findIndex((s) => s.key === key);
  const before = stages.slice(0, i).map((s) => s.key);
  return { done: done.includes(key), ready: before.every((k) => done.includes(k)) };
}

export function Stepper({
  basePath,
  current,
  done = [],
  open,
  color = "var(--copper)",
  interactive = true,
}: {
  basePath: string;
  current: StageKey;
  done?: readonly StageKey[];
  /** Stages the learner may open; omitted = all (staff preview, fallback skeleton). */
  open?: readonly StageKey[];
  color?: string;
  interactive?: boolean;
}) {
  return (
    <nav aria-label="ขั้นตอนการเรียนสัปดาห์นี้" className="ee-stepper print:hidden">
      <ol className="relative grid grid-cols-6">
        {stages.map((s, i) => {
          const st = stageState(s.key, done);
          const closed = open ? !open.includes(s.key) : false;
          const isCur = s.key === current;
          const lit = st.done;
          const nextLit = i < stages.length - 1 && st.done && done.includes(stages[i + 1].key);
          const node = (
            <>
              {/* trace segment to the next node */}
              {i < stages.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute left-1/2 top-[18px] h-[3px] w-full"
                  style={{ background: nextLit || (st.done && stages[i + 1].key === current) ? color : "var(--line-strong)" }}
                />
              ) : null}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 grid size-[38px] place-items-center rounded-full border-[3px] bg-panel text-[0.9rem] font-bold transition-colors",
                  isCur && "ring-4 ring-cobalt/25",
                )}
                style={{
                  borderColor: lit || isCur ? color : "var(--line-strong)",
                  background: lit ? color : undefined,
                  color: lit ? "var(--panel)" : isCur ? "var(--ink)" : "var(--ink-3)",
                }}
              >
                {lit ? <Check className="size-5" strokeWidth={3} /> : (closed || !st.ready) && !isCur ? <Lock className="size-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "mt-1.5 block px-0.5 text-center text-[0.8rem] leading-tight sm:text-[0.88rem]",
                  isCur ? "font-semibold text-ink" : "text-ink-3",
                  !isCur && "max-sm:sr-only",
                )}
              >
                {s.label}
              </span>
              <span className="sr-only">
                {st.done ? " (ทำเสร็จแล้ว)" : isCur ? " (ขั้นปัจจุบัน)" : closed ? " (ยังไม่เปิด ทำขั้นก่อนหน้าให้เสร็จก่อน)" : !st.ready ? " (ควรทำขั้นก่อนหน้าให้เสร็จก่อน)" : ""}
              </span>
            </>
          );
          return (
            <li key={s.key} className="relative flex flex-col items-center">
              {interactive && !closed ? (
                <Link
                  href={`${basePath}/${s.key}`}
                  aria-current={isCur ? "step" : undefined}
                  className="group relative flex w-full flex-col items-center rounded-sm pb-1 hover:[&_span]:text-ink"
                  prefetch={false}
                >
                  {node}
                </Link>
              ) : (
                <span className={cn("relative flex w-full flex-col items-center pb-1", closed && "cursor-not-allowed opacity-80")} aria-disabled={closed || undefined}>
                  {node}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
