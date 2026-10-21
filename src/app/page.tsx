import { Suspense } from "react";
import Link from "next/link";
import { BookOpenCheck, ClipboardCheck, Flag, FlaskConical, MousePointerClick, Presentation } from "lucide-react";
import { course, stages, weekMeta } from "@/content/course";
import type { LabId } from "@/content/types";
import { labCatalog } from "@/labs";
import { getSidebarData } from "@/server/queries";
import { guestModeEnabled } from "@/lib/env";
import type { SidebarData } from "@/server/contracts";
import { LinkButton } from "@/components/ui";
import { PcbRoadmap, RoadmapLegend } from "@/components/shell/PcbRoadmap";
import { Safe } from "@/components/shell/Safe";
import { labIcon } from "@/components/shell/labIcons";

const stageInfo: Record<string, { text: string; icon: React.ReactNode }> = {
  intro: { text: "รู้จุดประสงค์ เห็นสถานการณ์จริงที่ต้องใช้ความรู้นี้ และอุ่นเครื่องด้วยคำถามสั้น ๆ", icon: <Presentation className="size-5" aria-hidden /> },
  learn: { text: "อ่านเนื้อหาทีละขั้น พร้อมภาพวงจร สูตร ตัวอย่าง และคำถามระหว่างเรียน", icon: <BookOpenCheck className="size-5" aria-hidden /> },
  practice: { text: "ฝึกจับคู่ เรียงลำดับ เติมค่า หาจุดผิด ตอบผิดได้และจะรู้ว่าผิดเพราะอะไร", icon: <MousePointerClick className="size-5" aria-hidden /> },
  lab: { text: "ทดลองกับวงจรเสมือนแรงดันต่ำ ทำภารกิจ และเตรียมใบงานสำหรับปฏิบัติจริงในโรงฝึกงาน", icon: <FlaskConical className="size-5" aria-hidden /> },
  quiz: { text: "แบบทดสอบสุ่มจากคลังข้อสอบ ผ่านเกณฑ์เพื่อปลดล็อกสัปดาห์ถัดไป ทำซ้ำได้", icon: <ClipboardCheck className="size-5" aria-hidden /> },
  complete: { text: "สรุปประเด็น แผนผังความคิด สูตร คำศัพท์ และภารกิจท้าทายประจำสัปดาห์", icon: <Flag className="size-5" aria-hidden /> },
};

function resumeHref(d: SidebarData) {
  const r = d.resume;
  if (!r) return { href: `/learn/${d.currentWeek}`, week: d.currentWeek };
  return { href: `/learn/${r.week}/${r.stage}${r.stage === "learn" ? `?step=${r.stepIndex + 1}` : ""}`, week: r.week };
}

const ctaFallback = (
  <LinkButton href="/learn" size="lg">
    เข้าสู่บทเรียน
  </LinkButton>
);

async function Cta({ data }: { data: Promise<SidebarData | null> }) {
  const d = await data;
  if (!d) {
    if (!guestModeEnabled()) {
      return (
        <LinkButton href="/login?next=/learn" size="lg">
          เข้าสู่ระบบเพื่อเริ่มเรียน
        </LinkButton>
      );
    }
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <LinkButton href="/learn" size="lg">
            เริ่มเรียนเลย
          </LinkButton>
          <LinkButton href="/login?next=/learn" size="lg" variant="secondary">
            เข้าสู่ระบบ
          </LinkButton>
        </div>
        <p className="max-w-[46ch] text-[0.95rem] text-ink-3">เรียนได้ทันทีโดยไม่ต้องมีบัญชี นักเรียนในชั้นเรียนควรเข้าสู่ระบบ เพื่อให้ครูเห็นผลการเรียนและทำแบบทดสอบได้</p>
      </div>
    );
  }
  const r = resumeHref(d);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <LinkButton href={r.href} size="lg">
        เรียนต่อ สัปดาห์ที่ {r.week}
      </LinkButton>
      <Link href="/dashboard" className="font-semibold text-cobalt-ink underline underline-offset-4">
        ดูแดชบอร์ดของฉัน
      </Link>
    </div>
  );
}

