"use client";
import { useId, useMemo, useState } from "react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { GripVertical, X } from "lucide-react";
import type { MatchInteraction } from "@/content/types";
import { cn } from "@/lib/cn";
import { Markdown } from "../Markdown";
import { FigureView } from "../FigureView";
import { allTrue, gradeMatch, seededPermutation } from "../lib/grading";
import { CheckButton, InteractionShell, Mark, RetryButton, useAttempts, type InteractionProps } from "./shell";
import { plain, thaiAnnouncements, thaiScreenReaderInstructions, useDndSensors } from "./dnd";

function Chip({
  idx,
  text,
  selected,
  onClick,
  disabled,
}: {
  idx: number;
  text: string;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `chip-${idx}`, disabled });
  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        "flex items-stretch rounded-sm border bg-panel shadow-1",
        selected ? "border-cobalt ring-2 ring-cobalt/40" : "border-line-strong",
        isDragging && "relative z-30 shadow-2",
      )}
    >
      <span
        {...listeners}
        {...attributes}
        aria-label={`ลาก ${plain(text)}`}
        className={cn("grid w-7 shrink-0 cursor-grab touch-none place-items-center text-ink-3", disabled && "cursor-default")}
      >
        <GripVertical className="size-4" aria-hidden />
      </span>
      <button type="button" onClick={onClick} disabled={disabled} aria-pressed={selected} className="min-w-0 flex-1 px-2 py-1.5 text-left">
        <Markdown inline>{text}</Markdown>
      </button>
    </div>
  );
}

