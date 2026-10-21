import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { DataTable, EmptyState, PageHeader, Panel, PanelHeader, Td, Th } from "@/components/ui";
import { BarChart } from "@/components/staff/BarChart";
import { ClassBar, NoClass, PageSkeleton, teacherPage, WeekFilter, type SP } from "@/components/staff/context";
import { pct } from "@/components/staff/format";
import { prePost } from "@/server/core/staff";

export const metadata: Metadata = { title: "คะแนนก่อนเรียน–หลังเรียน" };

export default function PrePostPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({ searchParams }: { searchParams: SP }) {
  const { me, classes, current, one } = await teacherPage(searchParams);
  if (!current) return (<><PageHeader title="คะแนนก่อนเรียน–หลังเรียน" /><NoClass isAdmin={me.role === "admin"} /></>);
  const p = await prePost(db, current.id);
  const week = Math.min(18, Math.max(1, Number(one("week") ?? 1) || 1));
  const w = p.weeks[week - 1];
  return (
    <>
      <PageHeader title="คะแนนก่อนเรียน–หลังเรียน" description="ค่าเฉลี่ยของห้อง: แบบทดสอบก่อนเรียน (ครั้งเดียว) เทียบกับคะแนนหลังเรียนสูงสุดของแต่ละคน" />
      <ClassBar classes={classes} current={current} />
      <div className="space-y-6">
        <Panel>
          <PanelHeader title="ค่าเฉลี่ยรายสัปดาห์ (%)" />
          <div className="p-4">
            <BarChart
              label="แผนภูมิคะแนนเฉลี่ยก่อนเรียนและหลังเรียนรายสัปดาห์"
              max={100}
              unit=" %"
              series={[{ name: "ก่อนเรียน", color: "var(--copper)" }, { name: "หลังเรียน (สูงสุด)", color: "var(--cobalt)" }]}
              data={p.weeks.map((x) => ({ label: `W${x.week}`, values: [x.preMean, x.postMean] }))}
            />
            <details className="mt-3">
              <summary className="cursor-pointer text-ink-2">ดูเป็นตาราง</summary>
              <DataTable caption="ค่าเฉลี่ยก่อน–หลังเรียน">
                <thead><tr><Th>สัปดาห์</Th><Th>ก่อนเรียน</Th><Th>(คน)</Th><Th>หลังเรียน</Th><Th>(คน)</Th><Th>ผลต่าง</Th></tr></thead>
                <tbody>
                  {p.weeks.map((x) => (
                    <tr key={x.week}><Td>{x.week}</Td><Td>{pct(x.preMean)}</Td><Td>{x.preN}</Td><Td>{pct(x.postMean)}</Td><Td>{x.postN}</Td><Td>{x.preMean != null && x.postMean != null ? `${Math.round((x.postMean - x.preMean) * 10) / 10}` : "–"}</Td></tr>
                  ))}
                </tbody>
              </DataTable>
            </details>
          </div>
        </Panel>
        <Panel>
          <PanelHeader title={`พัฒนาการรายบุคคล — สัปดาห์ที่ ${week}`} action={<WeekFilter classId={current.id} week={week} />} />
          <div className="p-4">
            {w.perStudent.length === 0 ? <EmptyState title="ห้องนี้ยังไม่มีนักเรียน" /> : (
              <DataTable caption="คะแนนก่อนและหลังเรียนรายบุคคล">
                <thead><tr><Th>เลขประจำตัว</Th><Th>ชื่อ</Th><Th>ก่อนเรียน</Th><Th>หลังเรียน (สูงสุด)</Th><Th>พัฒนาการ</Th></tr></thead>
                <tbody>
                  {w.perStudent.map((s) => (
                    <tr key={s.studentId}><Td className="readout">{s.studentNo ?? "–"}</Td><Td>{s.name}</Td><Td>{pct(s.pre)}</Td><Td>{pct(s.post)}</Td><Td className={s.gain != null && s.gain < 0 ? "text-danger" : ""}>{s.gain != null ? `${s.gain > 0 ? "+" : ""}${s.gain}` : "–"}</Td></tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
