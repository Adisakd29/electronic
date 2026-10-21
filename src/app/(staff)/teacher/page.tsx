import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { Badge, DataTable, EmptyState, PageHeader, Panel, PanelHeader, Stat, Td, Th } from "@/components/ui";
import { BarChart } from "@/components/staff/BarChart";
import { ClassBar, NoClass, PageSkeleton, teacherPage, type SP } from "@/components/staff/context";
import { pct } from "@/components/staff/format";
import { PASS_PERCENT } from "@/lib/competency-domains";
import { classOverview } from "@/server/core/staff";

export const metadata: Metadata = { title: "ภาพรวมห้องเรียน" };

export default function TeacherHome({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({ searchParams }: { searchParams: SP }) {
  const { me, classes, current } = await teacherPage(searchParams);
  if (!current) return (<><PageHeader title="ภาพรวมห้องเรียน" /><NoClass isAdmin={me.role === "admin"} /></>);
  await connection();
  const o = await classOverview(db, current.id, new Date());
  const q = `?class=${current.id}`;
  return (
    <>
      <PageHeader title="ภาพรวมห้องเรียน" description="ความก้าวหน้าของนักเรียนแต่ละสัปดาห์และนักเรียนที่ควรติดตาม" />
      <ClassBar classes={classes} current={current} />
      {o.students.length === 0 ? (
        <EmptyState title="ห้องนี้ยังไม่มีนักเรียน" action={<Link className="font-semibold text-cobalt hover:underline" href={`/teacher/class${q}`}>สร้างบัญชีนักเรียน</Link>}>
          สร้างบัญชีนักเรียนแบบหลายคนพร้อมกัน หรือเพิ่มอีเมล Google ของนักเรียนในเมนู “บัญชีนักเรียน”
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="นักเรียน" value={o.students.length} />
            <Stat label="ความก้าวหน้าเฉลี่ย" value={`${o.avgProgress} %`} />
            <Stat label="คะแนนแบบทดสอบเฉลี่ย" value={pct(o.avgQuiz)} hint="ค่าเฉลี่ยของคะแนนสูงสุดแต่ละสัปดาห์" />
            <Stat label="ควรติดตาม" value={o.attention.length} hint="ไม่เข้าเรียน 7 วัน / สอบไม่ผ่าน 2 ครั้ง / ค้างส่งงาน" />
          </div>
          <Panel>
            <PanelHeader title="จำนวนนักเรียนที่เริ่มเรียนและเรียนจบแต่ละสัปดาห์" />
            <div className="px-4 py-4">
              <BarChart
                label="แผนภูมิแท่งจำนวนนักเรียนที่เริ่มเรียนและเรียนจบรายสัปดาห์"
                max={o.students.length}
                series={[
                  { name: "เริ่มเรียน", color: "var(--info)" },
                  { name: "เรียนจบ", color: "var(--ok)" },
                ]}
                data={o.perWeek.map((w) => ({ label: `W${w.week}`, values: [w.started, w.completed] }))}
                unit=" คน"
              />
              <details className="mt-3">
                <summary className="cursor-pointer text-ink-2">ดูเป็นตาราง</summary>
                <DataTable caption="จำนวนนักเรียนรายสัปดาห์">
                  <thead>
                    <tr><Th>สัปดาห์</Th><Th>เริ่มเรียน</Th><Th>เรียนจบ</Th></tr>
                  </thead>
                  <tbody>
                    {o.perWeek.map((w) => (
                      <tr key={w.week}><Td>{w.week}</Td><Td>{w.started}</Td><Td>{w.completed}</Td></tr>
                    ))}
                  </tbody>
                </DataTable>
              </details>
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="สมรรถนะ 4 ด้าน — ค่าเฉลี่ยของห้อง" description={`คำนวณจากกิจกรรมและห้องทดลองเสมือนเท่านั้น (ไม่รวมผลปฏิบัติจริงที่ครูบันทึก) เกณฑ์ ${PASS_PERCENT} %`} />
            <div className="p-4">
              <DataTable caption="ค่าเฉลี่ยสมรรถนะ 4 ด้านของห้อง (จำลอง)">
                <thead><tr><Th>ด้าน</Th><Th>เฉลี่ย (จำลอง)</Th><Th>ต่ำกว่า {PASS_PERCENT} %</Th><Th>มีหลักฐาน</Th></tr></thead>
                <tbody>
                  {o.domains.map((d) => (
                    <tr key={d.key}>
                      <Td>ด้านที่ {d.no} {d.title}</Td>
                      <Td className="readout">{pct(d.mean)}</Td>
                      <Td>{d.below > 0 ? <Badge tone="warn">{d.below} คน</Badge> : <span className="text-ink-3">0 คน</span>}</Td>
                      <Td>{d.withEvidence}/{o.students.length} คน</Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="นักเรียนที่ควรติดตาม" description="คลิกชื่อเพื่อดูรายละเอียดและช่วยเหลือรายบุคคล" />
            <div className="p-4">
              {o.attention.length === 0 ? (
                <p className="text-ink-2">ยังไม่มีนักเรียนที่ต้องติดตามเป็นพิเศษ</p>
              ) : (
                <DataTable caption="นักเรียนที่ควรติดตาม">
                  <thead><tr><Th>ชื่อ</Th><Th>เหตุผล</Th></tr></thead>
                  <tbody>
                    {o.attention.map((a) => (
                      <tr key={a.studentId}>
                        <Td><Link className="font-medium text-cobalt hover:underline" href={`/teacher/students/${a.studentId}${q}`}>{a.name}</Link></Td>
                        <Td><div className="flex flex-wrap gap-1.5">{a.reasons.map((r) => <Badge key={r} tone="warn">{r}</Badge>)}</div></Td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
