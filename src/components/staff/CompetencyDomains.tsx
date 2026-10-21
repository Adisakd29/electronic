/**
 * "สมรรถนะ 4 ด้าน" panel — server-safe (no hooks). Used by the student dashboard
 * and the teacher's student detail page. Simulation evidence and teacher-recorded
 * practice results are rendered in two clearly labelled groups; bars always carry
 * a text percentage (never colour-only).
 */
import { FlaskConical, ClipboardCheck, AlertTriangle } from "lucide-react";
import { course } from "@/content/course";
import { BELOW_LABEL, DOMAINS, PASS_PERCENT, belowThreshold, type CompetencyProfile, type DomainKey } from "@/lib/competency-domains";
import { Panel } from "@/components/ui";
import { cn } from "@/lib/cn";
import { levelLabel } from "./format";

const fmt = (v: number | null) => (v == null ? "ยังไม่มีข้อมูล" : `${Math.round(v)} %`);

export function DomainBar({ label, percent, evidence, hint }: { label: string; percent: number | null; evidence?: number; hint?: string }) {
  const below = belowThreshold(percent);
  const v = percent == null ? 0 : Math.max(0, Math.min(100, percent));
  return (
    <li className="py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-medium text-ink">{label}</span>
        <span className={cn("readout text-[0.95rem] font-semibold", percent == null ? "font-normal text-ink-3" : below ? "text-danger" : "text-ink")}>
          {fmt(percent)}
          {below ? <span className="ml-2 rounded-sm bg-danger/10 px-1.5 py-0.5 text-[0.8rem] font-semibold">{BELOW_LABEL}</span> : null}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label} ${fmt(percent)}${below ? ` ${BELOW_LABEL}` : ""}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent == null ? undefined : Math.round(percent)}
        aria-valuetext={fmt(percent)}
        className="relative mt-1 h-2.5 w-full overflow-hidden rounded-full bg-panel-2"
      >
        {percent != null ? <div className={cn("h-full rounded-full", below ? "bg-danger" : "bg-cobalt")} style={{ width: `${Math.max(1, v)}%` }} /> : null}
        <span aria-hidden className="absolute inset-y-0 w-px bg-ink-3/70" style={{ left: `${PASS_PERCENT}%` }} />
      </div>
      <p className="mt-0.5 text-[0.85rem] text-ink-3">
        {hint ? `${hint} · ` : ""}
        {evidence != null ? `หลักฐาน ${evidence} รายการ` : null}
      </p>
    </li>
  );
}