function Slot({
  i,
  children,
  selected,
  onSelect,
  label,
  disabled,
}: {
  i: number;
  children: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
  label: string;
  disabled: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${i}`, disabled });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-12 flex-1 rounded-sm border-2 border-dashed p-1",
        isOver ? "border-cobalt bg-cobalt-soft/50" : selected ? "border-cobalt" : "border-line-strong",
      )}
    >
      {children ?? (
        <button
          type="button"
          onClick={onSelect}
          disabled={disabled}
          aria-pressed={selected}
          aria-label={`ช่องคำตอบของ ${label}`}
          className="h-full min-h-10 w-full rounded-[4px] px-2 text-left text-[0.92rem] text-ink-3"
        >
          {selected ? "เลือกคำตอบจากรายการด้านล่าง" : "ลากคำตอบมาวาง หรือแตะเพื่อเลือกช่องนี้"}
        </button>
      )}
    </div>
  );
}

function Pool({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "pool" });
  return (
    <div ref={setNodeRef} className={cn("mt-4 rounded-md border border-line bg-panel-2 p-3", isOver && "border-cobalt")}>
      <p className="mb-2 text-[0.9rem] text-ink-3">ตัวเลือกที่ยังไม่ใช้</p>
      {children}
    </div>
  );
}

export function Match({ it, onResult, variant }: InteractionProps<MatchInteraction>) {
  const a = useAttempts(it, onResult);
  const dndId = useId();
  const sensors = useDndSensors();
  const pool = useMemo(() => {
    const texts = [...it.pairs.map((p) => p.right), ...(it.distractors ?? [])];
    return seededPermutation(texts.length, it.id).map((i) => texts[i]);
  }, [it]);
  const [assign, setAssign] = useState<(number | null)[]>(() => it.pairs.map(() => null));
  const [selLeft, setSelLeft] = useState<number | null>(null);
  const [selChip, setSelChip] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[] | null>(null);
  const locked = a.status === "correct";
  const used = new Set(assign.filter((x): x is number => x !== null));

  const place = (left: number, chip: number) => {
    setAssign((prev) => {
      const next = prev.map((x) => (x === chip ? null : x));
      next[left] = chip;
      return next;
    });
    setSelLeft(null);
    setSelChip(null);
    setResults(null);
    if (a.status === "wrong") a.reset();
  };
  const unplace = (left: number) => {
    setAssign((prev) => prev.map((x, i) => (i === left ? null : x)));
    setResults(null);
    if (a.status === "wrong") a.reset();
  };

  const onDragEnd = (e: DragEndEvent) => {
    const chip = Number(String(e.active.id).replace("chip-", ""));
    const over = e.over ? String(e.over.id) : null;
    if (!over) return;
    if (over === "pool") {
      const left = assign.indexOf(chip);
      if (left >= 0) unplace(left);
    } else if (over.startsWith("slot-")) place(Number(over.slice(5)), chip);
  };

  const check = () => {
    const r = gradeMatch(it.pairs, pool, assign);
    setResults(r);
    a.report(allTrue(r), assign.map((x) => (x === null ? "-" : plain(pool[x], 20))).join("|"));
  };

  const name = (id: string | number) => {
    const s = String(id);
    if (s.startsWith("chip-")) return plain(pool[Number(s.slice(5))] ?? "");
    if (s.startsWith("slot-")) return `ช่องของ ${plain(it.pairs[Number(s.slice(5))]?.left ?? "")}`;
    return "รายการตัวเลือก";
  };

  return (
    <InteractionShell
      it={it}
      variant={variant}
      attempts={a}
      actions={
        locked ? null : (
          <>
            <CheckButton onClick={check} disabled={assign.some((x) => x === null)} />
            {a.status === "wrong" ? (
              <RetryButton
                onClick={() => {
                  setAssign(it.pairs.map(() => null));
                  setResults(null);
                  a.reset();
                }}
              >
                เริ่มจับคู่ใหม่
              </RetryButton>
            ) : null}
          </>
        )
      }
      resultText={{ wrong: "ยังมีคู่ที่ไม่ถูก ดูช่องที่มีเครื่องหมายผิดแล้วสลับใหม่" }}
      footer={
        a.revealed && a.status !== "correct" ? (
          <div className="mt-3 rounded-md border border-line bg-panel-2 px-4 py-3 text-[0.95rem]">
            <p className="mb-1 font-semibold">คู่ที่ถูกต้อง</p>
            <ul className="list-disc space-y-1 pl-5">
              {it.pairs.map((p, i) => (
                <li key={i}>
                  <Markdown inline>{p.left}</Markdown> — <Markdown inline>{p.right}</Markdown>
                </li>
              ))}
            </ul>
          </div>
        ) : null
      }
    >
      <p className="mb-3 text-[0.92rem] text-ink-3">ลากคำตอบไปวางในช่อง หรือแตะช่องแล้วแตะคำตอบ (ใช้แป้น Tab และ Enter ได้)</p>
      <DndContext
        id={dndId}
        sensors={sensors}
        onDragEnd={onDragEnd}
        accessibility={{ announcements: thaiAnnouncements(name), screenReaderInstructions: thaiScreenReaderInstructions }}
      >
        <ol className="space-y-2">
          {it.pairs.map((p, i) => {
            const chip = assign[i];
            const r = results?.[i];
            return (
              <li key={i} className="flex flex-col gap-2 rounded-sm border border-line p-2 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3 sm:w-[45%]">
                  {p.leftFigure ? (
                    <div className="w-20 shrink-0">
                      <FigureView fig={{ figure: p.leftFigure, caption: plain(p.left), alt: plain(p.left, 200) }} numbered={false} expandable={false} className="my-0! [&_figcaption]:sr-only" />
                    </div>
                  ) : null}
                  <Markdown inline className="font-medium">
                    {p.left}
                  </Markdown>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Slot i={i} selected={selLeft === i} label={plain(p.left)} disabled={locked} onSelect={() => (selChip !== null ? place(i, selChip) : setSelLeft(selLeft === i ? null : i))}>
                    {chip !== null ? (
                      <div className="flex items-center gap-1">
                        <div className="min-w-0 flex-1">
                          <Chip idx={chip} text={pool[chip]} selected={false} disabled={locked} onClick={() => (selChip !== null ? place(i, selChip) : setSelLeft(selLeft === i ? null : i))} />
                        </div>
                        {!locked ? (
                          <button type="button" onClick={() => unplace(i)} aria-label={`เอา ${plain(pool[chip])} ออกจากช่อง`} className="grid size-9 shrink-0 place-items-center rounded-sm text-ink-3 hover:bg-panel-2 hover:text-ink">
                            <X className="size-4" aria-hidden />
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </Slot>
                  {r !== undefined ? <Mark ok={r} badText="ไม่ใช่คู่กัน" className="shrink-0" /> : null}
                </div>
              </li>
            );
          })}
        </ol>
        {!locked ? (
          <Pool>
            <div className="grid gap-2 sm:grid-cols-2">
              {pool.map((t, idx) =>
                used.has(idx) ? null : (
                  <Chip
                    key={idx}
                    idx={idx}
                    text={t}
                    selected={selChip === idx}
                    disabled={locked}
                    onClick={() => (selLeft !== null ? place(selLeft, idx) : setSelChip(selChip === idx ? null : idx))}
                  />
                ),
              )}
              {used.size === pool.length ? <p className="text-[0.92rem] text-ink-3">ใช้ครบทุกตัวเลือกแล้ว</p> : null}
            </div>
          </Pool>
        ) : null}
      </DndContext>
    </InteractionShell>
  );
}
