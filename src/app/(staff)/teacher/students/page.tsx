import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { Badge, DataTable, EmptyState, PageHeader, ProgressBar, Td, Th } from "@/components/ui";
import { ClassBar, NoClass, PageSkeleton, teacherPage, type SP } from "@/components/staff/context";
import { fmtDateTime, pct } from "@/components/staff/format";
import { classStudentRows } from "@/server/core/staff";

export const metadata: Metadata = { title: "นักเรียน" };

export default function StudentsPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({ searchParams }: { searchParams: SP }) {
  const { me, classes, current, one } = await teacherPage(searchParams);
  if (!current) return (<><PageHeader title="นักเรียน" /><NoClass isAdmin={me.role === "admin"} /></>);
  const { students } = await classStudentRows(db, current.id);
  const q = (one("q") ?? "").toLowerCase();
  const list = q ? students.filter((s) => `${s.name} ${s.username ?? ""} ${s.studentNo ?? ""}`.toLowerCase().includes(q)) : students;
  return (
    <>
      <PageHeader title="นักเรียน" description="ความก้าวหน้ารายบุคคล คลิกชื่อเพื่อดูรายละเอียด ปลดล็อก รีเซ็ตรหัสผ่าน หรือออกเกียรติบัตร" />
      <ClassBar classes={classes} current={current}>
        <form method="get" className="flex gap-2">
          <input type="hidden" name="class" value={current.id} />
          <label htmlFor="q" className="sr-only">ค้นหา</label>
          <input id="q" name="q" defaultValue={one("q") ?? ""} placeholder="ค้นหาชื่อ / เลขประจำตัว" className="h-10 rounded-sm border border-line-strong bg-panel px-3 text-ink" />
          <button className="h-10 rounded-sm border border-line-strong px-3 font-semibold hover:bg-panel-2" type="submit">ค้นหา</button>
        </form>
      </ClassBar>
      {list.length === 0 ? (
        <EmptyState title={q ? "ไม่พบนักเรียนที่ค้นหา" : "ห้องนี้ยังไม่มีนักเรียน"}>{q ? "ลองค้นหาด้วยคำอื่น" : "เพิ่มนักเรียนได้ที่เมนู “บัญชีนักเรียน”"}</EmptyState>
      ) : (
        <DataTable caption="รายชื่อนักเรียนและความก้าวหน้า">
          <thead>
            <tr><Th>เลขประจำตัว</Th><Th>ชื่อ-นามสกุล</Th><Th>สัปดาห์ปัจจุบัน</Th><Th className="min-w-40">ความก้าวหน้า</Th><Th>คะแนนเฉลี่ย</Th><Th>เข้าเรียนล่าสุด</Th></tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <Td className="readout">{s.studentNo ?? "–"}</Td>
                <Td>
                  <Link className="font-medium text-cobalt hover:underline" href={`/teacher/students/${s.id}?class=${current.id}`}>{s.name}</Link>
                  <div className="text-[0.85rem] text-ink-3">{s.username}{s.disabled ? <Badge tone="danger" className="ml-2">ปิดใช้งาน</Badge> : null}</div>
                </Td>
                <Td>{s.currentWeek}</Td>
                <Td>
                  <div className="flex items-center gap-2"><ProgressBar value={s.progress} label={`ความก้าวหน้าของ ${s.name}`} /><span className="readout w-12 text-right">{s.progress}%</span></div>
                  <div className="text-[0.85rem] text-ink-3">จบ {s.weeksCompleted}/18 สัปดาห์</div>
                </Td>
                <Td>{pct(s.avgQuiz)}</Td>
                <Td className="whitespace-nowrap">{fmtDateTime(s.lastActive)}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
