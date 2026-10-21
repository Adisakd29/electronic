"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookMarked, CheckCircle2, ClipboardCheck, ExternalLink, Flag, LoaderCircle, Printer, Search, ShieldAlert, Swords, Trophy } from "lucide-react";
import { categoryInfo, course, stages, type StageKey } from "@/content/course";
import type { VocabEntry } from "@/content/types";
import { DOMAINS } from "@/lib/competency-domains";
import { Alert, Badge, Button, LinkButton } from "@/components/ui";
import { Disclosure } from "@/components/ui/client";
import { cn } from "@/lib/cn";
import { activityTypeText, SafetyBadge } from "../SafetyBadge";
import type { WeekCriteria } from "../slice";
import { Markdown, Tex } from "../Markdown";
import { MindMap } from "../MindMap";
import { FigureNumbersProvider } from "../lesson-context";
import { interactionFigures, numberFigures } from "../lib/figures";
import { InteractionView } from "../interactions/InteractionView";
import { usePlayer } from "./context";
import { GUEST_REQUIRED } from "../guest";
import { toastError, toastRewards } from "./rewards";

export function VocabTable({ vocab }: { vocab: VocabEntry[] }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return vocab;
    return vocab.filter((v) => `${v.th} ${v.en} ${v.def}`.toLowerCase().includes(s));
  }, [q, vocab]);
  return (
    <div>
      <label className="relative mb-3 block max-w-sm print:hidden">
        <span className="sr-only">ค้นหาคำศัพท์</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาคำศัพท์ ไทยหรืออังกฤษ"
          className="h-11 w-full rounded-sm border border-line-strong bg-panel pl-9 pr-3 text-ink placeholder:text-ink-3"
        />
      </label>
      <p className="sr-only" aria-live="polite">
        พบ {list.length} คำ
      </p>
      <div className="overflow-x-auto rounded-md border border-line bg-panel">
        <table className="w-full min-w-[520px] text-[0.95rem]">
          <caption className="sr-only">คำศัพท์ท้ายบท</caption>
          <thead>
            <tr className="bg-panel-2 text-left">
              <th scope="col" className="px-3 py-2 font-semibold">ภาษาไทย</th>
              <th scope="col" className="px-3 py-2 font-semibold">ภาษาอังกฤษ</th>
              <th scope="col" className="px-3 py-2 font-semibold">ความหมาย</th>
            </tr>
          </thead>
          <tbody>
            {list.map((v, i) => (
              <tr key={`${v.en}-${i}`} className="border-t border-line align-top">
                <th scope="row" className="px-3 py-2 text-left font-semibold text-ink">{v.th}</th>
                <td className="px-3 py-2 text-ink-2" lang="en">{v.en}</td>
                <td className="px-3 py-2 text-ink-2">
                  <Markdown inline>{v.def}</Markdown>
                </td>
              </tr>
            ))}
            {list.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-ink-3">
                  ไม่พบคำว่า “{q}” ลองพิมพ์คำสั้นลงหรือสะกดภาษาอังกฤษ
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * "เกณฑ์การผ่านสัปดาห์นี้ / เกณฑ์ประเมินสมรรถนะ" — computed from the slice only, so
 * guests see the same box. `compact` is the short version under the intro objectives.
 */
export function WeekCriteriaBox({ criteria, week, compact = false, className }: { criteria: WeekCriteria; week: number; compact?: boolean; className?: string }) {
  const c = criteria;
  const id = compact ? "crit-intro-h" : "crit-h";
  const must: string[] = [];
  if (c.stepCount) must.push(`เรียนรู้ครบ ${c.stepCount} หัวข้อ`);
  if (c.practiceCount) must.push(`ฝึกปฏิบัติเชิงโต้ตอบถูกครบ ${c.practiceCount} ข้อ (ตอบซ้ำได้จนกว่าจะถูก)`);
  if (c.labTasks.total) {
    const parts = [c.labTasks.state ? `ปฏิบัติในแล็บ ${c.labTasks.state}` : "", c.labTasks.numeric ? `ตัวเลข ${c.labTasks.numeric}` : "", c.labTasks.mcq ? `เลือกตอบ ${c.labTasks.mcq}` : ""].filter(Boolean);
    must.push(`ทำภารกิจห้องทดลองเสมือนถูกครบ ${c.labTasks.total} ภารกิจ (${parts.join(" · ")})`);
  }
  must.push(`แบบทดสอบหลังเรียน ${c.quiz.drawCount} ข้อ ต้องได้อย่างน้อย ${c.quiz.passPercent} % (ทำใหม่ได้ ชุดข้อสอบสุ่มใหม่ทุกครั้ง)`);
  const submits = c.activities.filter((a) => a.submit);
  if (submits.length) must.push(`ส่งใบงาน ${submits.length} ชิ้นให้ครูตรวจตามเกณฑ์ (ไม่กั้นการจบสัปดาห์ แต่ครูอาจใช้ปลดล็อกสัปดาห์ถัดไป)`);
  if (c.hasChallenge) must.push("ภารกิจท้าทาย: ไม่บังคับ แต่ได้ XP และนับเป็นหลักฐานด้านการแก้ปัญหา");
  const comps = c.courseCompetencies.map((n) => course.competencies.find((x) => x.no === n)).filter((x): x is (typeof course.competencies)[number] => Boolean(x));
  const domains = DOMAINS.filter((d) => c.domains.includes(d.key));

  return (
    <section aria-labelledby={id} className={cn("rounded-md border border-line bg-panel", compact ? "px-4 py-3" : "p-5", className)}>
      <h2 id={id} className={cn("flex items-center gap-2 font-bold text-ink", compact ? "text-[1.05rem]" : "text-[1.2rem]")}>
        <ClipboardCheck className="size-5 text-cobalt" aria-hidden />
        {compact ? "เกณฑ์การผ่านสัปดาห์นี้" : "เกณฑ์การผ่านสัปดาห์นี้ / เกณฑ์ประเมินสมรรถนะ"}
      </h2>
      <div className={cn("mt-2 grid gap-5", !compact && "md:grid-cols-2")}>
        <div>
          <p className="font-semibold text-ink">สิ่งที่ต้องทำให้ครบ</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-ink-2">
            {must.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ol>
          <p className="mt-2 text-[0.9rem] text-ink-3">
            เกณฑ์ผ่านแบบทดสอบ <span className="readout font-semibold text-ink">{c.quiz.passPercent} %</span> · สัปดาห์ที่ {week}
          </p>
        </div>
        <div className="space-y-3">
          {comps.length ? (
            <div>
              <p className="font-semibold text-ink">สมรรถนะรายวิชาที่สัปดาห์นี้สนับสนุน</p>
              <ul className="mt-1 space-y-1 text-ink-2">
                {comps.map((x) => (
                  <li key={x.no} className="flex gap-2">
                    <Badge tone="neutral">C{x.no}</Badge>
                    <span>{x.text}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[0.88rem] text-ink-3">ครูบันทึกผลสมรรถนะรายวิชาจากการปฏิบัติจริง</p>
            </div>
          ) : null}
          {domains.length ? (
            <div>
              <p className="font-semibold text-ink">หลักฐานจากสัปดาห์นี้นับเข้าสมรรถนะ 4 ด้าน</p>
              <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="ด้านที่ได้รับหลักฐาน">
                {domains.map((d) => (
                  <li key={d.key}>
                    <Badge tone="info">ด้านที่ {d.no} {d.title}</Badge>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[0.88rem] text-ink-3">คำนวณจากกิจกรรมและห้องทดลองเสมือน แยกจากผลปฏิบัติจริงที่ครูบันทึก (ดูได้ที่แดชบอร์ด)</p>
            </div>
          ) : null}
        </div>
      </div>
      {c.activities.length ? (
        <Disclosure
          className="mt-3 rounded-sm border border-line"
          summary={`ใบงานและเกณฑ์การให้คะแนน (${c.activities.length} รายการ)`}
        >
          <ul className="divide-y divide-line border-t border-line">
            {c.activities.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{a.title}</span>
                  <Badge tone="neutral">{activityTypeText[a.type]}</Badge>
                  {a.submit ? <Badge tone="info">ต้องส่งไฟล์</Badge> : <Badge tone="neutral">ครูตรวจในชั้นเรียน</Badge>}
                </p>
                <SafetyBadge level={a.safety} className="mt-1" />
                {a.rubric.length ? (
                  <table className="mt-2 w-full text-[0.92rem]">
                    <caption className="sr-only">เกณฑ์การให้คะแนน {a.title}</caption>
                    <thead>
                      <tr className="text-left text-ink-3">
                        <th scope="col" className="py-1 pr-2 font-medium">เกณฑ์</th>
                        <th scope="col" className="py-1 text-right font-medium">คะแนนเต็ม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.rubric.map((r, i) => (
                        <tr key={i} className="border-t border-line">
                          <td className="py-1 pr-2 text-ink-2">{r.criterion}</td>
                          <td className="readout py-1 text-right text-ink">{r.weight}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-line font-semibold">
                        <td className="py-1 pr-2 text-ink">รวม (ระดับ 1–4 ต่อเกณฑ์ คะแนน = น้ำหนัก × ระดับ ÷ 4)</td>
                        <td className="readout py-1 text-right text-ink">{a.rubric.reduce((s, r) => s + r.weight, 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : null}
              </li>
            ))}
          </ul>
        </Disclosure>
      ) : null}
    </section>
  );
}

function Section({ id, title, icon, children }: { id: string; title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="break-inside-avoid-page">
      <h2 id={id} className="mb-3 flex items-center gap-2 text-[1.2rem] font-bold text-ink">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CompleteStage() {
  const { slice, progress, setProgress, api, completeStage, stageHref, nextWeek, isGuest } = usePlayer();
  const s = slice.summary;
  const color = `var(${categoryInfo[slice.category].cssVar})`;
  const challengeIt = slice.challenge?.interaction ? slice.interactions[slice.challenge.interaction] : undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const challengeSent = useRef(false);
  const required: StageKey[] = isGuest ? GUEST_REQUIRED : ["intro", "learn", "practice", "lab", "quiz"];
  const missing = required.filter((k) => !progress.stagesDone.includes(k));
  const finished = progress.stagesDone.includes("complete");
  const numbers = useMemo(() => numberFigures(challengeIt ? interactionFigures(challengeIt).map((f) => f.figure) : []), [challengeIt]);

  const finish = async () => {
    setBusy(true);
    setError(null);
    const r = await completeStage("complete");
    setBusy(false);
    if (!r.ok) setError(r.error);
  };

  if (!s) return null;

  return (
    <FigureNumbersProvider value={numbers}>
      <div className="ee-summary space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[1.35rem] font-bold text-ink">สรุปบทเรียนสัปดาห์ที่ {slice.week}</h2>
          <Button variant="secondary" size="sm" onClick={() => window.print()} className="print:hidden">
            <Printer className="size-4" aria-hidden />
            พิมพ์สรุป
          </Button>
        </div>

        {s.keyPoints.length ? (
          <Section id="kp-h" title="ประเด็นสำคัญ">
            <ol className="max-w-[72ch] space-y-3">
              {s.keyPoints.map((k, i) => (
                <li key={i} className="flex gap-3">
                  <span className="readout grid size-7 shrink-0 place-items-center rounded-full text-[0.85rem] font-semibold text-white dark:text-paper" style={{ background: color }} aria-hidden>
                    {i + 1}
                  </span>
                  <Markdown className="min-w-0 flex-1 [&_p:last-child]:mb-0">{k}</Markdown>
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        {s.mindmap.branches.length ? (
          <Section id="mm-h" title="แผนผังความคิด">
            <div className="rounded-md border border-line bg-panel p-3 sm:p-4">
              <MindMap map={s.mindmap} color={color} />
            </div>
          </Section>
        ) : null}

        {s.formulas.length ? (
          <Section id="fx-h" title="สูตรสำคัญ">
            <ul className="grid gap-3 sm:grid-cols-2">
              {s.formulas.map((f, i) => (
                <li key={i} className="rounded-md border border-line bg-panel px-4 py-3">
                  <p className="text-[0.92rem] font-semibold text-ink-2">{f.label}</p>
                  <Tex tex={f.tex} display className="text-[1.1rem]" />
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {s.vocab.length ? (
          <Section id="voc-h" title="คำศัพท์ท้ายบท">
            <VocabTable vocab={s.vocab} />
          </Section>
        ) : null}

        {slice.safety && slice.safety.length ? (
          <section aria-labelledby="safe-h" className="ee-callout-safety max-w-[72ch] rounded-md px-5 py-4">
            <h2 id="safe-h" className="mb-2 flex items-center gap-2 text-[1.15rem] font-bold text-ink">
              <ShieldAlert className="size-6" aria-hidden />
              ทบทวนความปลอดภัย
            </h2>
            <ul className="list-disc space-y-1.5 pl-5 text-ink">
              {slice.safety.map((x, i) => (
                <li key={i}>
                  <Markdown inline>{x}</Markdown>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {slice.resources && slice.resources.length ? (
          <Section id="res-h" title="แหล่งเรียนรู้เพิ่มเติม" icon={<BookMarked className="size-5 text-cobalt" aria-hidden />}>
            <ul className="max-w-[72ch] divide-y divide-line rounded-md border border-line bg-panel">
              {slice.resources.map((r, i) => (
                <li key={i} className="px-4 py-3">
                  <p className="flex flex-wrap items-center gap-2">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-cobalt-ink underline-offset-4 hover:underline">
                        {r.title}
                        <ExternalLink className="size-3.5" aria-hidden />
                        <span className="sr-only">(เปิดในแท็บใหม่)</span>
                      </a>
                    ) : (
                      <span className="font-semibold text-ink">{r.title}</span>
                    )}
                    <Badge tone="neutral">{r.lang === "th" ? "ภาษาไทย" : "ภาษาอังกฤษ"}</Badge>
                  </p>
                  <p className="text-[0.92rem] text-ink-3">{r.publisher}</p>
                  <p className="text-ink-2">{r.description}</p>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {slice.challenge && slice.challenge.title ? (
          <Section id="ch-h" title="ภารกิจท้าทายประจำสัปดาห์" icon={<Swords className="size-5 text-copper" aria-hidden />}>
            <div className="rounded-md border-2 border-copper/50 bg-panel p-4 sm:p-5 print:hidden">
              <p className="text-[1.05rem] font-semibold text-ink">{slice.challenge.title}</p>
              <Markdown className="mt-1 text-ink-2">{slice.challenge.md}</Markdown>
              {progress.challengeDone ? (
                <p className="mt-2 inline-flex items-center gap-2 font-semibold text-ok">
                  <Trophy className="size-5" aria-hidden />
                  ทำภารกิจท้าทายสำเร็จแล้ว
                </p>
              ) : null}
              {challengeIt ? (
                <InteractionView
                  it={challengeIt}
                  variant="practice"
                  onResult={async (correct) => {
                    if (!correct || progress.challengeDone || challengeSent.current) return;
                    challengeSent.current = true;
                    const r = await api.completeChallenge(slice.week);
                    if (r.ok) {
                      setProgress((p) => ({ ...p, challengeDone: true }));
                      toastRewards(r.data);
                    } else {
                      challengeSent.current = false;
                      toastError(r.error);
                    }
                  }}
                />
              ) : null}
            </div>
          </Section>
        ) : null}

        <WeekCriteriaBox criteria={slice.criteria} week={slice.week} />

        <section aria-labelledby="fin-h" className="rounded-md border border-line bg-panel p-5 print:hidden">
          <h2 id="fin-h" className="mb-2 flex items-center gap-2 text-[1.2rem] font-bold text-ink">
            <Flag className="size-5" style={{ color }} aria-hidden />
            จบบทเรียนสัปดาห์นี้
          </h2>
          {finished ? (
            <div aria-live="polite">
              <p className="flex items-center gap-2 font-semibold text-ok">
                <CheckCircle2 className="size-5" aria-hidden />
                เรียนจบสัปดาห์ที่ {slice.week} แล้ว
              </p>
              {nextWeek ? (
                <LinkButton href={nextWeek.href} className="mt-3">
                  เรียนต่อ สัปดาห์ที่ {nextWeek.week}
                </LinkButton>
              ) : (
                <p className="mt-2 text-ink-2">นี่คือสัปดาห์สุดท้ายของรายวิชา ดูผลรวมและใบรับรองได้ที่แดชบอร์ด</p>
              )}
            </div>
          ) : missing.length ? (
            <>
              <p className="text-ink-2">ทำขั้นต่อไปนี้ให้เสร็จก่อน แล้วกดจบบทเรียนได้</p>
              <ul className="mt-2 space-y-1">
                {missing.map((k) => (
                  <li key={k}>
                    <Link href={stageHref(k)} className="font-semibold text-cobalt-ink underline underline-offset-4">
                      {stages.find((x) => x.key === k)?.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <Button className="mt-4" disabled>
                จบบทเรียนสัปดาห์นี้
              </Button>
            </>
          ) : (
            <>
              <p className="text-ink-2">ทำครบทุกขั้นแล้ว กดปุ่มเพื่อบันทึกว่าเรียนจบสัปดาห์นี้</p>
              <Button className="mt-3" size="lg" onClick={finish} disabled={busy}>
                {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : null}
                จบบทเรียนสัปดาห์นี้
              </Button>
            </>
          )}
          {error ? (
            <Alert tone="danger" title="บันทึกไม่สำเร็จ" className="mt-3">
              {error}
            </Alert>
          ) : null}
        </section>
      </div>
    </FigureNumbersProvider>
  );
}
