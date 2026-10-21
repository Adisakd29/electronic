import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { course } from "@/content/course";
import { db } from "@/lib/db";
import { Badge, DataTable, EmptyState, Input, PageHeader, Panel, PanelHeader, Td, Th } from "@/components/ui";
import { ActionForm } from "@/components/staff/ActionForm";
import { ClassBar, NoClass, PageSkeleton, teacherPage, type SP } from "@/components/staff/context";
import { levelLabel } from "@/components/staff/format";
import { competencyMatrix } from "@/server/core/staff";
import { saveCompetencyAction } from "@/server/actions/teacher";

export const metadata: Metadata = { title: "ประเมินสมรรถนะ" };

const COMPS = [1, 2, 3, 4, 0] as const;
const compName = (c: number) => (c === 0 ? "ประเมินปลายภาค (สัปดาห์ที่ 18)" : `สมรรถนะที่ ${c}`);

export default function CompetencyPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({ searchParams }: { searchParams: SP }) {
  const { me, classes, current, one } = await teacherPage(searchParams);
  if (!current) return (<><PageHeader title="ประเมินสมรรถนะ" /><NoClass isAdmin={me.role === "admin"} /></>);
  const m = await competencyMatrix(db, current.id);
  const selected = m.students.find((s) => s.id === one("student")) ?? null;
  return (
    <>
      <PageHeader title="ประเมินสมรรถนะ" description="บันทึกระดับ 1–4 (ปรับปรุง–ดีมาก) ของสมรรถนะรายวิชา 4 ข้อ และการประเมินภาคปฏิบัติปลายภาค เมื่อผ่านปลายภาคและเรียนจบครบ ระบบออกเกียรติบัตรให้อัตโนมัติ" />
      <ClassBar classes={classes} current={current} />
      <details className="mb-4 rounded-md border border-line bg-panel px-4 py-3">
        <summary className="cursor-pointer font-semibold">สมรรถนะรายวิชา</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-6 text-ink-2">{course.competencies.map((c) => <li key={c.no}>{c.text}</li>)}</ol>
      </details>
      {selected ? (
        <Panel className="mb-6">
          <PanelHeader title={`บันทึกผล: ${selected.name}`} action={<Link className="text-cobalt hover:underline" href={`/teacher/competency?class=${current.id}`}>ปิด</Link>} />
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            {COMPS.map((c) => {
              const cur = selected.cells[c];
              return (
                <fieldset key={c} className="rounded-sm border border-line p-3">
                  <legend className="px-1 font-semibold">{compName(c)}</legend>
                  <ActionForm action={saveCompetencyAction} submitLabel="บันทึก" size="sm">
                    <input type="hidden" name="studentId" value={selected.id} />
                    <input type="hidden" name="classroomId" value={current.id} />
                    <input type="hidden" name="competency" value={c} />
                    <div className="grid grid-cols-3 gap-2">
                      <label className="space-y-1"><span className="block text-[0.88rem] text-ink-3">ระดับ</span>
                        <select name="level" defaultValue={cur?.level ?? 3} className="h-11 w-full rounded-sm border border-line-strong bg-panel px-2">
                          {[4, 3, 2, 1].map((l) => <option key={l} value={l}>{l} {levelLabel[l]}</option>)}
                        </select>
                      </label>
                      <label className="space-y-1"><span className="block text-[0.88rem] text-ink-3">คะแนน</span><Input name="score" type="number" step="0.5" min={0} defaultValue={cur?.score ?? ""} /></label>
                      <label className="space-y-1"><span className="block text-[0.88rem] text-ink-3">เต็ม</span><Input name="maxScore" type="number" step="0.5" min={0} defaultValue={cur?.maxScore ?? (c === 0 ? 100 : "")} /></label>
                    </div>
                    <label className="flex items-center gap-2"><input type="checkbox" name="passed" defaultChecked={cur?.passed ?? false} /> ผ่านเกณฑ์</label>
                    <Input name="note" maxLength={1000} placeholder="บันทึกเพิ่มเติม (ไม่บังคับ)" defaultValue={cur?.note ?? ""} aria-label="บันทึกเพิ่มเติม" />
                  </ActionForm>
                </fieldset>
              );
            })}
          </div>
        </Panel>
      ) : null}
      {m.students.length === 0 ? <EmptyState title="ห้องนี้ยังไม่มีนักเรียน" /> : (
        <DataTable caption="ตารางผลประเมินสมรรถนะ">
          <thead><tr><Th>นักเรียน</Th>{COMPS.map((c) => <Th key={c}>{c === 0 ? "ปลายภาค" : `สมรรถนะ ${c}`}</Th>)}<Th></Th></tr></thead>
          <tbody>
            {m.students.map((s) => (
              <tr key={s.id}>
                <Td>{s.name}<div className="readout text-[0.85rem] text-ink-3">{s.studentNo ?? ""}</div></Td>
                {COMPS.map((c) => {
                  const v = s.cells[c];
                  return <Td key={c}>{v ? <Badge tone={v.passed ? "ok" : "warn"}>{v.level} {levelLabel[v.level]}{v.passed ? "" : " · ไม่ผ่าน"}</Badge> : <span className="text-ink-3">–</span>}</Td>;
                })}
                <Td><Link className="font-semibold text-cobalt hover:underline" href={`/teacher/competency?class=${current.id}&student=${s.id}`}>บันทึกผล</Link></Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
