"use client";
import { useId, useMemo, useState } from "react";
import { Dices, Lightbulb } from "lucide-react";
import type { FillField, FillInteraction } from "@/content/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";
import { Markdown } from "../Markdown";
import { checkFillField, fieldUnits, type FillFieldResult } from "../lib/grading";
import { defaultValues, drawValues, evaluate, isDefaultDraw, substitute } from "../lib/formula";

/**
 * A randomised instance of a fill exercise: prompt/labels/hints with the drawn
 * values substituted and answers recomputed from each field's formula. With the
 * default values the hand-checked fixed answers are kept.
 */
function instantiate(it: FillInteraction, values: Record<string, number>): FillInteraction {
  const vars = it.vars;
  if (!vars) return it;
  const sub = (md: string) => substitute(md, values, vars);
  const fresh = !isDefaultDraw(values, vars);
  const fields: FillField[] = it.fields.map((f) => {
    if (!fresh || !f.formula) return { ...f, label: sub(f.label), hint: f.hint ? sub(f.hint) : f.hint };
    let answer = f.answer;
    try {
      answer = evaluate(f.formula, values);
    } catch {
      /* validated at build time; keep the fixed answer if anything is off */
    }
    const commonErrors = (f.commonErrors ?? []).flatMap((e) => {
      if (!e.formula) return [];
      try {
        return [{ ...e, value: evaluate(e.formula, values) }];
      } catch {
        return [];
      }
    });
    return { ...f, label: sub(f.label), hint: f.hint ? sub(f.hint) : f.hint, answer, commonErrors };
  });
  return { ...it, prompt: sub(it.prompt), explanation: fresh ? sub(it.explanation) : it.explanation, fields };
}
import { CheckButton, InteractionShell, Mark, RetryButton, useAttempts, type InteractionProps } from "./shell";

function fieldMessage(r: FillFieldResult, unit?: string): string {
  switch (r.status) {
    case "empty":
      return "ยังไม่ได้กรอกช่องนี้";
    case "invalid":
      return "พิมพ์เป็นตัวเลข เช่น 12.5 หรือ 12,5 (ใช้ 4.7e3 แทน 4.7 × 10³ ได้)";
    case "unit":
      return `หน่วยที่พิมพ์ไม่ใช่หน่วยที่ใช้ในข้อนี้${unit ? ` ให้ตอบเป็น ${unit}` : ""} หรือเลือกหน่วยจากรายการ`;
    case "wrong":
      return "ค่ายังไม่ถูก ตรวจสูตร การแทนค่า และการแปลงคำนำหน้าหน่วยอีกครั้ง";
    default:
      return "";
  }
}

