"use client";
/**
 * Hotspot (explore / find) and find-the-fault. Spots are HTML buttons placed
 * over the figure in its viewBox coordinates (percentages), so they are in
 * tab order with labels and scale with the drawing.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Check, Flag, X } from "lucide-react";
import type { FindFaultInteraction, HotspotInteraction, HotspotSpot } from "@/content/types";
import { cn } from "@/lib/cn";
import { Markdown } from "../Markdown";
import { FigureView } from "../FigureView";
import { gradeFaults } from "../lib/grading";
import { CheckButton, InteractionShell, Mark, RetryButton, useAttempts, type InteractionProps } from "./shell";

type SpotState = "idle" | "seen" | "found" | "miss" | "flagged" | "right" | "wrong";

function spotStyle(s: HotspotSpot, vb: [number, number]): CSSProperties {
  const r = s.r ?? 24;
  return {
    left: `${(s.x / vb[0]) * 100}%`,
    top: `${(s.y / vb[1]) * 100}%`,
    width: `max(2rem, ${((2 * r) / vb[0]) * 100}%)`,
  };
}

function popoverStyle(s: HotspotSpot, vb: [number, number]): CSSProperties {
  const xp = (s.x / vb[0]) * 100;
  const yp = (s.y / vb[1]) * 100;
  const st: CSSProperties = {};
  if (xp <= 50) st.left = `max(0px, calc(${xp}% - 2rem))`;
  else st.right = `max(0px, calc(${100 - xp}% - 2rem))`;
  const off = `calc(${(((s.r ?? 24) / vb[0]) * 100) / 2}% + 1.25rem)`;
  if (yp > 55) st.bottom = `calc(${100 - yp}% + ${off})`;
  else st.top = `calc(${yp}% + ${off})`;
  return st;
}

function SpotButton({
  s,
  vb,
  index,
  state,
  label,
  expanded,
  controls,
  onClick,
}: {
  s: HotspotSpot;
  vb: [number, number];
  index: number;
  state: SpotState;
  label: string;
  expanded?: boolean;
  controls?: string;
  onClick: () => void;
}) {
  const icon =
    state === "found" || state === "right" ? (
      <Check className="size-[55%]" aria-hidden />
    ) : state === "miss" || state === "wrong" ? (
      <X className="size-[55%]" aria-hidden />
    ) : state === "flagged" ? (
      <Flag className="size-[50%]" aria-hidden />
    ) : (
      <span className="text-[0.8rem] font-bold leading-none">{index + 1}</span>
    );
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-pressed={state === "flagged" ? true : undefined}
      style={spotStyle(s, vb)}
      className={cn(
        "ee-spot absolute grid aspect-square -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] backdrop-blur-[1px] transition-transform hover:scale-105",
        state === "idle" && "ee-spot-idle border-cobalt bg-cobalt/15 text-cobalt-ink",
        state === "seen" && "border-cobalt bg-cobalt text-white dark:text-paper",
        (state === "found" || state === "right") && "border-ok bg-ok text-white dark:text-paper",
        (state === "miss" || state === "wrong") && "border-danger bg-danger text-white dark:text-paper",
        state === "flagged" && "border-warn bg-warn text-white dark:text-paper",
      )}
    >
      {icon}
    </button>
  );
}

function Popover({ id, s, vb, title, children, onClose }: { id: string; s: HotspotSpot; vb: [number, number]; title: ReactNode; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      ref={ref}
      id={id}
      role="dialog"
      aria-label={typeof title === "string" ? title : undefined}
      style={popoverStyle(s, vb)}
      className="absolute z-20 w-[min(20rem,calc(100%-0.5rem))] rounded-md border border-line-strong bg-panel p-3 text-[0.95rem] shadow-2"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="font-semibold text-ink">{title}</p>
        <button type="button" onClick={onClose} aria-label="ปิดคำอธิบาย" className="-m-1 grid size-8 shrink-0 place-items-center rounded-sm text-ink-3 hover:bg-panel-2 hover:text-ink">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="text-ink-2">{children}</div>
    </div>
  );
}

export function Hotspot({ it, onResult, variant }: InteractionProps<HotspotInteraction>) {
  const a = useAttempts(it, onResult);
  const [open, setOpen] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, SpotState>>({});
  const vb = it.viewBox;
  const targets = it.spots.filter((s) => s.target);
  const explore = it.mode === "explore";
  const seenCount = explore ? it.spots.filter((s) => states[s.id] === "seen").length : targets.filter((s) => states[s.id] === "found").length;
  const total = explore ? it.spots.length : targets.length;

  const click = (s: HotspotSpot) => {
    setOpen(open === s.id ? null : s.id);
    if (a.status === "correct" && states[s.id]) return;
    const next = { ...states };
    if (explore) next[s.id] = "seen";
    else if (s.target) next[s.id] = "found";
    else next[s.id] = "miss";
    setStates(next);
    if (explore) {
      if (it.spots.every((x) => next[x.id] === "seen") && a.status !== "correct") a.report(true, "explored");
    } else if (!s.target) {
      if (states[s.id] !== "miss") a.report(false, s.id);
    } else if (targets.every((x) => next[x.id] === "found") && a.status !== "correct") a.report(true, "found");
    else if (a.status === "wrong") a.reset();
  };

  const overlay = (
    <>
      {it.spots.map((s, i) => {
        const st = states[s.id] ?? "idle";
        const popId = `${it.id}-${s.id}-pop`;
        const label = explore
          ? `${i + 1}. ${s.label}`
          : st === "idle"
            ? `จุดที่ ${i + 1}`
            : `จุดที่ ${i + 1}: ${s.label} ${st === "found" ? "(ใช่)" : "(ไม่ใช่)"}`;
        return (
          <span key={s.id}>
            <SpotButton s={s} vb={vb} index={i} state={st} label={label} expanded={open === s.id} controls={popId} onClick={() => click(s)} />
            {open === s.id ? (
              <Popover
                id={popId}
                s={s}
                vb={vb}
                onClose={() => setOpen(null)}
                title={
                  explore ? (
                    s.label
                  ) : (
                    <span className="flex flex-wrap items-center gap-2">
                      {s.label}
                      <Mark ok={!!s.target} okText="ใช่ จุดนี้" badText="ยังไม่ใช่จุดนี้" />
                    </span>
                  )
                }
              >
                <Markdown>{s.md}</Markdown>
              </Popover>
            ) : null}
          </span>
        );
      })}
    </>
  );

  return (
    <InteractionShell
      it={it}
      variant={variant}
      attempts={a}
      showFigure={false}
      actions={
        <p className="text-[0.95rem] text-ink-2" aria-live="polite">
          {explore ? `เปิดดูแล้ว ${seenCount} จาก ${total} จุด` : `พบแล้ว ${seenCount} จาก ${total} จุด`}
        </p>
      }
      resultText={explore ? { correct: "สำรวจครบทุกจุดแล้ว" } : { correct: "หาครบทุกจุดแล้ว", wrong: "จุดที่แตะยังไม่ใช่ อ่านคำอธิบายแล้วลองหาจุดอื่น" }}
    >
      <p className="mb-1 text-[0.92rem] text-ink-3">
        {explore ? "แตะวงกลมหมายเลขบนภาพทีละจุด (หรือกด Tab แล้ว Enter) เพื่ออ่านคำอธิบาย" : "แตะจุดบนภาพที่คิดว่าเป็นคำตอบ แตะผิดได้ ระบบจะบอกเหตุผล"}
      </p>
      <FigureView fig={it.figure} viewBox={vb} overlay={overlay} expandable={false} compact />
    </InteractionShell>
  );
}

export function FindFault({ it, onResult, variant }: InteractionProps<FindFaultInteraction>) {
  const a = useAttempts(it, onResult);
  const [flagged, setFlagged] = useState<string[]>([]);
  const [graded, setGraded] = useState<Record<string, boolean> | null>(null);
  const vb = it.viewBox;
  const locked = a.status === "correct";

  const toggle = (id: string) => {
    if (locked) return;
    setFlagged((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
    setGraded(null);
    if (a.status === "wrong") a.reset();
  };
  const check = () => {
    const g = gradeFaults(it.spots, flagged);
    setGraded(g);
    a.report(Object.values(g).every(Boolean), flagged.join(","));
  };

  const overlay = (
    <>
      {it.spots.map((s, i) => {
        const st: SpotState = graded ? (graded[s.id] ? (s.fault ? "right" : "idle") : "wrong") : flagged.includes(s.id) ? "flagged" : "idle";
        return (
          <SpotButton
            key={s.id}
            s={s}
            vb={vb}
            index={i}
            state={st}
            label={`${i + 1}. ${s.label}${flagged.includes(s.id) ? " (ทำเครื่องหมายว่าผิด)" : ""}`}
            onClick={() => toggle(s.id)}
          />
        );
      })}
    </>
  );

  return (
    <InteractionShell
      it={it}
      variant={variant}
      attempts={a}
      showFigure={false}
      actions={
        locked ? null : (
          <>
            <CheckButton onClick={check} disabled={flagged.length === 0} />
            {a.status === "wrong" ? (
              <RetryButton
                onClick={() => {
                  setFlagged([]);
                  setGraded(null);
                  a.reset();
                }}
              >
                ล้างเครื่องหมาย
              </RetryButton>
            ) : null}
          </>
        )
      }
      resultText={{ correct: "หาจุดบกพร่องได้ครบและถูกต้อง", wrong: "ยังไม่ถูกทั้งหมด อ่านผลแต่ละจุดด้านล่างแล้วแก้เครื่องหมาย" }}
      footer={
        graded ? (
          <ul className="mt-3 space-y-2">
            {it.spots.map((s, i) =>
              s.fault || flagged.includes(s.id) ? (
                <li key={s.id} className="rounded-sm border border-line px-3 py-2 text-[0.95rem]">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <span className="readout text-ink-3">{i + 1}.</span> {s.label}
                    <Mark
                      ok={graded[s.id]}
                      okText={s.fault ? "พบจุดผิด" : "ถูก"}
                      badText={s.fault ? "จุดนี้ผิดแต่ยังไม่ได้เลือก" : "จุดนี้ไม่ได้ผิด"}
                    />
                  </p>
                  {graded[s.id] || a.revealed || !s.fault ? (
                    <div className="text-ink-2">
                      <Markdown>{s.feedback}</Markdown>
                    </div>
                  ) : null}
                </li>
              ) : null,
            )}
          </ul>
        ) : null
      }
    >
      <p className="mb-1 text-[0.92rem] text-ink-3">แตะจุดบนภาพเพื่อทำเครื่องหมายว่า “ผิด” (แตะซ้ำเพื่อยกเลิก) แล้วกดตรวจคำตอบ</p>
      <FigureView fig={it.figure} viewBox={vb} overlay={overlay} expandable={false} compact />
    </InteractionShell>
  );
}
