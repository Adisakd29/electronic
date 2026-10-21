/** Server-safe pieces: locked-week screen and loading skeletons. */
import { Lock, ListChecks } from "lucide-react";
import type { StageKey } from "@/content/course";
import { weekMeta } from "@/content/course";
import { STAGE_LABEL, stageGate } from "@/lib/stage-order";
import { LinkButton } from "@/components/ui";
import { Stepper } from "./Stepper";

/** A stage that is not open yet because earlier stages of the week are unfinished. */
export function StageLockedScreen({ basePath, stage, stagesDone, stagesOpen, skipQuiz = false }: { basePath: string; stage: StageKey; stagesDone: StageKey[]; stagesOpen: StageKey[]; skipQuiz?: boolean }) {
  const gate = stageGate(stage, stagesDone, { required: true, skipQuiz });
  const next = gate.missing[0] ?? "intro";
  return (
    <>
      <div className="mb-5 rounded-md border border-line bg-panel px-3 pb-3 pt-3 shadow-1 sm:px-4">
        <Stepper basePath={basePath} current={stage} done={stagesDone} open={stagesOpen} />
      </div>
      <section className="rounded-md border border-line bg-panel p-6 text-center sm:p-10" aria-labelledby="stage-locked-h">
        <span className="mx-auto grid size-14 place-items-center rounded-full border-[3px] border-dashed border-line-strong text-ink-3">
          <ListChecks className="size-6" aria-hidden />
        </span>
        <h2 id="stage-locked-h" className="mt-4 text-[1.3rem] font-bold text-ink">
          ขั้น{STAGE_LABEL[stage]}ยังไม่เปิด
        </h2>
        <p className="mx-auto mt-2 max-w-[52ch] text-ink-2">
          สัปดาห์นี้ต้องเรียนตามลำดับ ยังเหลือขั้นที่ต้องทำให้เสร็จก่อน: <strong className="text-ink">{gate.missing.map((m) => STAGE_LABEL[m]).join(" → ")}</strong>
        </p>
        <div className="mt-6 flex flex-col items-center gap-1">
          <LinkButton href={`${basePath}/${next}`}>ไปทำขั้น{STAGE_LABEL[next]}</LinkButton>
          <span className="text-[0.92rem] text-ink-3">ขั้นที่ทำเสร็จแล้วกลับมาทบทวนได้ทุกเมื่อ</span>
        </div>
      </section>
    </>
  );
}

export function LockedScreen({ week, reason }: { week: number; reason: string | null }) {
  const prev = week > 1 ? weekMeta[week - 2] : null;
  return (
    <section className="rounded-md border border-line bg-panel p-6 text-center sm:p-10" aria-labelledby="locked-h">
      <span className="mx-auto grid size-14 place-items-center rounded-full border-[3px] border-dashed border-line-strong text-ink-3">
        <Lock className="size-6" aria-hidden />
      </span>
      <h2 id="locked-h" className="mt-4 text-[1.3rem] font-bold text-ink">
        สัปดาห์ที่ {week} ยังล็อกอยู่
      </h2>
      <p className="mx-auto mt-2 max-w-[52ch] text-ink-2">{reason ?? "ทำสัปดาห์ก่อนหน้าให้ผ่านเกณฑ์ก่อน แล้วสัปดาห์นี้จะเปิดให้เรียนอัตโนมัติ"}</p>
      {prev ? (
        <div className="mt-6 flex flex-col items-center gap-1">
          <LinkButton href={`/learn/${prev.week}`}>กลับไปสัปดาห์ที่ {prev.week}</LinkButton>
          <span className="text-[0.92rem] text-ink-3">{prev.title}</span>
        </div>
      ) : null}
    </section>
  );
}

export function StageSkeleton({ basePath, stage }: { basePath: string; stage: StageKey }) {
  return (
    <div aria-busy="true" aria-label="กำลังโหลดบทเรียน">
      <div className="mb-5 rounded-md border border-line bg-panel px-3 pb-3 pt-3 shadow-1 sm:px-4">
        <Stepper basePath={basePath} current={stage} interactive={false} />
        <div className="ee-skeleton mt-3 h-2 rounded-full" />
      </div>
      <div className="space-y-3">
        <div className="ee-skeleton h-8 w-2/3 rounded-sm" />
        <div className="ee-skeleton h-4 w-full max-w-[72ch] rounded-sm" />
        <div className="ee-skeleton h-4 w-full max-w-[68ch] rounded-sm" />
        <div className="ee-skeleton h-4 w-5/6 max-w-[60ch] rounded-sm" />
        <div className="ee-skeleton mt-6 aspect-[5/3] w-full max-w-[720px] rounded-md" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="กำลังโหลด" className="space-y-3">
      <div className="ee-skeleton h-28 rounded-md" />
      <div className="ee-skeleton h-16 rounded-md" />
      <div className="ee-skeleton h-64 rounded-md" />
    </div>
  );
}
