"use client";
/**
 * Quiz attempt UI: start/resume, one-per-screen or full list, debounced
 * autosave, submit confirmation and a per-question review of the result.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, CloudCheck, Columns2, LoaderCircle, RotateCcw, Rows3, Send, Trophy, XCircle } from "lucide-react";
import type { PublicQuestion, QuizResult, QuizStart } from "@/server/contracts";
import { cn } from "@/lib/cn";
import { Alert, Badge, Button, ProgressBar } from "@/components/ui";
import { Dialog, Segmented, useDebouncedCallback } from "@/components/ui/client";
import { Markdown } from "../Markdown";
import { FigureView } from "../FigureView";
import { parseNumber, splitValueUnit } from "../lib/grading";
import type { LearnApi } from "../api";
import { toastRewards } from "./rewards";

export function QuizQuestionView({
  q,
  index,
  total,
  value,
  onChange,
  disabled,
}: {
  q: PublicQuestion;
  index: number;
  total: number;
  value: string | undefined;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const name = useId();
  const inputId = useId();
  const choices = q.type === "tf" && !q.choices ? [{ id: "true", text: "ถูก" }, { id: "false", text: "ผิด" }] : (q.choices ?? []);
  return (
    <fieldset className="ee-quiz-q rounded-md border border-line bg-panel p-4 sm:p-5">
      <legend className="sr-only">
        ข้อ {index + 1} จาก {total}
      </legend>
      <p className="mb-2 text-[0.9rem] font-semibold text-ink-3" aria-hidden>
        ข้อ {index + 1} / {total}
        {q.type === "tf" ? " (ถูกหรือผิด)" : q.type === "numeric" ? " (ตอบเป็นตัวเลข)" : ""}
      </p>
      <Markdown className="font-medium text-ink">{q.stem}</Markdown>
      {q.figure ? <FigureView fig={q.figure} compact numbered={false} /> : null}
      {q.type === "numeric" ? (
        <div className="mt-3 flex items-stretch">
          <label htmlFor={inputId} className="sr-only">
            คำตอบ{q.unit ? ` (หน่วย ${q.unit})` : ""}
          </label>
          <input
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            disabled={disabled}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={cn("readout h-11 w-44 border border-line-strong bg-panel px-3 text-right text-[1.05rem]", q.unit ? "rounded-l-sm border-r-0" : "rounded-sm")}
          />
          {q.unit ? <span className="grid h-11 place-items-center rounded-r-sm border border-line-strong bg-panel-2 px-3 text-ink-2">{q.unit}</span> : null}
        </div>
      ) : (
        <ul className={cn("mt-3 gap-2", q.type === "tf" ? "grid grid-cols-2" : "space-y-2")}>
          {choices.map((c, i) => (
            <li key={c.id}>
              <label
                className={cn(
                  "flex h-full cursor-pointer items-start gap-3 rounded-sm border px-3 py-2.5",
                  value === c.id ? "border-cobalt bg-cobalt-soft/60" : "border-line hover:border-line-strong hover:bg-panel-2",
                )}
              >
                <input type="radio" name={name} value={c.id} checked={value === c.id} disabled={disabled} onChange={() => onChange(c.id)} className="mt-1.5 size-4 shrink-0 accent-[var(--cobalt)]" />
                {q.type === "mcq" ? (
                  <span className="readout mt-0.5 shrink-0 font-semibold text-ink-3" aria-hidden>
                    {"กขคง"[i] ?? i + 1}.
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <Markdown inline>{c.text}</Markdown>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

const answered = (v: string | undefined) => v !== undefined && v.trim() !== "";

function normaliseAnswers(questions: PublicQuestion[], a: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of questions) {
    const v = a[q.id];
    if (!answered(v)) continue;
    if (q.type === "numeric") {
      const n = parseNumber(splitValueUnit(v).num);
      out[q.id] = Number.isFinite(n) ? String(n) : v.trim();
    } else out[q.id] = v;
  }
  return out;
}

export function QuizResultView({
  result,
  start,
  onRetry,
  retryLabel = "ทำแบบทดสอบอีกครั้ง (สุ่มข้อใหม่)",
  nextWeek,
  kind,
}: {
  result: QuizResult;
  start: QuizStart;
  onRetry?: () => void;
  retryLabel?: string;
  nextWeek?: { week: number; title: string; href: string } | null;
  kind: "pre" | "post" | "challenge";
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  const qById = new Map(start.questions.map((q) => [q.id, q]));
  const choiceText = (qid: string, v: string | null) => {
    if (v === null || v === "") return "ไม่ได้ตอบ";
    const q = qById.get(qid);
    if (!q) return v;
    if (q.type === "numeric") return `${v}${q.unit ? ` ${q.unit}` : ""}`;
    const cs = q.type === "tf" && !q.choices ? [{ id: "true", text: "ถูก" }, { id: "false", text: "ผิด" }] : (q.choices ?? []);
    return cs.find((c) => c.id === v)?.text ?? v;
  };
  const isPost = kind === "post";
  return (
    <div className="space-y-5">
      <section
        className={cn("rounded-md border-2 bg-panel p-5", isPost ? (result.passed ? "border-ok/60" : "border-warn/60") : "border-line")}
        aria-labelledby="quiz-result-h"
      >
        <h2 id="quiz-result-h" ref={headingRef} tabIndex={-1} className="flex flex-wrap items-center gap-2 text-[1.25rem] font-bold text-ink">
          {isPost ? (
            result.passed ? (
              <>
                <Trophy className="size-6 text-ok" aria-hidden /> ผ่านแบบทดสอบ
              </>
            ) : (
              <>
                <XCircle className="size-6 text-warn" aria-hidden /> ยังไม่ผ่านเกณฑ์
              </>
            )
          ) : (
            "ผลแบบทดสอบก่อนเรียน"
          )}
        </h2>
        <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="text-[0.9rem] text-ink-3">คะแนน</p>
            <p className="readout text-[2rem] font-semibold leading-none text-ink">
              {result.score}/{result.maxScore}
            </p>
          </div>
          <div>
            <p className="text-[0.9rem] text-ink-3">ร้อยละ</p>
            <p className="readout text-[2rem] font-semibold leading-none text-ink">{Math.round(result.percent)}%</p>
          </div>
          {isPost ? (
            <p className="text-ink-2">
              เกณฑ์ผ่าน {start.passPercent}% {result.passed ? "— บันทึกผลแล้ว" : "— ทบทวนข้อที่ผิดด้านล่างแล้วลองใหม่ได้"}
            </p>
          ) : (
            <p className="max-w-[48ch] text-ink-2">ไม่มีผลต่อคะแนน ใช้เทียบกับแบบทดสอบหลังเรียนเพื่อดูว่าเข้าใจเพิ่มขึ้นแค่ไหน</p>
          )}
        </div>
        {result.xpAwarded > 0 ? <p className="mt-3 text-ink-2">ได้รับ {result.xpAwarded} XP</p> : null}
        {result.newAchievements.length ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {result.newAchievements.map((a) => (
              <li key={a}>
                <Badge tone="copper">
                  <Trophy className="size-3.5" aria-hidden />
                  {a}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}
        {result.nextWeekUnlocked && nextWeek ? (
          <Alert tone="ok" className="mt-4" title={`ปลดล็อกสัปดาห์ที่ ${nextWeek.week} แล้ว`}>
            {nextWeek.title}
          </Alert>
        ) : null}
        {onRetry ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant={result.passed ? "secondary" : "primary"} onClick={onRetry}>
              <RotateCcw className="size-4" aria-hidden />
              {retryLabel}
            </Button>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="quiz-review-h">
        <h3 id="quiz-review-h" className="mb-3 text-[1.1rem] font-semibold text-ink">
          ทบทวนทีละข้อ
        </h3>
        <ol className="space-y-3">
          {result.items.map((it, i) => {
            const q = qById.get(it.questionId);
            return (
              <li key={it.questionId} className={cn("rounded-md border bg-panel p-4", it.correct ? "border-ok/40" : "border-danger/40")}>
                <p className="mb-1 flex items-center gap-2 font-semibold">
                  <span className="readout text-ink-3">{i + 1}.</span>
                  {it.correct ? (
                    <span className="inline-flex items-center gap-1 text-ok">
                      <CheckCircle2 className="size-4" aria-hidden /> ตอบถูก
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-danger">
                      <XCircle className="size-4" aria-hidden /> ตอบผิด
                    </span>
                  )}
                </p>
                {q ? <Markdown className="text-ink">{q.stem}</Markdown> : null}
                <dl className="mt-2 grid gap-x-4 gap-y-1 text-[0.95rem] sm:grid-cols-[9rem_1fr]">
                  <dt className="text-ink-3">คำตอบของคุณ</dt>
                  <dd className={it.correct ? "text-ok" : "text-danger"}>
                    <Markdown inline>{choiceText(it.questionId, it.given)}</Markdown>
                  </dd>
                  {!it.correct ? (
                    <>
                      <dt className="text-ink-3">คำตอบที่ถูก</dt>
                      <dd className="text-ink">
                        <Markdown inline>{it.answerText}</Markdown>
                      </dd>
                    </>
                  ) : null}
                </dl>
                {!it.correct && it.feedback ? (
                  <div className="mt-2 rounded-sm bg-danger-soft/60 px-3 py-2 text-[0.95rem]">
                    <span className="font-semibold">ทำไมตัวเลือกนี้ผิด: </span>
                    <Markdown inline>{it.feedback}</Markdown>
                  </div>
                ) : null}
                <div className="mt-2 rounded-sm bg-panel-2 px-3 py-2 text-[0.95rem]">
                  <span className="font-semibold">คำอธิบาย: </span>
                  <Markdown inline>{it.explanation}</Markdown>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

type Phase = "start" | "loading" | "running" | "submitting" | "result";

export function QuizRunner({
  api,
  week,
  kind,
  autoStart = false,
  startLabel = "เริ่มทำแบบทดสอบ",
  onResult,
  onRetry,
  allowRetry = true,
  nextWeek,
  intro,
}: {
  api: LearnApi;
  week: number;
  kind: "pre" | "post";
  autoStart?: boolean;
  startLabel?: string;
  onResult?: (r: QuizResult) => void;
  onRetry?: () => void;
  allowRetry?: boolean;
  nextWeek?: { week: number; title: string; href: string } | null;
  /** Rendered above the start button. */
  intro?: React.ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>("start");
  const [start, setStart] = useState<QuizStart | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<"one" | "all">("one");
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const begin = useCallback(async () => {
    setPhase("loading");
    setError(null);
    const r = await api.startQuiz(week, kind);
    if (!r.ok) {
      setError(r.error);
      setPhase("start");
      return;
    }
    setStart(r.data);
    setAnswers(r.data.saved ?? {});
    const firstOpen = r.data.questions.findIndex((q) => !answered(r.data.saved?.[q.id]));
    setIndex(firstOpen < 0 ? 0 : firstOpen);
    setResult(null);
    setSave("idle");
    setPhase("running");
  }, [api, week, kind]);

  const auto = useRef(false);
  useEffect(() => {
    if (autoStart && !auto.current) {
      auto.current = true;
      void begin();
    }
  }, [autoStart, begin]);

  const persist = useDebouncedCallback(async (attemptId: string, a: Record<string, string>, qs: PublicQuestion[]) => {
    setSave("saving");
    const r = await api.saveQuizAnswers(attemptId, normaliseAnswers(qs, a));
    setSave(r.ok ? "saved" : "error");
  }, 1200);

  const setAnswer = (qid: string, v: string) => {
    if (!start) return;
    const next = { ...answers, [qid]: v };
    setAnswers(next);
    persist(start.attemptId, next, start.questions);
  };

  const submit = async () => {
    if (!start) return;
    setConfirm(false);
    setPhase("submitting");
    setError(null);
    const r = await api.submitQuiz(start.attemptId, normaliseAnswers(start.questions, answers));
    if (!r.ok) {
      setError(r.error);
      setPhase("running");
      return;
    }
    setResult(r.data);
    setPhase("result");
    toastRewards(r.data);
    onResult?.(r.data);
  };

  const go = (i: number) => {
    setIndex(i);
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  if (phase === "result" && result && start) {
    return (
      <QuizResultView
        result={result}
        start={start}
        kind={kind}
        nextWeek={nextWeek}
        onRetry={
          allowRetry
            ? () => {
                onRetry?.();
                void begin();
              }
            : undefined
        }
      />
    );
  }

  if (phase === "start" || phase === "loading" || !start) {
    return (
      <div className="space-y-3">
        {intro}
        {error ? (
          <Alert tone="danger" title="เริ่มแบบทดสอบไม่สำเร็จ">
            {error}
          </Alert>
        ) : null}
        <Button size="lg" onClick={begin} disabled={phase === "loading"}>
          {phase === "loading" ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : null}
          {phase === "loading" ? "กำลังเตรียมข้อสอบ…" : startLabel}
        </Button>
      </div>
    );
  }

  const qs = start.questions;
  const done = qs.filter((q) => answered(answers[q.id])).length;
  const missing = qs.length - done;
  const busy = phase === "submitting";

  return (
    <div ref={topRef} className="scroll-mt-24 space-y-4">
      <div className="sticky top-[var(--topbar-h,60px)] z-20 -mx-1 rounded-md border border-line bg-panel/95 px-3 py-2 shadow-1 backdrop-blur print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <span className="readout text-[0.95rem] text-ink-2">
            ตอบแล้ว {done}/{qs.length}
          </span>
          <ProgressBar value={done} max={qs.length} label="จำนวนข้อที่ตอบแล้ว" className="min-w-24 flex-1" />
          <span className="inline-flex items-center gap-1 text-[0.85rem] text-ink-3" aria-live="polite">
            {save === "saving" ? (
              <>
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> กำลังบันทึก…
              </>
            ) : save === "saved" ? (
              <>
                <CloudCheck className="size-3.5" aria-hidden /> บันทึกคำตอบอัตโนมัติแล้ว
              </>
            ) : save === "error" ? (
              <span className="text-danger">บันทึกอัตโนมัติไม่สำเร็จ คำตอบยังอยู่ในหน้านี้</span>
            ) : null}
          </span>
          <Segmented
            label="รูปแบบการแสดงข้อสอบ"
            value={mode}
            onChange={setMode}
            options={[
              { key: "one", label: "ทีละข้อ", icon: <Columns2 className="size-4" aria-hidden /> },
              { key: "all", label: "ทุกข้อ", icon: <Rows3 className="size-4" aria-hidden /> },
            ]}
          />
        </div>
        {mode === "one" ? (
          <nav aria-label="ไปยังข้อ" className="mt-2 flex flex-wrap gap-1">
            {qs.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => go(i)}
                aria-current={i === index ? "true" : undefined}
                aria-label={`ข้อ ${i + 1}${answered(answers[q.id]) ? " (ตอบแล้ว)" : ""}`}
                className={cn(
                  "readout grid size-8 place-items-center rounded-sm border text-[0.85rem] font-semibold",
                  i === index ? "border-cobalt bg-cobalt text-white dark:text-paper" : answered(answers[q.id]) ? "border-cobalt/40 bg-cobalt-soft text-cobalt-ink" : "border-line text-ink-3 hover:border-line-strong",
                )}
              >
                {i + 1}
              </button>
            ))}
          </nav>
        ) : null}
      </div>

      {error ? (
        <Alert tone="danger" title="ส่งคำตอบไม่สำเร็จ">
          {error}
        </Alert>
      ) : null}

      {mode === "one" ? (
        <QuizQuestionView key={qs[index].id} q={qs[index]} index={index} total={qs.length} value={answers[qs[index].id]} onChange={(v) => setAnswer(qs[index].id, v)} disabled={busy} />
      ) : (
        <div className="space-y-4">
          {qs.map((q, i) => (
            <QuizQuestionView key={q.id} q={q} index={i} total={qs.length} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} disabled={busy} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {mode === "one" ? (
          <>
            <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0}>
              <ChevronLeft className="size-4" aria-hidden />
              ข้อก่อนหน้า
            </Button>
            {index < qs.length - 1 ? (
              <Button variant="secondary" onClick={() => go(index + 1)}>
                ข้อต่อไป
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            ) : null}
          </>
        ) : null}
        <span className="flex-1" />
        <Button onClick={() => setConfirm(true)} disabled={busy}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          {busy ? "กำลังส่ง…" : "ส่งคำตอบ"}
        </Button>
      </div>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="ส่งคำตอบเลยไหม"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              กลับไปตรวจทาน
            </Button>
            <Button onClick={submit}>ส่งคำตอบ</Button>
          </>
        }
      >
        {missing > 0 ? (
          <p className="text-ink-2">
            ยังไม่ได้ตอบ <strong className="text-danger">{missing} ข้อ</strong> ข้อที่ไม่ได้ตอบจะนับเป็นผิด
          </p>
        ) : (
          <p className="text-ink-2">ตอบครบทุกข้อแล้ว ส่งแล้วจะแก้คำตอบชุดนี้ไม่ได้</p>
        )}
      </Dialog>
    </div>
  );
}
