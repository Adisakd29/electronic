"use client";
/** Block renderers that need client state: worked example, embedded lab. */
import { useEffect, useRef, useState } from "react";
import { ChevronsDown, FlaskConical, ListOrdered, Target } from "lucide-react";
import type { LabId, WorkedExample, Interaction } from "@/content/types";
import { labCatalog } from "@/labs";
import { Badge, Button } from "@/components/ui";
import { Markdown } from "../Markdown";
import { FigureView } from "../FigureView";
import { InteractionView } from "../interactions/InteractionView";
import { LabFrame } from "@/components/lab/useLab";

const levelText = { basic: "พื้นฐาน", intermediate: "ปานกลาง", advanced: "ท้าทาย" } as const;
const levelTone = { basic: "ok", intermediate: "info", advanced: "copper" } as const;

/** Worked example with steps revealed one at a time, then the answer and a try-it task. */
export function WorkedExampleView({ ex, tryIt, headingLevel = 3, bare = false }: { ex: WorkedExample; tryIt?: Interaction; headingLevel?: 3 | 4; bare?: boolean }) {
  const [shown, setShown] = useState(0);
  const done = shown >= ex.steps.length;
  const H = headingLevel === 3 ? "h3" : "h4";
  return (
    <div className={bare ? "" : "ee-example my-6 rounded-md border border-line bg-panel p-4 sm:p-5"}>
      {!bare ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <ListOrdered className="size-5 text-copper" aria-hidden />
          <H className="text-[1.05rem] font-semibold text-ink">ตัวอย่าง: {ex.title}</H>
          <Badge tone={levelTone[ex.level]}>{levelText[ex.level]}</Badge>
        </div>
      ) : null}
      <Markdown>{ex.problem}</Markdown>
      {ex.figure ? <FigureView fig={ex.figure} compact /> : null}
      {(ex.given && ex.given.length) || ex.find ? (
        <div className="my-3 grid gap-3 rounded-sm bg-panel-2 px-4 py-3 sm:grid-cols-2">
          {ex.given && ex.given.length ? (
            <div>
              <p className="font-semibold text-ink">โจทย์กำหนด</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-2">
                {ex.given.map((g, i) => (
                  <li key={i}>
                    <Markdown inline>{g}</Markdown>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {ex.find ? (
            <div>
              <p className="flex items-center gap-1.5 font-semibold text-ink">
                <Target className="size-4 text-cobalt" aria-hidden />
                สิ่งที่ต้องหา
              </p>
              <Markdown className="mt-1 text-ink-2">{ex.find}</Markdown>
            </div>
          ) : null}
        </div>
      ) : null}
      <ol className="mt-3 space-y-3" aria-live="polite">
        {ex.steps.slice(0, shown).map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="readout grid size-7 shrink-0 place-items-center rounded-full bg-copper-soft text-[0.85rem] font-semibold text-copper" aria-hidden>
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              {s.title ? <p className="font-semibold text-ink">{s.title}</p> : <span className="sr-only">ขั้นที่ {i + 1}</span>}
              <Markdown className="[&_p:last-child]:mb-0">{s.md}</Markdown>
            </div>
          </li>
        ))}
      </ol>
      {!done ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setShown((n) => n + 1)}>
            {shown === 0 ? "เริ่มดูวิธีทำ" : `แสดงขั้นที่ ${shown + 1}`}
          </Button>
          <Button variant="ghost" onClick={() => setShown(ex.steps.length)}>
            <ChevronsDown className="size-4" aria-hidden />
            แสดงทุกขั้น
          </Button>
          <span className="self-center text-[0.9rem] text-ink-3">
            {shown}/{ex.steps.length} ขั้น
          </span>
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-md border-2 border-copper/50 bg-copper-soft/50 px-4 py-3">
            <p className="font-semibold text-ink">คำตอบ</p>
            <Markdown className="[&_p:last-child]:mb-0">{ex.answer}</Markdown>
          </div>
          {ex.check ? (
            <div className="mt-3 rounded-sm border border-line px-4 py-2.5 text-[0.95rem]">
              <p className="font-semibold text-ink">ตรวจความสมเหตุสมผล</p>
              <Markdown className="text-ink-2 [&_p:last-child]:mb-0">{ex.check}</Markdown>
            </div>
          ) : null}
          {tryIt ? (
            <div className="mt-4">
              <p className="font-semibold text-ink">ลองทำเอง</p>
              <InteractionView it={tryIt} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Lab embedded in a learn step (compact mode). */
export function LabEmbed({ lab, preset, md }: { lab: LabId; preset?: string; md?: string }) {
  const [on, setOn] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const meta = labCatalog[lab];
  // Load the lab chunk when the block scrolls near the viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setOn(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} className="ee-lab-embed my-6 rounded-md border border-copper/40 bg-panel p-4" aria-label={`ห้องทดลองย่อ: ${meta?.title ?? lab}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <FlaskConical className="size-5 text-copper" aria-hidden />
        <p className="font-semibold text-ink">ลองในห้องทดลอง: {meta?.title ?? lab}</p>
      </div>
      {md ? <Markdown className="mb-3">{md}</Markdown> : null}
      {on ? (
        <LabFrame id={lab} preset={preset} compact />
      ) : (
        <Button variant="secondary" onClick={() => setOn(true)}>
          <FlaskConical className="size-4" aria-hidden />
          เปิดห้องทดลอง
        </Button>
      )}
    </section>
  );
}