async function LiveRoadmap({ data }: { data: Promise<SidebarData | null> }) {
  const d = await data;
  return <PcbRoadmap statuses={d?.weeks} current={d?.currentWeek} />;
}

export default function Home() {
  const data = getSidebarData(); // started here, awaited inside Suspense boundaries
  const labs = Object.entries(labCatalog) as [LabId, (typeof labCatalog)[LabId]][];
  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1240px] px-4 pb-20 outline-none sm:px-6">
      {/* Hero */}
      <section aria-labelledby="hero-h" className="pt-8 sm:pt-12">
        <div className="grid gap-x-10 gap-y-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <p className="text-ink-3">
              รายวิชา {course.code} {course.level}
            </p>
            <h1 id="hero-h" className="mt-1 text-[2rem] font-bold leading-[1.25] text-ink sm:text-[2.6rem]">
              {course.name}
            </h1>
            <p className="mt-1 text-[1.05rem] text-ink-3" lang="en">
              {course.nameEn}
            </p>
          </div>
          <div className="space-y-4">
            <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line">
              <div className="bg-panel px-3 py-2.5">
                <dt className="text-[0.85rem] text-ink-3">หน่วยกิต</dt>
                <dd className="text-[1.05rem] font-semibold text-ink">
                  {course.credits.credits} <span className="text-[0.85rem] font-normal text-ink-3">(ท {course.credits.theory} ป {course.credits.practice})</span>
                </dd>
              </div>
              <div className="bg-panel px-3 py-2.5">
                <dt className="text-[0.85rem] text-ink-3">ระยะเวลา</dt>
                <dd className="text-[1.05rem] font-semibold text-ink">{course.weeks} สัปดาห์</dd>
              </div>
              <div className="bg-panel px-3 py-2.5">
                <dt className="text-[0.85rem] text-ink-3">ต่อสัปดาห์</dt>
                <dd className="text-[1.05rem] font-semibold text-ink">{course.hoursPerWeek} ชั่วโมง</dd>
              </div>
            </dl>
            <Safe fallback={ctaFallback}>
              <Suspense fallback={ctaFallback}>
                <Cta data={data} />
              </Suspense>
            </Safe>
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-[1.15rem] font-semibold text-ink">เส้นทางการเรียน 18 สัปดาห์</h2>
            <RoadmapLegend />
          </div>
          <Safe fallback={<PcbRoadmap />}>
            <Suspense fallback={<PcbRoadmap />}>
              <LiveRoadmap data={data} />
            </Suspense>
          </Safe>
        </div>
      </section>

      {/* Overview */}
      <section aria-labelledby="ov-h" className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h2 id="ov-h" className="mb-3 text-[1.4rem] font-bold text-ink">
            คำอธิบายรายวิชา
          </h2>
          <p className="max-w-[68ch] text-ink-2">{course.description}</p>
          <p className="mt-4 max-w-[68ch] text-[0.95rem] text-ink-3">อ้างอิงมาตรฐาน: {course.standardRef}</p>
        </div>
        <div className="rounded-md border border-line bg-panel p-5">
          <h3 className="mb-2 font-semibold text-ink">ผลลัพธ์การเรียนรู้ระดับรายวิชา</h3>
          <p className="text-ink-2">{course.outcome}</p>
        </div>
      </section>

      {/* Outcomes & competencies */}
      <section aria-labelledby="oc-h" className="mt-14">
        <h2 id="oc-h" className="mb-5 text-[1.4rem] font-bold text-ink">
          จุดประสงค์และสมรรถนะรายวิชา
        </h2>
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 font-semibold text-ink">จุดประสงค์รายวิชา</h3>
            <ol className="space-y-3">
              {course.objectives.map((o, i) => (
                <li key={i} className="flex gap-3 text-ink-2">
                  <span className="readout mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 border-copper text-[0.85rem] font-semibold text-copper" aria-hidden>
                    {i + 1}
                  </span>
                  <span>{o}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="mb-3 font-semibold text-ink">สมรรถนะรายวิชา</h3>
            <ol className="divide-y divide-line rounded-md border border-line bg-panel">
              {course.competencies.map((c) => (
                <li key={c.no} className="flex gap-3 px-4 py-3 text-ink-2">
                  <span className="readout shrink-0 font-semibold text-ink">{c.no}.</span>
                  <span>{c.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* How a week works */}
      <section aria-labelledby="hw-h" className="mt-16">
        <h2 id="hw-h" className="text-[1.4rem] font-bold text-ink">
          หนึ่งสัปดาห์เรียนอย่างไร
        </h2>
        <p className="mt-1 max-w-[65ch] text-ink-2">ทุกสัปดาห์เดินตามเส้นทางเดียวกัน 6 ขั้น ระบบบันทึกความก้าวหน้าให้อัตโนมัติ กลับมาเรียนต่อจากจุดเดิมได้ทุกเมื่อ</p>
        <ol className="relative mt-6 grid gap-y-6 md:grid-cols-6 md:gap-x-4">
          <span aria-hidden className="ee-path-line absolute left-[1.15rem] top-4 bottom-4 w-[3px] md:left-[8%] md:right-[8%] md:top-[1.15rem] md:bottom-auto md:h-[3px] md:w-auto" />
          {stages.map((s, i) => (
            <li key={s.key} className="relative flex gap-4 md:flex-col md:items-center md:gap-3 md:text-center">
              <span className="relative z-10 grid size-[2.35rem] shrink-0 place-items-center rounded-full border-[3px] border-copper bg-panel text-copper">{stageInfo[s.key].icon}</span>
              <div>
                <p className="font-semibold text-ink">
                  <span className="readout mr-1 text-ink-3">{i + 1}.</span>
                  {s.label}
                </p>
                <p className="mt-0.5 text-[0.95rem] text-ink-2">{stageInfo[s.key].text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Labs */}
      <section aria-labelledby="labs-h" className="mt-16">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="labs-h" className="text-[1.4rem] font-bold text-ink">
              ห้องทดลองเสมือน 10 ชุด
            </h2>
            <p className="mt-1 max-w-[65ch] text-ink-2">วงจรแรงดันต่ำที่ปรับค่าได้จริง ทุกห้องบอกข้อสมมติของแบบจำลองไว้ชัดเจน ทดลองก่อนลงมือในโรงฝึกงาน</p>
          </div>
          <Link href="/labs" className="font-semibold text-cobalt-ink underline underline-offset-4">
            ดูห้องทดลองทั้งหมด
          </Link>
        </div>
        <ul className="grid gap-x-8 sm:grid-cols-2">
          {labs.map(([id, l]) => {
            const Icon = labIcon[id];
            return (
              <li key={id} className="border-t border-line">
                <Link href={`/labs/${id}`} className="group flex gap-4 rounded-sm py-4 hover:bg-panel/70">
                  <span className="grid size-11 shrink-0 place-items-center rounded-md border border-copper/40 bg-copper-soft text-copper">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink group-hover:text-cobalt-ink">{l.title}</span>
                    <span className="block text-[0.95rem] text-ink-2">{l.summary}</span>
                    <span className="mt-1 block text-[0.85rem] text-ink-3">ใช้ในสัปดาห์ที่ {l.weeks.join(", ")}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="mt-20 border-t border-line pt-6 text-[0.92rem] text-ink-3">
        <p>
          {course.code} {course.name} ({course.nameEn}) ทฤษฎี {course.credits.theory} ปฏิบัติ {course.credits.practice} หน่วยกิต {course.credits.credits}
        </p>
        <p className="mt-1">
          เนื้อหา {weekMeta.length} สัปดาห์ ภาพลายเส้นและห้องทดลองเสมือนจัดทำขึ้นใหม่สำหรับรายวิชานี้ ·{" "}
          <Link href="/credits" className="underline underline-offset-4">
            ที่มาของภาพถ่าย
          </Link>
        </p>
      </footer>
    </main>
  );
}
