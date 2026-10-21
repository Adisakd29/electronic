"use client";
/**
 * Shared frame for every interaction: kind label, prompt, optional figure,
 * check / retry buttons, an aria-live result line, the explanation when
 * correct and — after two wrong tries — a "ดูคำอธิบาย" button.
 */
import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpDown,
  BookOpenCheck,
  CheckCircle2,
  GitBranch,
  Lightbulb,
  Link2,
  ListChecks,
  MousePointerClick,
  PenLine,
  RotateCcw,
  ScanSearch,
  Shapes,
  XCircle,
} from "lucide-react";
import type { Interaction, Level } from "@/content/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";
import { Markdown } from "../Markdown";
import { FigureView } from "../FigureView";
import { useLessonEnv } from "../lesson-context";

export type CheckStatus = "idle" | "correct" | "wrong";

export const LEVEL_LABEL: Record<Level, string> = { basic: "พื้นฐาน", apply: "ประยุกต์", analyze: "วิเคราะห์" };
export const LEVEL_TITLE: Record<Level, string> = {
  basic: "ระดับพื้นฐาน: จำและเข้าใจ ใช้ความรู้ขั้นเดียว",
  apply: "ระดับประยุกต์: นำกฎหรือสูตรไปใช้กับกรณีใหม่",
  analyze: "ระดับวิเคราะห์: รวมหลายแนวคิด วินิจฉัย หรือตัดสินใจ",
};
const LEVEL_CLASS: Record<Level, string> = {
  basic: "bg-ok-soft text-ok",
  apply: "bg-cobalt-soft text-cobalt-ink",
  analyze: "bg-copper-soft text-copper",
};

export interface InteractionProps<T extends Interaction = Interaction> {
  it: T;
  /** Called after each graded attempt. */
  onResult?: (correct: boolean, answerKey?: string) => void;
  /** Visual density: inside a learn step vs the practice stage. */
  variant?: "inline" | "practice";
}

export function kindMeta(it: Interaction): { label: string; icon: ReactNode } {
  const c = "size-4";
  switch (it.kind) {
    case "mcq":
      return { label: it.multiple ? "เลือกได้มากกว่าหนึ่งข้อ" : "เลือกคำตอบ", icon: <ListChecks className={c} aria-hidden /> };
    case "fill":
      return { label: "เติมค่า", icon: <PenLine className={c} aria-hidden /> };
    case "match":
      return { label: "จับคู่", icon: <Link2 className={c} aria-hidden /> };
    case "order":
      return { label: "เรียงลำดับ", icon: <ArrowUpDown className={c} aria-hidden /> };
    case "predict":
      return { label: "ทำนายผล", icon: <Lightbulb className={c} aria-hidden /> };
    case "hotspot":
      return { label: it.mode === "explore" ? "สำรวจภาพ" : "หาตำแหน่งในภาพ", icon: <MousePointerClick className={c} aria-hidden /> };
    case "findFault":
      return { label: "หาจุดผิดพลาด", icon: <ScanSearch className={c} aria-hidden /> };
    case "classify":
      return { label: "จัดกลุ่ม", icon: <Shapes className={c} aria-hidden /> };
    case "scenario":
      return { label: "สถานการณ์จำลอง", icon: <GitBranch className={c} aria-hidden /> };
  }
}

/** Attempt bookkeeping shared by all kinds. */
export function useAttempts(it: Interaction, onResult?: (c: boolean, k?: string) => void) {
  const env = useLessonEnv();
  const [status, setStatus] = useState<CheckStatus>("idle");
  const [wrongs, setWrongs] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const reported = useRef(false);
  const report = useCallback(
    (correct: boolean, answerKey?: string) => {
      setStatus(correct ? "correct" : "wrong");
      if (!correct) setWrongs((w) => w + 1);
      // record each correct completion once per mount; record every wrong try
      if (!correct || !reported.current) {
        env.onInteraction(it.id, correct, answerKey);
        if (correct) reported.current = true;
      }
      onResult?.(correct, answerKey);
    },
    [env, it.id, onResult],
  );
  const reset = useCallback(() => setStatus("idle"), []);
  return { status, wrongs, revealed, reveal: () => setRevealed(true), report, reset, everCorrect: env.correct.has(it.id) };
}

export function ResultLine({ status, correctText = "ถูกต้อง", wrongText = "ยังไม่ถูก ลองดูคำอธิบายที่แต่ละข้อแล้วแก้ใหม่" }: { status: CheckStatus; correctText?: string; wrongText?: string }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="min-h-0">
      {status === "correct" ? (
        <p className="flex items-center gap-2 font-semibold text-ok">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />
          {correctText}
        </p>
      ) : status === "wrong" ? (
        <p className="flex items-center gap-2 font-semibold text-danger">
          <XCircle className="size-5 shrink-0" aria-hidden />
          {wrongText}
        </p>
      ) : null}
    </div>
  );
}