export function CompetencyDomainsPanel({
  profile,
  title = "สมรรถนะ 4 ด้าน",
  showGaps = false,
  id = "comp-h",
}: {
  profile: CompetencyProfile;
  title?: string;
  /** Teacher view: list domains and objectives below the threshold. */
  showGaps?: boolean;
  id?: string;
}) {
  const sim = profile.simulation;
  const pr = profile.practical;
  return (
    <Panel aria-labelledby={id}>
      <div className="border-b border-line px-5 py-4">
        <h2 id={id} className="text-[1.1rem] font-semibold text-ink">
          {title}
        </h2>
        <p className="text-[0.92rem] text-ink-3">
          มุมมองเพิ่มเติมจากสมรรถนะรายวิชา C1–C4: คำนวณจากหลักฐานการเรียน เกณฑ์ผ่าน {PASS_PERCENT} % · เส้นบนแท่งคือเกณฑ์ {PASS_PERCENT} %
        </p>
      </div>
      <div className="grid gap-6 px-5 py-4 lg:grid-cols-2">
        <section aria-labelledby={`${id}-sim`}>
          <h3 id={`${id}-sim`} className="flex items-center gap-2 font-semibold text-ink">
            <FlaskConical className="size-5 text-cobalt" aria-hidden />
            จากกิจกรรมและห้องทดลองเสมือน
          </h3>
          <p className="text-[0.88rem] text-ink-3">หลักฐานอัตโนมัติ (แบบฝึก ห้องทดลองเสมือน แบบทดสอบ) ไม่ใช่ผลการปฏิบัติจริง</p>
          <ul className="mt-1 divide-y divide-line">
            {DOMAINS.map((d) => (
              <DomainBar key={d.key} label={`ด้านที่ ${d.no} ${d.title}`} percent={sim[d.key].percent} evidence={sim[d.key].evidence} />
            ))}
          </ul>
        </section>
        <section aria-labelledby={`${id}-prac`}>
          <h3 id={`${id}-prac`} className="flex items-center gap-2 font-semibold text-ink">
            <ClipboardCheck className="size-5 text-copper" aria-hidden />
            ผลปฏิบัติจริงที่ครูบันทึก
          </h3>
          <p className="text-[0.88rem] text-ink-3">ครูประเมินจากการปฏิบัติงานจริงในโรงฝึกงานและใบงาน</p>
          <ul className="mt-1 divide-y divide-line">
            <DomainBar label="ด้านที่ 4 ความปลอดภัย — ใบงานเกณฑ์ความปลอดภัย (ครูประเมิน)" percent={pr.rubricPercent} evidence={pr.rubricEvidence} hint="ปฏิบัติจริง (ครูประเมิน)" />
          </ul>
          <table className="mt-3 w-full text-[0.95rem]">
            <caption className="sr-only">สมรรถนะรายวิชา C1–C4 และการประเมินปลายภาค</caption>
            <thead>
              <tr className="text-left text-[0.88rem] text-ink-3">
                <th scope="col" className="py-1 pr-2 font-medium">สมรรถนะรายวิชา</th>
                <th scope="col" className="py-1 pr-2 font-medium">ระดับ</th>
                <th scope="col" className="py-1 font-medium">ผล</th>
              </tr>
            </thead>
            <tbody>
              {pr.competencies.map((c) => (
                <tr key={c.competency} className="border-t border-line align-top">
                  <th scope="row" className="py-1.5 pr-2 text-left font-normal text-ink-2">
                    <span className="font-semibold text-ink">C{c.competency}</span> {course.competencies[c.competency - 1]?.text}
                  </th>
                  <td className="readout py-1.5 pr-2 whitespace-nowrap">{c.level == null ? "–" : `${c.level} (${levelLabel[c.level]})`}</td>
                  <td className="py-1.5 whitespace-nowrap">{c.passed == null ? <span className="text-ink-3">ยังไม่ประเมิน</span> : c.passed ? <span className="font-semibold text-ok">ผ่าน</span> : <span className="font-semibold text-danger">ไม่ผ่าน</span>}</td>
                </tr>
              ))}
              <tr className="border-t border-line">
                <th scope="row" className="py-1.5 pr-2 text-left font-semibold text-ink">ประเมินสมรรถนะปลายภาค</th>
                <td className="readout py-1.5 pr-2 whitespace-nowrap">{pr.final ? `${pr.final.level} (${levelLabel[pr.final.level]})${pr.final.score != null ? ` · ${pr.final.score}/${pr.final.maxScore ?? "–"}` : ""}` : "–"}</td>
                <td className="py-1.5 whitespace-nowrap">{pr.final ? (pr.final.passed ? <span className="font-semibold text-ok">ผ่าน</span> : <span className="font-semibold text-danger">ไม่ผ่าน</span>) : <span className="text-ink-3">ยังไม่ประเมิน</span>}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
      {showGaps ? <GapList profile={profile} /> : null}
    </Panel>
  );
}

export function GapList({ profile }: { profile: CompetencyProfile }) {
  const names = new Map<DomainKey, string>(DOMAINS.map((d) => [d.key, `ด้านที่ ${d.no} ${d.title}`]));
  const { domains, objectives } = profile.gaps;
  return (
    <section aria-labelledby="gap-h" className="border-t border-line px-5 py-4">
      <h3 id="gap-h" className="flex items-center gap-2 font-semibold text-ink">
        <AlertTriangle className="size-5 text-warn" aria-hidden />
        ทักษะที่ยังไม่ผ่านเกณฑ์
      </h3>
      {domains.length === 0 && objectives.length === 0 ? (
        <p className="mt-1 text-ink-2">ยังไม่พบด้านหรือจุดประสงค์ที่ต่ำกว่าเกณฑ์จากหลักฐานที่มี</p>
      ) : (
        <div className="mt-2 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-[0.9rem] text-ink-3">ด้านที่ต่ำกว่า {PASS_PERCENT} % (จากกิจกรรมและห้องทดลองเสมือน)</p>
            {domains.length ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-2">
                {domains.map((k) => (
                  <li key={k}>
                    {names.get(k)} — <span className="readout">{Math.round(profile.simulation[k].percent ?? 0)} %</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-ink-2">ไม่มี</p>
            )}
          </div>
          <div>
            <p className="text-[0.9rem] text-ink-3">จุดประสงค์ที่ตอบผิดตั้งแต่ 2 ครั้งและยังไม่เคยตอบถูก</p>
            {objectives.length ? (
              <ul className="mt-1 space-y-1.5">
                {objectives.map((o) => (
                  <li key={`${o.week}-${o.objectiveId}`} className="rounded-sm border border-line px-3 py-2">
                    <p className="text-[0.88rem] text-ink-3">
                      สัปดาห์ที่ {o.week} · <span className="readout">{o.objectiveId}</span> · กิจกรรม {o.interactionIds.join(", ")}
                    </p>
                    <p className="text-ink">{o.text}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-ink-2">ไม่มี</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
