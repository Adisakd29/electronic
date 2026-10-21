"use client";
import { useId, useState } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import type { OrderInteraction } from "@/content/types";
import { cn } from "@/lib/cn";
import { Markdown } from "../Markdown";
import { allTrue, gradeOrder, seededPermutation } from "../lib/grading";
import { CheckButton, InteractionShell, Mark, RetryButton, useAttempts, type InteractionProps } from "./shell";
import { plain, thaiAnnouncements, thaiScreenReaderInstructions, useDndSensors } from "./dnd";

function Row({
  id,
  pos,
  total,
  text,
  reason,
  result,
  locked,
  onMove,
}: {
  id: string;
  pos: number;
  total: number;
  text: string;
  reason?: string;
  result?: boolean;
  locked: boolean;
  onMove: (from: number, to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: locked });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-stretch gap-2 rounded-sm border bg-panel p-1.5",
        isDragging ? "relative z-30 border-cobalt shadow-2" : "border-line",
        result === true && "border-ok",
        result === false && "border-danger",
      )}
    >
      <span
        {...attributes}
        {...listeners}
        aria-label={`ลากเพื่อย้าย: ${plain(text)}`}
        className={cn("grid w-8 shrink-0 cursor-grab touch-none place-items-center rounded-[4px] text-ink-3 hover:bg-panel-2", locked && "cursor-default")}
      >
        <GripVertical className="size-4" aria-hidden />
      </span>
      <span className="readout grid w-7 shrink-0 place-items-center font-semibold text-ink-3" aria-hidden>
        {pos + 1}
      </span>
      <div className="min-w-0 flex-1 py-1.5">
        <Markdown inline>{text}</Markdown>
        {result !== undefined ? (
          <span className="mt-1 block">
            <Mark ok={result} badText="ตำแหน่งนี้ยังไม่ถูก" />
          </span>
        ) : null}
        {reason ? (
          <span className="mt-1 block text-[0.92rem] text-ink-2">
            <Markdown inline>{reason}</Markdown>
          </span>
        ) : null}
      </div>
      {!locked ? (
        <span className="flex shrink-0 flex-col justify-center gap-0.5">
          <button
            type="button"
            onClick={() => onMove(pos, pos - 1)}
            disabled={pos === 0}
            aria-label={`เลื่อนขึ้น: ${plain(text)}`}
            className="grid size-8 place-items-center rounded-[4px] text-ink-2 hover:bg-panel-2 disabled:opacity-30"
          >
            <ChevronUp className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onMove(pos, pos + 1)}
            disabled={pos === total - 1}
            aria-label={`เลื่อนลง: ${plain(text)}`}
            className="grid size-8 place-items-center rounded-[4px] text-ink-2 hover:bg-panel-2 disabled:opacity-30"
          >
            <ChevronDown className="size-4" aria-hidden />
          </button>
        </span>
      ) : null}
    </li>
  );
}

export function Order({ it, onResult, variant }: InteractionProps<OrderInteraction>) {
  const a = useAttempts(it, onResult);
  const dndId = useId();
  const sensors = useDndSensors(true);
  const [order, setOrder] = useState<number[]>(() => seededPermutation(it.items.length, it.id, true));
  const [results, setResults] = useState<boolean[] | null>(null);
  const [live, setLive] = useState("");
  const locked = a.status === "correct";
  const showReasons = a.status === "correct" || a.revealed;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = arrayMove(order, from, to);
    setOrder(next);
    setResults(null);
    if (a.status === "wrong") a.reset();
    setLive(`ย้าย "${plain(it.items[order[from]])}" ไปลำดับที่ ${to + 1}`);
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = order.indexOf(Number(String(e.active.id).slice(2)));
    const to = order.indexOf(Number(String(e.over.id).slice(2)));
    move(from, to);
  };
  const check = () => {
    const r = gradeOrder(it.items, order);
    setResults(r);
    a.report(allTrue(r), order.join(","));
  };
  const name = (id: string | number) => plain(it.items[Number(String(id).slice(2))] ?? "");

  return (
    <InteractionShell
      it={it}
      variant={variant}
      attempts={a}
      actions={
        locked ? null : (
          <>
            <CheckButton onClick={check} />
            {a.status === "wrong" ? (
              <RetryButton
                onClick={() => {
                  setOrder(seededPermutation(it.items.length, `${it.id}-${a.wrongs}`, true));
                  setResults(null);
                  a.reset();
                }}
              >
                สลับใหม่
              </RetryButton>
            ) : null}
          </>
        )
      }
      resultText={{ wrong: "ลำดับยังไม่ถูก ดูรายการที่มีเครื่องหมายผิดแล้วเลื่อนใหม่" }}
      footer={
        a.revealed && a.status !== "correct" ? (
          <div className="mt-3 rounded-md border border-line bg-panel-2 px-4 py-3 text-[0.95rem]">
            <p className="mb-1 font-semibold">ลำดับที่ถูกต้อง</p>
            <ol className="list-decimal space-y-1 pl-5">
              {it.items.map((t, i) => (
                <li key={i}>
                  <Markdown inline>{t}</Markdown>
                </li>
              ))}
            </ol>
          </div>
        ) : null
      }
    >
      <p className="mb-3 text-[0.92rem] text-ink-3">ลากที่จับ หรือใช้ปุ่มลูกศรขึ้น–ลง เพื่อเรียงจากบนลงล่าง</p>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{ announcements: thaiAnnouncements(name), screenReaderInstructions: thaiScreenReaderInstructions }}
      >
        <SortableContext items={order.map((i) => `o-${i}`)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2" aria-label="รายการที่ต้องเรียง">
            {order.map((idx, pos) => (
              <Row
                key={idx}
                id={`o-${idx}`}
                pos={pos}
                total={order.length}
                text={it.items[idx]}
                reason={showReasons ? it.reasons?.[idx] : undefined}
                result={results?.[pos]}
                locked={locked}
                onMove={move}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
    </InteractionShell>
  );
}
