"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, ListOrdered, PartyPopper } from "lucide-react";
import { cn } from "@/lib/cn";
import { Alert, Badge, Button, LinkButton, ProgressBar } from "@/components/ui";
import { Disclosure } from "@/components/ui/client";
import { FigureNumbersProvider } from "../lesson-context";
import { exampleFigures, interactionFigures, numberFigures } from "../lib/figures";
import { InteractionView } from "../interactions/InteractionView";
import { WorkedExampleView } from "../blocks/client";
import { usePlayer } from "./context";

const levelText = { basic: "พื้นฐาน", intermediate: "ปานกลาง", advanced: "ท้าทาย" } as const;
const levelTone = { basic: "ok", intermediate: "info", advanced: "copper" } as const;

export function PracticeStage() {
  const { slice, progress, completeStage, stageHref, api } = usePlayer();
  const ids = useMemo(() => slice.practiceIds.filter((id) => slice.interactions[id]), [slice.practiceIds, slice.interactions]);
  const correct = progress.interactionsCorrect;
  const firstOpen = ids.findIndex((id) => !correct.includes(id));
  const [index, setIndex] = useState(firstOpen < 0 ? 0 : firstOpen);
  const [error, setError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const doneCount = ids.filter((id) => correct.includes(id)).length;
  const allCorrect = ids.length > 0 && doneCount === ids.length;
  const stageDone = progress.stagesDone.includes("practice");
  const completing = useRef(false);

  const examples = useMemo(() => (slice.exampleOrder ?? []).map((id) => slice.examples[id]).filter(Boolean), [slice.exampleOrder, slice.examples]);
  const numbers = useMemo(() => {
    const r = { interaction: (id: string) => slice.interactions[id], example: (id: string) => slice.examples[id] };
    const keys = [
      ...ids.flatMap((id) => interactionFigures(slice.interactions[id]).map((f) => f.figure)),
      ...examples.flatMap((e) => exampleFigures(e, r).map((f) => f.figure)),
    ];
    return numberFigures(keys);
  }, [ids, examples, slice.interactions, slice.examples]);

  // complete the stage once everything has been answered correctly
  useEffect(() => {
    if (!allCorrect || stageDone || completing.current) return;
    completing.current = true;
    void completeStage("practice").then((r) => {
      if (!r.ok) {
        setError(r.error);
        completing.current = false;
      }
    });
  }, [allCorrect, stageDone, completeStage]);

  useEffect(() => {
    const t = setTimeout(() => void api.savePosition(slice.week, "practice", index), 800);
    return () => clearTimeout(t);
  }, [index, api, slice.week]);

  const go = (i: number) => {
    setIndex(Math.min(Math.max(0, i), ids.length - 1));
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const current = ids[index] ? slice.interactions[ids[index]] : undefined;
  const currentDone = current ? correct.includes(current.id) : false;

  return (
    <FigureNumbersProvider value={numbers}>
      <div className="space-y-8">
        <section aria-labelledby="practice-h">
          <div ref={topRef} className="scroll-mt-24">
            <h2 id="practice-h" className="text-[1.3rem] font-bold text-ink">
              ฝึกปฏิบัติเชิงโต้ตอบ
            </h2>
            <p className="max-w-[65ch] text-ink-2">ทำให้ถูกทุกข้ออย่างน้อยหนึ่งครั้ง ตอบผิดได้ไม่จำกัด ระบบจะบอกเหตุผลทุกครั้ง ถ้าผิดสองครั้งจะดูคำอธิบายได้</p>
          </div>
          {ids.length === 0 ? (
            <Alert tone="info" title="สัปดาห์นี้ยังไม่มีแบบฝึก" className="mt-4">
              ไปที่ขั้นห้องทดลองเสมือนได้เลย
            </Alert>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="readout text-ink-2">
                  ทำถูกแล้ว {doneCount}/{ids.length}
                </span>
                <ProgressBar value={doneCount} max={ids.length} label="จำนวนแบบฝึกที่ทำถูกแล้ว" color="var(--ok)" className="min-w-32 flex-1" />
              </div>
              <nav aria-label="เลือกข้อแบบฝึก" className="mt-3 flex flex-wrap gap-1.5">
                {ids.map((id, i) => {
                  const ok = correct.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => go(i)}
                      aria-current={i === index ? "true" : undefined}
                      aria-label={`ข้อ ${i + 1}${ok ? " (ทำถูกแล้ว)" : ""}`}
                      className={cn(
                        "readout relative grid size-9 place-items-center rounded-sm border text-[0.9rem] font-semibold",
                        i === index ? "border-cobalt bg-cobalt text-white dark:text-paper" : ok ? "border-ok/50 bg-ok-soft text-ok" : "border-line-strong text-ink-2 hover:bg-panel-2",
                      )}
                    >
                      {ok && i !== index ? <CheckCircle2 className="size-4" aria-hidden /> : i + 1}
                    </button>
                  );
                })}
              </nav>
              {current ? (
                <div>
                  <p className="mt-4 text-[0.92rem] text-ink-3">
                    ข้อ {index + 1} จาก {ids.length}
                  </p>
                  <InteractionView key={current.id} it={current} variant="practice" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0}>
                      <ChevronLeft className="size-4" aria-hidden />
                      ข้อก่อนหน้า
                    </Button>
                    <span className="flex-1" />
                    {index < ids.length - 1 ? (
                      <Button variant={currentDone ? "primary" : "secondary"} onClick={() => go(index + 1)}>
                        {currentDone ? "ข้อต่อไป" : "ข้ามไปข้อต่อไป"}
                        <ChevronRight className="size-4" aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}
          {error ? (
            <Alert tone="danger" title="บันทึกการผ่านขั้นนี้ไม่สำเร็จ" className="mt-4">
              {error}
            </Alert>
          ) : null}
          {allCorrect || stageDone ? (
            <section className="mt-6 rounded-md border-2 border-ok/50 bg-ok-soft/50 p-4" aria-live="polite">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <PartyPopper className="size-5 text-ok" aria-hidden />
                ทำแบบฝึกถูกครบทุกข้อแล้ว
              </p>
              <p className="text-ink-2">ต่อไปลองทดลองในห้องทดลองเสมือนและทำภารกิจให้ครบ</p>
              <LinkButton href={stageHref("lab")} className="mt-3">
                ไปห้องทดลองเสมือน
              </LinkButton>
            </section>
          ) : null}
        </section>

        {examples.length ? (
          <section aria-labelledby="examples-h">
            <h2 id="examples-h" className="mb-1 flex items-center gap-2 text-[1.2rem] font-bold text-ink">
              <ListOrdered className="size-5 text-copper" aria-hidden />
              ตัวอย่างพร้อมวิธีทำ
            </h2>
            <p className="mb-3 text-ink-2">เปิดดูทีละตัวอย่าง กดดูวิธีทำทีละขั้น แล้วลองทำโจทย์คล้ายกันด้วยตนเอง</p>
            <div className="divide-y divide-line rounded-md border border-line bg-panel">
              {examples.map((ex, i) => (
                <Disclosure
                  key={ex.id}
                  summary={
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="readout text-ink-3">{i + 1}.</span>
                      {ex.title}
                      <Badge tone={levelTone[ex.level]}>{levelText[ex.level]}</Badge>
                    </span>
                  }
                >
                  <div className="px-4 pb-5">
                    <WorkedExampleView ex={ex} tryIt={ex.tryIt ? slice.interactions[ex.tryIt] : undefined} bare />
                  </div>
                </Disclosure>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </FigureNumbersProvider>
  );
}