/** Small ✓/✗ marker with text (never colour alone). */
export function Mark({ ok, okText = "ถูก", badText = "ผิด", className }: { ok: boolean; okText?: string; badText?: string; className?: string }) {
  return ok ? (
    <span className={cn("inline-flex items-center gap-1 text-[0.88rem] font-semibold text-ok", className)}>
      <CheckCircle2 className="size-4" aria-hidden />
      {okText}
    </span>
  ) : (
    <span className={cn("inline-flex items-center gap-1 text-[0.88rem] font-semibold text-danger", className)}>
      <XCircle className="size-4" aria-hidden />
      {badText}
    </span>
  );
}

export function Explanation({ md, title = "คำอธิบาย" }: { md: string; title?: string }) {
  return (
    <div className="mt-3 rounded-md border border-ok/30 bg-ok-soft/60 px-4 py-3">
      <p className="mb-1 flex items-center gap-2 font-semibold text-ink">
        <BookOpenCheck className="size-4 text-ok" aria-hidden />
        {title}
      </p>
      <Markdown className="text-ink-2">{md}</Markdown>
    </div>
  );
}

export function InteractionShell({
  it,
  variant = "inline",
  attempts,
  children,
  actions,
  showFigure = true,
  footer,
  resultText,
  promptOverride,
  explanationOverride,
}: {
  it: Interaction;
  variant?: "inline" | "practice";
  attempts: ReturnType<typeof useAttempts>;
  children: ReactNode;
  /** Buttons row (check / retry …). */
  actions?: ReactNode;
  showFigure?: boolean;
  footer?: ReactNode;
  resultText?: { correct?: string; wrong?: string };
  /** Randomised exercises substitute values into the prompt/explanation. */
  promptOverride?: string;
  explanationOverride?: string;
}) {
  const meta = kindMeta(it);
  const { status, wrongs, revealed } = attempts;
  const showExplanation = status === "correct" || revealed;
  return (
    <section
      aria-label={`กิจกรรม: ${meta.label}`}
      className={cn(
        "ee-interaction my-6 rounded-md border bg-panel",
        variant === "practice" ? "border-line p-4 sm:p-6" : "border-cobalt/35 p-4 sm:p-5",
        status === "correct" && "border-ok/50",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-cobalt-soft px-2 py-0.5 text-[0.85rem] font-semibold text-cobalt-ink">
          {meta.icon}
          {meta.label}
        </span>
        {it.level ? (
          <span className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-[0.82rem] font-semibold", LEVEL_CLASS[it.level])} title={LEVEL_TITLE[it.level]}>
            {LEVEL_LABEL[it.level]}
          </span>
        ) : null}
        {attempts.everCorrect && status !== "correct" ? (
          <span className="inline-flex items-center gap-1 text-[0.85rem] text-ok">
            <CheckCircle2 className="size-4" aria-hidden />
            เคยทำถูกแล้ว
          </span>
        ) : null}
      </div>
      <Markdown className="font-medium text-ink">{promptOverride ?? it.prompt}</Markdown>
      {showFigure && it.figure ? <FigureView fig={it.figure} compact /> : null}
      <div className="mt-3">{children}</div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {actions}
        {status === "wrong" && wrongs >= 2 && !revealed ? (
          <Button variant="ghost" size="sm" onClick={attempts.reveal}>
            <BookOpenCheck className="size-4" aria-hidden />
            ดูคำอธิบาย
          </Button>
        ) : null}
      </div>
      <div className="mt-3">
        <ResultLine status={status} correctText={resultText?.correct} wrongText={resultText?.wrong} />
      </div>
      {footer}
      {showExplanation ? <Explanation md={explanationOverride ?? it.explanation} title={status === "correct" ? "คำอธิบาย" : "คำอธิบาย (ยังต้องตอบให้ถูกเพื่อผ่านข้อนี้)"} /> : null}
    </section>
  );
}

export function CheckButton({ onClick, disabled, children = "ตรวจคำตอบ" }: { onClick: () => void; disabled?: boolean; children?: ReactNode }) {
  return (
    <Button onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
}

export function RetryButton({ onClick, children = "ลองอีกครั้ง" }: { onClick: () => void; children?: ReactNode }) {
  return (
    <Button variant="secondary" onClick={onClick}>
      <RotateCcw className="size-4" aria-hidden />
      {children}
    </Button>
  );
}
