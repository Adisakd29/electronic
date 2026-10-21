"use client";
/**
 * The 18-week learning roadmap drawn as a PCB: week "pads" coloured by
 * category, joined by a copper trace whose segments light up as weeks are
 * completed. Pads are links; hover/focus shows the week's details.
 */
import { useId, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Lock } from "lucide-react";
import { categoryInfo, weekMeta, type WeekMeta } from "@/content/course";
import type { WeekStatus } from "@/server/contracts";
import { cn } from "@/lib/cn";
import { buildBoard, type Board } from "./roadmap-geometry";

const DESK = buildBoard(18, 6, { dx: 204, dy: 150, margin: 92, r: 36 });
const PHONE = buildBoard(18, 3, { dx: 132, dy: 124, margin: 84, r: 34, top: 64 });
const COMPACT = buildBoard(18, 9, { dx: 120, dy: 120, margin: 78, r: 30, top: 60 });
const COMPACT_PHONE = buildBoard(18, 6, { dx: 112, dy: 116, margin: 74, r: 30, top: 58 });

function BoardSvg({
  board,
  statuses,
  current,
  active,
  onActive,
  hrefFor,
  label,
  className,
}: {
  board: Board;
  statuses?: WeekStatus[] | null;
  current?: number;
  active: number | null;
  onActive: (w: number | null) => void;
  hrefFor: (w: number) => string;
  label: string;
  className?: string;
}) {
  const st = (w: number) => statuses?.find((s) => s.week === w);
  const { r } = board;
  return (
    <svg viewBox={`0 0 ${board.width} ${board.height}`} className={cn("ee-pcb h-auto w-full", className)} role="group" aria-label={label}>
      {/* board + mounting holes */}
      <rect x={4} y={4} width={board.width - 8} height={board.height - 8} rx={22} className="ee-pcb-board" />
      {[
        [26, 26],
        [board.width - 26, 26],
        [26, board.height - 26],
        [board.width - 26, board.height - 26],
      ].map(([x, y], i) => (
        <g key={i} aria-hidden>
          <circle cx={x} cy={y} r={11} className="ee-pcb-hole-ring" />
          <circle cx={x} cy={y} r={5} className="ee-pcb-hole" />
        </g>
      ))}
      {/* traces */}
      {board.traces.map((d, i) => {
        const lit = !!st(i + 1)?.completed;
        return <path key={i} d={d} className={cn("ee-pcb-trace", lit && "ee-pcb-trace-lit")} aria-hidden />;
      })}
      {board.vias.map((v) => (
        <circle key={`v${v.seg}`} cx={v.x} cy={v.y} r={7} className={cn("ee-pcb-via", st(v.seg + 1)?.completed && "ee-pcb-via-lit")} aria-hidden />
      ))}
      {/* pads */}
      {board.pads.map((p) => {
        const m = weekMeta[p.week - 1];
        const s = st(p.week);
        const color = `var(${categoryInfo[m.category].cssVar})`;
        const done = !!s?.completed;
        const locked = s ? !s.unlocked : false;
        const isCur = current === p.week;
        const isActive = active === p.week;
        const desc = `สัปดาห์ที่ ${p.week} ${m.title} หมวด${categoryInfo[m.category].label}${done ? " เรียนจบแล้ว" : locked ? " ยังล็อกอยู่" : s?.started ? ` เรียนแล้ว ${s.percent}%` : ""}`;
        return (
          <Link
            key={p.week}
            href={hrefFor(p.week)}
            aria-label={desc}
            className="ee-pad"
            onMouseEnter={() => onActive(p.week)}
            onFocus={() => onActive(p.week)}
            prefetch={false}
          >
            <circle cx={p.x} cy={p.y} r={r + 13} className="ee-pad-focus" />
            {isCur ? <circle cx={p.x} cy={p.y} r={r + 8} className="ee-pad-pulse" style={{ stroke: color }} /> : null}
            <circle
              cx={p.x}
              cy={p.y}
              r={r}
              style={{ stroke: color, fill: done ? color : undefined }}
              className={cn("ee-pad-ring", isActive && "ee-pad-active", locked && "ee-pad-locked")}
            />
            {s && s.started && !done ? (
              <circle
                cx={p.x}
                cy={p.y}
                r={r - 9}
                className="ee-pad-progress"
                style={{ stroke: color, strokeDasharray: `${(2 * Math.PI * (r - 9) * s.percent) / 100} 999` }}
                transform={`rotate(-90 ${p.x} ${p.y})`}
              />
            ) : null}
            <text x={p.x} y={p.y + 9} textAnchor="middle" className={cn("ee-pad-num", done && "ee-pad-num-done")}>
              {p.week}
            </text>
          </Link>
        );
      })}
    </svg>
  );
}