export function Fill({ it: source, onResult, variant }: InteractionProps<FillInteraction>) {
  const a = useAttempts(source, onResult);
  const baseId = useId();
  const [values0, setValues0] = useState<Record<string, number> | null>(null);
  const [round, setRound] = useState(0);
  const it = useMemo(() => (source.vars ? instantiate(source, values0 ?? defaultValues(source.vars)) : source), [source, values0]);
  const randomisable = !!source.vars && Object.keys(source.vars).length > 0;
  const newProblem = () => {
    if (!source.vars) return;
    let next = drawValues(source.vars);
    // avoid drawing the same instance twice in a row
    for (let i = 0; i < 5 && JSON.stringify(next) === JSON.stringify(values0 ?? defaultValues(source.vars)); i++) next = drawValues(source.vars);
    setValues0(next);
    setValues({});
    setUnits({});
    setResults(null);
    setRound((r) => r + 1);
    a.reset();
  };
  const [values, setValues] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, FillFieldResult> | null>(null);
  const graded = results !== null;
  const locked = a.status === "correct";

  const check = () => {
    const r: Record<string, FillFieldResult> = {};
    for (const f of it.fields) r[f.id] = checkFillField(f, values[f.id] ?? "", units[f.id]);
    setResults(r);
    const ok = it.fields.every((f) => r[f.id].status === "correct");
    const key = it.fields.map((f) => `${(values[f.id] ?? "").trim()}${units[f.id] && units[f.id] !== f.unit ? ` ${units[f.id]}` : ""}`).join("|");
    a.report(ok, key);
  };

  return (
    <InteractionShell
      it={it}
      variant={variant}
      attempts={a}
      actions={
        a.status === "correct" ? (
          randomisable ? (
            <Button variant="secondary" size="sm" onClick={newProblem}>
              <Dices className="size-4" aria-hidden />
              ลองโจทย์ใหม่ (สุ่มค่า)
            </Button>
          ) : null
        ) : a.status === "wrong" ? (
          <>
            <CheckButton onClick={check}>ตรวจคำตอบอีกครั้ง</CheckButton>
            <RetryButton
              onClick={() => {
                setValues({});
                setResults(null);
                a.reset();
              }}
            >
              ล้างคำตอบ
            </RetryButton>
          </>
        ) : (
          <CheckButton onClick={check} disabled={it.fields.every((f) => !(values[f.id] ?? "").trim())} />
        )
      }
      resultText={{ wrong: "ยังไม่ถูกทุกช่อง แก้ช่องที่มีเครื่องหมายผิดแล้วตรวจอีกครั้ง" }}
      promptOverride={it.prompt}
      explanationOverride={it.explanation}
    >
      {round > 0 ? (
        <p className="mb-2 text-[0.9rem] text-ink-3" aria-live="polite">
          โจทย์ชุดที่ {round + 1} (ค่าใหม่ ใช้วิธีคิดเดิม)
        </p>
      ) : null}
      <div key={round} className="space-y-4">
        {it.fields.map((f) => {
          const id = `${baseId}-${f.id}`;
          const r = results?.[f.id];
          const us = fieldUnits(f);
          const msgId = `${id}-msg`;
          return (
            <div key={f.id} className="flex flex-wrap items-start gap-x-3 gap-y-2">
              <label htmlFor={id} className="min-w-[6rem] pt-2 font-medium text-ink">
                <Markdown inline>{f.label}</Markdown>
              </label>
              <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2">
                <div className="flex items-stretch">
                  <input
                    id={id}
                    inputMode="decimal"
                    autoComplete="off"
                    spellCheck={false}
                    value={values[f.id] ?? ""}
                    readOnly={locked}
                    aria-invalid={graded && r?.status !== "correct" ? true : undefined}
                    aria-describedby={r ? msgId : undefined}
                    onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !locked) check();
                    }}
                    className={cn(
                      "readout h-11 w-36 border border-line-strong bg-panel px-3 text-right text-[1.05rem] text-ink",
                      us.length ? "rounded-l-sm border-r-0" : "rounded-sm",
                      graded && r?.status === "correct" && "border-ok",
                      graded && r && r.status !== "correct" && "border-danger",
                    )}
                  />
                  {us.length > 1 ? (
                    <select
                      aria-label="หน่วย"
                      value={units[f.id] ?? us[0]}
                      disabled={locked}
                      onChange={(e) => setUnits((u) => ({ ...u, [f.id]: e.target.value }))}
                      className="h-11 rounded-r-sm border border-line-strong bg-panel-2 px-2 text-ink"
                    >
                      {us.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  ) : us.length === 1 ? (
                    <span className="grid h-11 place-items-center rounded-r-sm border border-line-strong bg-panel-2 px-3 text-ink-2">{us[0]}</span>
                  ) : null}
                </div>
                {r ? (
                  <div id={msgId} className="min-w-[12rem] flex-1 pt-2 text-[0.95rem]">
                    {r.status === "correct" ? (
                      <Mark ok />
                    ) : (
                      <span className="text-ink-2">
                        <Mark ok={false} className="mr-2" />
                        {r.feedback ? <Markdown inline>{r.feedback}</Markdown> : fieldMessage(r, f.unit)}
                      </span>
                    )}
                    {r.status !== "correct" && a.status === "wrong" && f.hint ? (
                      <span className="mt-1 flex items-start gap-1.5 text-ink-2">
                        <Lightbulb className="mt-1 size-4 shrink-0 text-warn" aria-hidden />
                        <span>
                          <span className="font-semibold">คำใบ้: </span>
                          <Markdown inline>{f.hint}</Markdown>
                        </span>
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </InteractionShell>
  );
}
