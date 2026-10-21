"use client";
import { useId, useState } from "react";
import type { ChoiceOption, McqInteraction, PredictInteraction } from "@/content/types";
import { cn } from "@/lib/cn";
import { Markdown } from "../Markdown";
import { FigureView } from "../FigureView";
import { gradeMcq } from "../lib/grading";
import { CheckButton, InteractionShell, Mark, RetryButton, useAttempts, type InteractionProps } from "./shell";

/** Radio / checkbox list with per-option feedback after checking. */
export function ChoiceList({
  options,
  multiple,
  selected,
  onChange,
  locked,
  graded,
  name,
  legend,
}: {
  options: ChoiceOption[];
  multiple?: boolean;
  selected: string[];
  onChange: (ids: string[]) => void;
  locked: boolean;
  /** Show feedback for chosen options (and missed correct ones). */
  graded: boolean;
  name: string;
  legend: string;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <ul className="space-y-2">
        {options.map((o) => {
          const chosen = selected.includes(o.id);
          const missed = graded && multiple && !!o.correct && !chosen;
          const showFb = graded && (chosen || missed);
          const ok = !!o.correct === chosen;
          return (
            <li key={o.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-sm border px-3 py-2.5 transition-colors",
                  chosen ? "border-cobalt bg-cobalt-soft/60" : "border-line hover:border-line-strong hover:bg-panel-2",
                  graded && chosen && (o.correct ? "border-ok bg-ok-soft/60" : "border-danger bg-danger-soft/60"),
                  missed && "border-dashed border-warn",
                  locked && "cursor-default",
                )}
              >
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name={name}
                  value={o.id}
                  checked={chosen}
                  disabled={locked}
                  onChange={(e) => {
                    if (multiple) onChange(e.target.checked ? [...selected, o.id] : selected.filter((s) => s !== o.id));
                    else onChange([o.id]);
                  }}
                  className="mt-1.5 size-4 shrink-0 accent-[var(--cobalt)]"
                />
                <span className="min-w-0 flex-1">
                  <Markdown inline>{o.text}</Markdown>
                  {showFb ? (
                    <span className="mt-1.5 block border-t border-line/70 pt-1.5 text-[0.95rem] text-ink-2">
                      {missed ? <Mark ok={false} badText="ควรเลือกข้อนี้ด้วย" className="mr-2" /> : <Mark ok={ok} className="mr-2" />}
                      <Markdown inline>{o.feedback}</Markdown>
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

export function Mcq({ it, onResult, variant }: InteractionProps<McqInteraction>) {
  const a = useAttempts(it, onResult);
  const [selected, setSelected] = useState<string[]>([]);
  const name = useId();
  const graded = a.status !== "idle";
  const check = () => {
    const r = gradeMcq(it.options, selected);
    a.report(r.correct, selected.join(","));
  };
  return (
    <InteractionShell
      it={it}
      variant={variant}
      attempts={a}
      actions={
        a.status === "wrong" ? (
          <RetryButton
            onClick={() => {
              a.reset();
              setSelected([]);
            }}
          />
        ) : a.status === "idle" ? (
          <CheckButton onClick={check} disabled={selected.length === 0} />
        ) : null
      }
      resultText={{ wrong: "ยังไม่ถูก อ่านเหตุผลใต้ตัวเลือกที่เลือก แล้วลองอีกครั้ง" }}
    >
      <ChoiceList
        options={it.options}
        multiple={it.multiple}
        selected={selected}
        onChange={setSelected}
        locked={graded}
        graded={graded}
        name={name}
        legend="ตัวเลือก"
      />
    </InteractionShell>
  );
}

export function Predict({ it, onResult, variant }: InteractionProps<PredictInteraction>) {
  const a = useAttempts(it, onResult);
  const [selected, setSelected] = useState<string[]>([]);
  const [committed, setCommitted] = useState(false);
  const name = useId();
  const graded = a.status !== "idle";
  const commit = () => {
    setCommitted(true);
    const r = gradeMcq(it.options, selected);
    a.report(r.correct, selected.join(","));
  };
  return (
    <InteractionShell
      it={it}
      variant={variant}
      attempts={a}
      actions={
        a.status === "idle" ? (
          <CheckButton onClick={commit} disabled={selected.length === 0}>
            ยืนยันคำทำนาย
          </CheckButton>
        ) : a.status === "wrong" ? (
          <RetryButton
            onClick={() => {
              a.reset();
              setSelected([]);
            }}
          >
            ทำนายใหม่
          </RetryButton>
        ) : null
      }
      resultText={{ correct: "ทำนายถูก", wrong: "คำทำนายยังไม่ตรงกับผลจริง ดูว่าเกิดอะไรขึ้นด้านล่าง" }}
      footer={
        committed ? (
          <div className="mt-4 rounded-md border border-info/30 bg-info-soft/60 px-4 py-3">
            <p className="mb-1 font-semibold text-ink">สิ่งที่เกิดขึ้นจริง</p>
            <Markdown className="text-ink-2">{it.reveal}</Markdown>
            {it.revealFigure ? <FigureView fig={it.revealFigure} compact /> : null}
          </div>
        ) : null
      }
    >
      <ChoiceList options={it.options} selected={selected} onChange={setSelected} locked={graded} graded={graded} name={name} legend="คำทำนายของคุณ" />
    </InteractionShell>
  );
}
