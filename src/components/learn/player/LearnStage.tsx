"use client";
/**
 * Learn stage: one step per page (?step=N, 1-based), step list with ticks,
 * prev/next, "ทำขั้นนี้เสร็จแล้ว" → markStepComplete, and completeStage("learn")
 * once every step is done. Position is autosaved.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock, ListTree, LoaderCircle, PartyPopper } from "lucide-react";
import { cn } from "@/lib/cn";
import { Alert, Button, LinkButton } from "@/components/ui";
import { Disclosure } from "@/components/ui/client";
import { Blocks } from "../blocks/BlockRenderer";
import { FigureNumbersProvider } from "../lesson-context";
import { blockFigureKeys, numberFigures } from "../lib/figures";
import { allStepsDone, firstIncompleteStep, parseStepParam } from "../lib/stepNav";
import { usePlayer, union } from "./context";

function StepList({ current, onGo }: { current: number; onGo: (i: number) => void }) {
  const { slice, progress } = usePlayer();
  return (
    <ol className="space-y-0.5">
      {slice.stepMeta.map((s, i) => {
        const done = progress.stepsDone.includes(s.id);
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onGo(i)}
              aria-current={i === current ? "step" : undefined}
              className={cn(
                "flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-[0.92rem] leading-snug",
                i === current ? "bg-cobalt-soft font-semibold text-ink" : "text-ink-2 hover:bg-panel-2",
              )}
            >
              {done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-label="เสร็จแล้ว" /> : <Circle className="mt-0.5 size-4 shrink-0 text-line-strong" aria-label="ยังไม่เสร็จ" />}
              <span className="min-w-0 flex-1">
                <span className="readout mr-1 text-ink-3">{i + 1}.</span>
                {s.title}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function LearnStage() {
  const { slice, progress, setProgress, api, completeStage, stageHref, basePath } = usePlayer();
  const steps = useMemo(() => slice.steps ?? [], [slice.steps]);
  const ids = useMemo(() => steps.map((s) => s.id), [steps]);
  const sp = useSearchParams();
  const fallback = progress.position?.stage === "learn" ? progress.position.stepIndex : firstIncompleteStep(ids, progress.stepsDone);
  const index = parseStepParam(sp.get("step"), steps.length, fallback);
  const step = steps[index];
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // An error belongs to the step it happened on: clear it when the step changes (adjust state during render).
  const [errorStep, setErrorStep] = useState(index);
  if (errorStep !== index) {
    setErrorStep(index);
    setError(null);
  }
  const stageDone = progress.stagesDone.includes("learn");
  const allDone = allStepsDone(ids, progress.stepsDone);

  // continuous figure numbering across the whole lesson (stable per step)
  const numbers = useMemo(
    () =>
      numberFigures(
        steps.flatMap((s) => blockFigureKeys(s.blocks, { interaction: (id) => slice.interactions[id], example: (id) => slice.examples[id] })),
      ),
    [steps, slice.interactions, slice.examples],
  );

  const go = (i: number) => {
    const n = Math.min(Math.max(0, i), steps.length - 1);
    const url = `${basePath}/learn?step=${n + 1}`;
    window.history.pushState(null, "", url);
  };

  // focus + scroll to the step title on step change; autosave position
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
    } else {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    const t = setTimeout(() => void api.savePosition(slice.week, "learn", index), 600);
    return () => clearTimeout(t);
  }, [index, api, slice.week]);

  if (!step) {
    return (
      <Alert tone="info" title="บทเรียนสัปดาห์นี้กำลังจัดทำ">
        ยังไม่มีเนื้อหาขั้นเรียนรู้ในสัปดาห์นี้ ไปทำขั้นอื่นก่อนได้
      </Alert>
    );
  }

  const isDone = progress.stepsDone.includes(step.id);
  const isLast = index === steps.length - 1;

  const markDone = async () => {
    setBusy(true);
    setError(null);
    const r = await api.markStepComplete(slice.week, step.id);
    if (!r.ok) {
      setBusy(false);
      setError(r.error);
      return;
    }
    const nextDone = union(union(progress.stepsDone, r.data.stepsDone), [step.id]);
    setProgress((p) => ({ ...p, stepsDone: union(p.stepsDone, nextDone) }));
    if (allStepsDone(ids, nextDone) && !stageDone) {
      const c = await completeStage("learn");
      if (!c.ok) setError(c.error);
    } else if (!isLast) {
      const nextOpen = ids.findIndex((id, i) => i > index && !nextDone.includes(id));
      go(nextOpen >= 0 ? nextOpen : index + 1);
    }
    setBusy(false);
  };

  const totalMin = slice.stepMeta.reduce((a, s) => a + s.minutes, 0);
  const doneCount = ids.filter((id) => progress.stepsDone.includes(id)).length;

  return (
    <FigureNumbersProvider value={numbers}>
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_16rem] xl:gap-8">
        <div className="min-w-0">
          <div className="mb-4 rounded-md border border-line bg-panel xl:hidden print:hidden">
            <Disclosure
              summary={
                <span>
                  ขั้นที่ {index + 1} จาก {steps.length}
                  <span className="ml-2 font-normal text-ink-3">เสร็จแล้ว {doneCount} ขั้น</span>
                </span>
              }
              icon={<ListTree className="size-5 text-ink-3" aria-hidden />}
            >
              <div className="px-2 pb-2">
                <StepList current={index} onGo={go} />
              </div>
            </Disclosure>
          </div>

          <article aria-labelledby="step-title" className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-3 text-[0.92rem] text-ink-3">
              <span>
                ขั้นที่ {index + 1} / {steps.length}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-4" aria-hidden />
                ประมาณ {step.minutes} นาที
              </span>
              {isDone ? (
                <span className="inline-flex items-center gap-1 text-ok">
                  <CheckCircle2 className="size-4" aria-hidden />
                  ทำขั้นนี้แล้ว
                </span>
              ) : null}
            </p>
            <h2 id="step-title" ref={headingRef} tabIndex={-1} className="scroll-mt-24 text-[1.35rem] font-bold leading-snug text-ink md:text-[1.5rem]">
              {step.title}
            </h2>
            <div className="ee-step-body mt-2">
              <Blocks key={step.id} blocks={step.blocks} interactions={slice.interactions} examples={slice.examples} />
            </div>
          </article>

          {error ? (
            <Alert tone="danger" title="บันทึกไม่สำเร็จ" className="mt-4">
              {error}
            </Alert>
          ) : null}

          {stageDone || allDone ? (
            <section className="mt-6 rounded-md border-2 border-ok/50 bg-ok-soft/50 p-4" aria-live="polite">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <PartyPopper className="size-5 text-ok" aria-hidden />
                เรียนครบทุกขั้นแล้ว
              </p>
              <p className="text-ink-2">ต่อไปฝึกทำโจทย์เชิงโต้ตอบเพื่อตรวจว่าเข้าใจจริง</p>
              <LinkButton href={stageHref("practice")} className="mt-3">
                ไปฝึกปฏิบัติเชิงโต้ตอบ
              </LinkButton>
            </section>
          ) : null}

          <nav aria-label="เลื่อนขั้น" className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4 print:hidden">
            <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0}>
              <ChevronLeft className="size-4" aria-hidden />
              ขั้นก่อนหน้า
            </Button>
            <span className="flex-1" />
            {!isDone ? (
              <Button onClick={markDone} disabled={busy}>
                {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
                ทำขั้นนี้เสร็จแล้ว
              </Button>
            ) : null}
            {!isLast ? (
              <Button variant={isDone ? "primary" : "secondary"} onClick={() => go(index + 1)}>
                ไปขั้นต่อไป
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            ) : isDone && !(stageDone || allDone) ? (
              <Link href={`${basePath}/learn?step=${firstIncompleteStep(ids, progress.stepsDone) + 1}`} className="font-semibold text-cobalt-ink underline underline-offset-4">
                ไปขั้นที่ยังไม่ได้ทำ
              </Link>
            ) : null}
          </nav>
        </div>

        <aside className="hidden xl:block print:hidden" aria-label="ขั้นตอนในบทเรียน">
          <div className="sticky top-[calc(var(--topbar-h,60px)+1rem)] rounded-md border border-line bg-panel p-3">
            <p className="mb-1 px-2 font-semibold text-ink">ขั้นตอนในบทเรียน</p>
            <p className="mb-2 px-2 text-[0.85rem] text-ink-3">
              เสร็จแล้ว {doneCount} จาก {steps.length} ขั้น รวมประมาณ {totalMin} นาที
            </p>
            <StepList current={index} onGo={go} />
          </div>
        </aside>
      </div>
    </FigureNumbersProvider>
  );
}

