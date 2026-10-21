"use client";
import { useId, useMemo, useState } from "react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { CornerUpLeft, GripVertical } from "lucide-react";
import type { ClassifyInteraction } from "@/content/types";
import { cn } from "@/lib/cn";
import { Markdown } from "../Markdown";
import { allTrue, gradeClassify, seededPermutation } from "../lib/grading";
import { CheckButton, InteractionShell, Mark, RetryButton, useAttempts, type InteractionProps } from "./shell";
import { plain, thaiAnnouncements, thaiScreenReaderInstructions, useDndSensors } from "./dnd";

function Item({
  i,
  text,
  selected,
  onSelect,
  locked,
  result,
  feedback,
  onReturn,
}: {
  i: number;
  text: string;
  selected: boolean;
  onSelect: () => void;
  locked: boolean;
  result?: boolean;
  feedback?: string;
  onReturn?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `it-${i}`, disabled: locked });
  return (
    <li
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        "rounded-sm border bg-panel shadow-1",
        selected ? "border-cobalt ring-2 ring-cobalt/40" : "border-line-strong",
        result === true && "border-ok",
        result === false && "border-danger",
        isDragging && "relative z-30 shadow-2",
      )}
    >
      <div className="flex items-stretch">
        <span {...listeners} {...attributes} aria-label={`ลาก ${plain(text)}`} className={cn("grid w-7 shrink-0 cursor-grab touch-none place-items-center text-ink-3", locked && "cursor-default")}>
          <GripVertical className="size-4" aria-hidden />
        </span>
        <button type="button" onClick={onSelect} disabled={locked} aria-pressed={selected} className="min-w-0 flex-1 px-2 py-1.5 text-left">
          <Markdown inline>{text}</Markdown>
        </button>
        {onReturn && !locked ? (
          <button type="button" onClick={onReturn} aria-label={`ย้าย ${plain(text)} กลับไปรายการเดิม`} className="grid w-9 shrink-0 place-items-center text-ink-3 hover:text-ink">
            <CornerUpLeft className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      {result !== undefined ? (
        <div className="border-t border-line px-2 py-1.5 text-[0.92rem] text-ink-2">
          <Mark ok={result} badText="ผิดกลุ่ม" className="mr-2" />
          {result === false && feedback ? <Markdown inline>{feedback}</Markdown> : null}
        </div>
      ) : null}
    </li>
  );
}

function Bin({ k, title, children, armed, onPlace, locked }: { k: number | "pool"; title: string; children: React.ReactNode; armed: boolean; onPlace: () => void; locked: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: k === "pool" ? "pool" : `bin-${k}`, disabled: locked });
  return (
    <div ref={setNodeRef} className={cn("flex min-h-28 flex-col rounded-md border-2 border-dashed p-2", isOver ? "border-cobalt bg-cobalt-soft/50" : armed ? "border-cobalt/70" : "border-line-strong", k === "pool" && "bg-panel-2")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-semibold text-ink">{title}</p>
        {armed && !locked ? (
          <button type="button" onClick={onPlace} className="rounded-sm bg-cobalt px-2 py-1 text-[0.85rem] font-semibold text-white dark:text-paper">
            วางที่นี่
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function Classify({ it, onResult, variant }: InteractionProps<ClassifyInteraction>) {
  const a = useAttempts(it, onResult);
  const dndId = useId();
  const sensors = useDndSensors();
  const order = useMemo(() => seededPermutation(it.items.length, it.id), [it]);
  const [assign, setAssign] = useState<(number | null)[]>(() => it.items.map(() => null));
  const [sel, setSel] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[] | null>(null);
  const locked = a.status === "correct";

  const put = (item: number, bin: number | null) => {
    setAssign((p) => p.map((x, i) => (i === item ? bin : x)));
    setSel(null);
    setResults(null);
    if (a.status === "wrong") a.reset();
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over) return;
    const item = Number(String(e.active.id).slice(3));
    const over = String(e.over.id);
    put(item, over === "pool" ? null : Number(over.slice(4)));
  };
  const check = () => {
    const r = gradeClassify(it.items, assign);
    setResults(r);
    a.report(allTrue(r), assign.map((x) => (x === null ? "-" : x)).join(","));
  };
  const name = (id: string | number) => {
    const s = String(id);
    if (s.startsWith("it-")) return plain(it.items[Number(s.slice(3))]?.text ?? "");
    if (s.startsWith("bin-")) return `กลุ่ม ${it.categories[Number(s.slice(4))]}`;
    return "รายการที่ยังไม่จัด";
  };
  const renderItem = (i: number, inBin: boolean) => (
    <Item
      key={i}
      i={i}
      text={it.items[i].text}
      selected={sel === i}
      onSelect={() => setSel(sel === i ? null : i)}
      locked={locked}
      result={results?.[i]}
      feedback={it.items[i].feedback}
      onReturn={inBin ? () => put(i, null) : undefined}
    />
  );
  const unplaced = order.filter((i) => assign[i] === null);

  return (
    <InteractionShell
      it={it}
      variant={variant}
      attempts={a}
      actions={
        locked ? null : (
          <>
            <CheckButton onClick={check} disabled={unplaced.length > 0} />
            {a.status === "wrong" ? (
              <RetryButton
                onClick={() => {
                  setAssign(it.items.map(() => null));
                  setResults(null);
                  a.reset();
                }}
              >
                เริ่มจัดใหม่
              </RetryButton>
            ) : null}
          </>
        )
      }
      resultText={{ wrong: "ยังมีบางรายการอยู่ผิดกลุ่ม อ่านเหตุผลใต้รายการนั้นแล้วย้ายใหม่" }}
    >
      <p className="mb-3 text-[0.92rem] text-ink-3">ลากแต่ละรายการไปวางในกลุ่ม หรือแตะรายการแล้วกด “วางที่นี่” ในกลุ่มที่ต้องการ</p>
      <DndContext id={dndId} sensors={sensors} onDragEnd={onDragEnd} accessibility={{ announcements: thaiAnnouncements(name), screenReaderInstructions: thaiScreenReaderInstructions }}>
        {unplaced.length > 0 || !locked ? (
          <Bin k="pool" title={`ยังไม่จัดกลุ่ม (${unplaced.length})`} armed={sel !== null && assign[sel] !== null} onPlace={() => sel !== null && put(sel, null)} locked={locked}>
            <ul className="grid gap-2 sm:grid-cols-2">{unplaced.map((i) => renderItem(i, false))}</ul>
          </Bin>
        ) : null}
        <div className={cn("mt-3 grid gap-3", it.categories.length >= 3 ? "md:grid-cols-3" : "sm:grid-cols-2")}>
          {it.categories.map((c, k) => (
            <Bin key={k} k={k} title={c} armed={sel !== null && assign[sel] !== k} onPlace={() => sel !== null && put(sel, k)} locked={locked}>
              <ul className="space-y-2">{order.filter((i) => assign[i] === k).map((i) => renderItem(i, true))}</ul>
            </Bin>
          ))}
        </div>
      </DndContext>
    </InteractionShell>
  );
}