function Detail({ m, s, href }: { m: WeekMeta; s?: WeekStatus; href: string }) {
  const cat = categoryInfo[m.category];
  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-2" aria-live="polite">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-3 text-[0.92rem] text-ink-3">
          <span className="font-semibold text-ink-2">สัปดาห์ที่ {m.week}</span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: `var(${cat.cssVar})` }} />
            {cat.label}
          </span>
        </p>
        <p className="text-[1.1rem] font-semibold leading-snug text-ink">{m.title}</p>
        <p className="text-ink-2">{m.focus}</p>
      </div>
      <div className="flex flex-col items-start gap-1.5">
        {s ? (
          s.completed ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-ok">
              <CheckCircle2 className="size-4" aria-hidden />
              เรียนจบแล้ว
            </span>
          ) : !s.unlocked ? (
            <span className="inline-flex max-w-[22rem] items-start gap-1.5 text-[0.95rem] text-ink-2">
              <Lock className="mt-1 size-4 shrink-0" aria-hidden />
              {s.lockReason ?? "ยังไม่ปลดล็อก"}
            </span>
          ) : (
            <span className="readout text-ink-2">เรียนแล้ว {s.percent}%</span>
          ) ) : null}
        <Link href={href} className="font-semibold text-cobalt-ink underline underline-offset-4" prefetch={false}>
          เปิดบทเรียนสัปดาห์ที่ {m.week}
        </Link>
      </div>
    </div>
  );
}

export function PcbRoadmap({
  statuses,
  current,
  compact = false,
  hrefBase = "/learn",
  className,
}: {
  statuses?: WeekStatus[] | null;
  current?: number;
  compact?: boolean;
  /** Pads link to `${hrefBase}/${week}`. */
  hrefBase?: string;
  className?: string;
}) {
  const hrefFor = (w: number) => `${hrefBase}/${w}`;
  const [active, setActive] = useState<number | null>(null);
  const shown = active ?? current ?? 1;
  const id = useId();
  const m = weekMeta[shown - 1];
  const label = "แผนที่การเรียน 18 สัปดาห์ แต่ละจุดคือหนึ่งสัปดาห์ เรียงตามลำดับ";
  return (
    <div className={cn("ee-roadmap", className)} id={id}>
      <BoardSvg board={compact ? COMPACT : DESK} statuses={statuses} current={current} active={shown} onActive={setActive} hrefFor={hrefFor} label={label} className="hidden sm:block" />
      <BoardSvg board={compact ? COMPACT_PHONE : PHONE} statuses={statuses} current={current} active={shown} onActive={setActive} hrefFor={hrefFor} label={label} className="sm:hidden" />
      {!compact ? (
        <div className="mt-3 rounded-md border border-line bg-panel px-4 py-3">
          <Detail m={m} s={statuses?.find((s) => s.week === shown)} href={hrefFor(shown)} />
        </div>
      ) : null}
    </div>
  );
}

/** Category legend for the roadmap. */
export function RoadmapLegend() {
  const used = Array.from(new Set(weekMeta.map((w) => w.category)));
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[0.9rem] text-ink-2" aria-label="สีของหมวดเนื้อหา">
      {used.map((c) => (
        <li key={c} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-3 rounded-full border-2" style={{ borderColor: `var(${categoryInfo[c].cssVar})` }} />
          {categoryInfo[c].label}
        </li>
      ))}
    </ul>
  );
}
