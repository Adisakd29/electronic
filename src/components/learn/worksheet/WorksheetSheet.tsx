/**
 * Printable worksheet (ใบงาน) for one PracticeActivity — server-safe, static.
 * Laid out for A4 (see `.ee-worksheet` print rules in globals.css).
 */
import { course } from "@/content/course";
import type { PracticeActivity } from "@/content/types";
import { Markdown } from "../Markdown";
import { SafetyBadge, activityTypeText } from "../SafetyBadge";

const LEVELS = [
  { n: 4, label: "ดีมาก" },
  { n: 3, label: "ดี" },
  { n: 2, label: "พอใช้" },
  { n: 1, label: "ปรับปรุง" },
] as const;

function Blank({ label, className }: { label: string; className?: string }) {
  return (
    <div className={`flex min-w-0 items-end gap-2 ${className ?? ""}`}>
      <span className="shrink-0 text-ink-2">{label}</span>
      <span aria-hidden className="ee-answer-line h-7 min-w-0 flex-1 border-b border-dotted border-line-strong" />
    </div>
  );
}

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-2 flex items-baseline gap-2 text-[1.12rem] font-bold text-ink">
      <span className="readout text-copper">{n}.</span>
      {children}
    </h2>
  );
}

export function WorksheetSheet({ activity: a, week, weekTitle }: { activity: PracticeActivity; week: number; weekTitle: string }) {
  const total = a.rubric.reduce((s, r) => s + r.weight, 0);
  let sec = 0;
  const next = () => ++sec;
  const rows = a.record ? Math.max(a.record.rows, a.record.firstColumn?.length ?? 0) : 0;

  return (
    <article className="ee-sheet ee-worksheet mx-auto max-w-[210mm] rounded-md border border-line bg-panel p-5 shadow-1 sm:p-8" aria-labelledby="ws-title">
      {/* Header */}
      <header className="border-b-2 border-ink pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[0.92rem] text-ink-2">
          <span>
            รายวิชา {course.code} {course.name}
          </span>
          <span className="readout">{a.id}</span>
        </div>
        <p className="mt-2 text-[0.95rem] text-ink-3">
          สัปดาห์ที่ {week} {weekTitle}
        </p>
        <h1 id="ws-title" className="mt-1 text-[1.4rem] font-bold leading-snug text-ink">
          {activityTypeText[a.type]}: {a.title}
        </h1>
        <p className="mt-1 text-[0.92rem] text-ink-3">เวลาที่ใช้ประมาณ {a.minutes} นาที</p>
      </header>

      {/* Student fields */}
      <div className="ee-ws-keep mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[minmax(0,2.2fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.2fr)]" aria-label="ข้อมูลผู้เรียน">
        <Blank label="ชื่อ-นามสกุล" />
        <Blank label="เลขที่" />
        <Blank label="ห้อง" />
        <Blank label="วันที่" />
      </div>

      <section className="ee-ws-keep mt-6">
        <SectionTitle n={next()}>จุดประสงค์</SectionTitle>
        <Markdown className="text-ink-2 [&_p:last-child]:mb-0">{a.objective}</Markdown>
      </section>

      {a.equipment.length ? (
        <section className="ee-ws-keep mt-6">
          <SectionTitle n={next()}>เครื่องมือและวัสดุอุปกรณ์</SectionTitle>
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {a.equipment.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-ink-2">
                <span aria-hidden className="mt-[0.45em] inline-block size-3.5 shrink-0 rounded-[2px] border border-line-strong" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="ee-ws-keep mt-6">
        <SectionTitle n={next()}>ความปลอดภัย</SectionTitle>
        <div className="ee-ws-safety rounded-md border-2 border-signal bg-signal-soft/60 p-4">
          <SafetyBadge level={a.safety} detailed />
          {a.safetyNotes.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-6 text-ink-2">
              {a.safetyNotes.map((s, i) => (
                <li key={i}>
                  <Markdown inline>{s}</Markdown>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {a.procedure.length ? (
        <section className="mt-6">
          <SectionTitle n={next()}>ขั้นตอนการปฏิบัติงาน</SectionTitle>
          <ol className="space-y-2">
            {a.procedure.map((p, i) => (
              <li key={i} className="flex gap-3 text-ink-2 break-inside-avoid">
                <span className="readout mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 border-copper text-[0.85rem] font-semibold text-copper" aria-hidden>
                  {i + 1}
                </span>
                <span className="sr-only">ขั้นที่ {i + 1} </span>
                <Markdown className="min-w-0 flex-1 [&_p:last-child]:mb-0">{p}</Markdown>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {a.record && a.record.headers.length ? (
        <section className="mt-6">
          <SectionTitle n={next()}>{a.record.title || "ตารางบันทึกผล"}</SectionTitle>
          <div className="ee-ws-scroll overflow-x-auto">
            <table className="ee-ws-table w-full min-w-[520px] border-collapse text-[0.95rem]">
              <caption className="sr-only">{a.record.title || "ตารางบันทึกผล"} (เว้นว่างไว้สำหรับเขียน)</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-10 border border-line-strong bg-panel-2 px-2 py-1.5 text-center font-semibold text-ink-2">
                    ที่
                  </th>
                  {a.record.headers.map((h, i) => (
                    <th key={i} scope="col" className="border border-line-strong bg-panel-2 px-2 py-1.5 text-left font-semibold text-ink-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rows }, (_, r) => (
                  <tr key={r}>
                    <td className="readout h-10 border border-line-strong px-2 text-center text-ink-3">{r + 1}</td>
                    {a.record!.headers.map((_, c) => (
                      <td key={c} className="h-10 border border-line-strong px-2 text-ink-2">
                        {c === 0 ? (a.record!.firstColumn?.[r] ?? "") : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {a.questions && a.questions.length ? (
        <section className="mt-6">
          <SectionTitle n={next()}>คำถามท้ายใบงาน</SectionTitle>
          <ol className="space-y-4">
            {a.questions.map((q, i) => (
              <li key={i} className="break-inside-avoid">
                <div className="flex gap-2 text-ink">
                  <span className="shrink-0 font-semibold">{i + 1}.</span>
                  <Markdown className="min-w-0 flex-1 [&_p:last-child]:mb-0">{q}</Markdown>
                </div>
                <div aria-hidden className="mt-1 space-y-0 pl-6">
                  {[0, 1, 2].map((k) => (
                    <div key={k} className="ee-answer-line h-9 border-b border-dotted border-line-strong" />
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {a.rubric.length ? (
        <section className="mt-6 break-inside-avoid">
          <SectionTitle n={next()}>เกณฑ์การประเมิน</SectionTitle>
          <div className="ee-ws-scroll overflow-x-auto">
            <table className="ee-ws-table w-full min-w-[640px] border-collapse text-[0.9rem]">
              <caption className="sr-only">เกณฑ์การให้คะแนน ระดับ 4 ถึง 1 และคะแนนเต็มของแต่ละหัวข้อ</caption>
              <thead>
                <tr>
                  <th scope="col" className="border border-line-strong bg-panel-2 px-2 py-1.5 text-left font-semibold text-ink-2">
                    หัวข้อการประเมิน
                  </th>
                  {LEVELS.map((l) => (
                    <th key={l.n} scope="col" className="border border-line-strong bg-panel-2 px-2 py-1.5 text-left font-semibold text-ink-2">
                      {l.n} {l.label}
                    </th>
                  ))}
                  <th scope="col" className="w-16 border border-line-strong bg-panel-2 px-2 py-1.5 text-center font-semibold text-ink-2">
                    คะแนนเต็ม
                  </th>
                  <th scope="col" className="w-16 border border-line-strong bg-panel-2 px-2 py-1.5 text-center font-semibold text-ink-2">
                    ได้
                  </th>
                </tr>
              </thead>
              <tbody>
                {a.rubric.map((r, i) => (
                  <tr key={i}>
                    <th scope="row" className="border border-line-strong px-2 py-1.5 text-left align-top font-semibold text-ink">
                      {r.criterion}
                    </th>
                    {r.levels.map((d, k) => (
                      <td key={k} className="border border-line-strong px-2 py-1.5 align-top text-ink-2">
                        {d}
                      </td>
                    ))}
                    <td className="readout border border-line-strong px-2 py-1.5 text-center align-top text-ink">{r.weight}</td>
                    <td className="border border-line-strong px-2 py-1.5" />
                  </tr>
                ))}
                <tr>
                  <th scope="row" colSpan={5} className="border border-line-strong px-2 py-1.5 text-right font-semibold text-ink">
                    รวม
                  </th>
                  <td className="readout border border-line-strong px-2 py-1.5 text-center font-semibold text-ink">{total}</td>
                  <td className="border border-line-strong px-2 py-1.5" />
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[0.88rem] text-ink-3">คะแนนแต่ละหัวข้อ = คะแนนเต็ม × ระดับที่ได้ ÷ 4</p>
        </section>
      ) : null}

      <footer className="ee-ws-keep mt-8 grid gap-6 sm:grid-cols-2">
        <Blank label="ลงชื่อผู้เรียน" />
        <Blank label="ลงชื่อครูผู้สอน" />
      </footer>
    </article>
  );
}
