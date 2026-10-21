import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { Badge, DataTable, EmptyState, PageHeader, Panel, PanelHeader, Td, Th } from "@/components/ui";
import { ClassBar, NoClass, PageSkeleton, teacherPage, WeekFilter, type SP } from "@/components/staff/context";
import { fmtDateTime, statusLabel } from "@/components/staff/format";
import { submissionQueue } from "@/server/core/staff";

export const metadata: Metadata = { title: "ใบงานที่ส่ง" };

const STATUSES = ["submitted", "returned", "graded", "missing"] as const;
type Status = (typeof STATUSES)[number];

export default function SubmissionsPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({ searchParams }: { searchParams: SP }) {
  const { me, classes, current, one } = await teacherPage(searchParams);
  if (!current) return (<><PageHeader title="ใบงานที่ส่ง" /><NoClass isAdmin={me.role === "admin"} /></>);
  const wq = Number(one("week"));
  const week = Number.isInteger(wq) && wq >= 1 && wq <= 18 ? wq : null;
  const st = (STATUSES as readonly string[]).includes(one("status") ?? "") ? (one("status") as Status) : "submitted";
  const r = await submissionQueue(db, current.id, week, st);
  const tab = (s: Status) => `/teacher/submissions?class=${current.id}${week ? `&week=${week}` : ""}&status=${s}`;
  return (
    <>
      <PageHeader title="ใบงานที่ส่ง" description="ตรวจใบงานตามเกณฑ์ (rubric) ของเนื้อหา ให้คะแนน เขียนคำแนะนำ หรือส่งกลับให้แก้ไข" />
      <ClassBar classes={classes} current={current}>
        <WeekFilter classId={current.id} week={week} allowAll extra={<input type="hidden" name="status" value={st} />} />
      </ClassBar>
      <nav aria-label="สถานะใบงาน" className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link key={s} href={tab(s)} aria-current={s === st ? "page" : undefined} className={`rounded-sm border px-3 py-1.5 ${s === st ? "border-cobalt bg-cobalt-soft font-semibold text-cobalt-ink" : "border-line bg-panel text-ink-2 hover:bg-panel-2"}`}>
            {statusLabel[s]} ({r.counts[s]})
          </Link>
        ))}
      </nav>
      {st === "missing" ? (
        <Panel>
          <PanelHeader title="ยังไม่ส่ง" description="ใบงานที่ต้องส่งไฟล์ ของสัปดาห์ที่เลือก" />
          <div className="p-4">
            {r.missing.length === 0 ? <EmptyState title="ส่งครบทุกคนแล้ว" /> : (
              <DataTable caption="ใบงานที่ยังไม่ส่ง">
                <thead><tr><Th>สัปดาห์</Th><Th>ใบงาน</Th><Th>นักเรียน</Th></tr></thead>
                <tbody>
                  {r.missing.slice(0, 500).map((m) => (
                    <tr key={`${m.activityId}-${m.student.id}`}><Td>{m.week}</Td><Td>{m.title}</Td><Td><Link className="text-cobalt hover:underline" href={`/teacher/students/${m.student.id}?class=${current.id}`}>{m.student.name}</Link></Td></tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </div>
        </Panel>
      ) : r.items.length === 0 ? (
        <EmptyState title={`ไม่มีใบงานสถานะ “${statusLabel[st]}”`}>{st === "submitted" ? "เมื่อนักเรียนส่งไฟล์ใบงาน รายการจะแสดงที่นี่" : "ลองเลือกสถานะหรือสัปดาห์อื่น"}</EmptyState>
      ) : (
        <DataTable caption="รายการใบงาน">
          <thead><tr><Th>ส่งเมื่อ</Th><Th>สัปดาห์</Th><Th>ใบงาน</Th><Th>นักเรียน</Th><Th>สถานะ</Th><Th>คะแนน</Th><Th></Th></tr></thead>
          <tbody>
            {r.items.map((x) => (
              <tr key={x.id}>
                <Td className="whitespace-nowrap">{fmtDateTime(x.submittedAt)}</Td>
                <Td>{x.week}</Td>
                <Td>{x.title}</Td>
                <Td>{x.student.name}</Td>
                <Td><Badge tone={x.status === "graded" ? "ok" : x.status === "returned" ? "warn" : "info"}>{statusLabel[x.status]}</Badge></Td>
                <Td>{x.score != null ? `${x.score}/${x.maxScore}` : "–"}</Td>
                <Td><Link className="font-semibold text-cobalt hover:underline" href={`/teacher/submissions/${x.id}?class=${current.id}`}>{x.status === "graded" ? "ดู/แก้ไข" : "ตรวจ"}</Link></Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
