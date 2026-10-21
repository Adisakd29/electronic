import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { DataTable, EmptyState, PageHeader, Panel, PanelHeader, ProgressBar, Td, Th } from "@/components/ui";
import { ClassBar, NoClass, PageSkeleton, teacherPage, WeekFilter, type SP } from "@/components/staff/context";
import { labReport } from "@/server/core/staff";
import { plain } from "@/components/staff/format";
import { weekContent } from "@/server/content";

export const metadata: Metadata = { title: "ผลห้องทดลองเสมือน" };

export default function LabsPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({ searchParams }: { searchParams: SP }) {
  const { me, classes, current, one } = await teacherPage(searchParams);
  if (!current) return (<><PageHeader title="ผลห้องทดลองเสมือน" /><NoClass isAdmin={me.role === "admin"} /></>);
  const week = Math.min(18, Math.max(1, Number(one("week") ?? 1) || 1));
  const r = await labReport(db, current.id, week);
  const lab = weekContent(week)?.lab;
  return (
    <>
      <PageHeader title="ผลห้องทดลองเสมือน (Virtual Lab)" description={`สัปดาห์ที่ ${week}${lab?.title ? `: ${lab.title}` : ""}`} />
      <ClassBar classes={classes} current={current}><WeekFilter classId={current.id} week={week} /></ClassBar>
      {r.tasks.length === 0 ? (
        <EmptyState title="สัปดาห์นี้ยังไม่มีภารกิจห้องทดลอง">เนื้อหาสัปดาห์นี้อาจยังอยู่ระหว่างจัดทำ</EmptyState>
      ) : (
        <div className="space-y-6">
          <Panel>
            <PanelHeader title="อัตราการทำภารกิจสำเร็จ" />
            <div className="p-4">
              <DataTable caption="อัตราสำเร็จรายภารกิจ">
                <thead><tr><Th>ภารกิจ</Th><Th>ชนิด</Th><Th className="min-w-48">สำเร็จ</Th><Th>ลองทำ</Th><Th>เฉลี่ยครั้ง/คน</Th></tr></thead>
                <tbody>
                  {r.tasks.map((t) => (
                    <tr key={t.id}>
                      <Td><span className="readout">{t.id}</span><div className="max-w-md text-[0.9rem] text-ink-3">{plain(t.prompt, 120)}</div></Td>
                      <Td>{t.kind === "numeric" ? "ตัวเลข" : t.kind === "mcq" ? "เลือกตอบ" : "ปฏิบัติในแล็บ"}</Td>
                      <Td><div className="flex items-center gap-2"><ProgressBar value={t.rate} label={`อัตราสำเร็จ ${t.id}`} color="var(--ok)" /><span className="readout w-14 text-right">{t.rate}%</span></div><div className="text-[0.85rem] text-ink-3">{t.done}/{r.students.length} คน</div></Td>
                      <Td>{t.tried}</Td>
                      <Td>{t.avgAttempts ?? "–"}</Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="สถานะรายบุคคล" />
            <div className="p-4">
              <DataTable caption="สถานะภารกิจรายบุคคล">
                <thead><tr><Th>ชื่อ</Th>{r.tasks.map((t) => <Th key={t.id} className="readout text-center">{t.id.split("-").pop()}</Th>)}<Th>รวม</Th><Th>ครั้งที่ลอง</Th></tr></thead>
                <tbody>
                  {r.students.map((s) => (
                    <tr key={s.id}>
                      <Td>{s.name}</Td>
                      {r.tasks.map((t) => (
                        <Td key={t.id} className="text-center">
                          {s.status[t.id] === true ? <span className="text-ok" aria-label="สำเร็จ">✓</span> : s.status[t.id] === false ? <span className="text-warn" aria-label="ลองแล้วยังไม่ถูก">…</span> : <span className="text-ink-3" aria-label="ยังไม่ทำ">–</span>}
                          {s.attemptsByTask[t.id] ? <span className="readout ml-1 text-[0.8rem] text-ink-3" aria-label={`ลอง ${s.attemptsByTask[t.id]} ครั้ง`}>×{s.attemptsByTask[t.id]}</span> : null}
                        </Td>
                      ))}
                      <Td>{s.done}/{s.total}</Td>
                      <Td className="readout">{s.attempts}</Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
              <p className="mt-2 text-[0.9rem] text-ink-3">✓ สำเร็จ · … ลองแล้วยังไม่ถูก · – ยังไม่ทำ · ×n จำนวนครั้งที่กดตรวจภารกิจนั้น</p>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
