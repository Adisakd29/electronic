import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { Badge, DataTable, EmptyState, LinkButton, PageHeader, Td, Th } from "@/components/ui";
import { PageSkeleton, spGetter, type SP } from "@/components/staff/context";
import { bloomLabel, plain } from "@/components/staff/format";
import { requireUser } from "@/server/auth";
import { questionList } from "@/server/core/staff";
import { weekContent } from "@/server/content";

export const metadata: Metadata = { title: "คลังข้อสอบ" };

export default function QuestionsPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

const TYPE: Record<string, string> = { mcq: "เลือกตอบ", tf: "ถูก/ผิด", numeric: "ตัวเลข" };

async function Body({ searchParams }: { searchParams: SP }) {
  await requireUser(["teacher", "admin"]);
  const one = spGetter(await searchParams);
  const wq = Number(one("week"));
  const week = Number.isInteger(wq) && wq >= 1 && wq <= 18 ? wq : 1;
  const status = (["active", "inactive", "all"].includes(one("status") ?? "") ? one("status") : "all") as "active" | "inactive" | "all";
  const r = await questionList(db, { week, q: one("q")?.slice(0, 80) ?? null, bloom: one("bloom"), status });
  const content = weekContent(week);
  return (
    <>
      <PageHeader
        title="คลังข้อสอบ"
        description={`สัปดาห์ที่ ${week}: ใช้งาน ${r.activeByWeek[week] ?? 0} ข้อ · สุ่มครั้งละ ${content?.quiz.drawCount ?? "–"} ข้อ · ผ่านที่ ${content?.quiz.passPercent ?? 60} %`}
        actions={<LinkButton href={`/teacher/questions/new?week=${week}`}>เพิ่มข้อสอบ</LinkButton>}
      />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2 rounded-md border border-line bg-panel px-4 py-3">
        <label className="space-y-1"><span className="block text-[0.9rem] text-ink-3">สัปดาห์</span>
          <select name="week" defaultValue={week} className="h-10 rounded-sm border border-line-strong bg-panel px-2">{Array.from({ length: 18 }, (_, i) => <option key={i + 1} value={i + 1}>สัปดาห์ที่ {i + 1} ({r.activeByWeek[i + 1] ?? 0})</option>)}</select>
        </label>
        <label className="space-y-1"><span className="block text-[0.9rem] text-ink-3">ระดับ</span>
          <select name="bloom" defaultValue={one("bloom") ?? ""} className="h-10 rounded-sm border border-line-strong bg-panel px-2"><option value="">ทั้งหมด</option>{Object.entries(bloomLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <label className="space-y-1"><span className="block text-[0.9rem] text-ink-3">สถานะ</span>
          <select name="status" defaultValue={status} className="h-10 rounded-sm border border-line-strong bg-panel px-2"><option value="all">ทั้งหมด</option><option value="active">ใช้งาน</option><option value="inactive">ปิดใช้</option></select>
        </label>
        <label className="space-y-1"><span className="block text-[0.9rem] text-ink-3">ค้นหา</span>
          <input name="q" defaultValue={one("q") ?? ""} className="h-10 rounded-sm border border-line-strong bg-panel px-3" placeholder="คำในโจทย์ หรือรหัส" />
        </label>
        <button type="submit" className="h-10 rounded-sm border border-line-strong px-3 font-semibold hover:bg-panel-2">กรอง</button>
      </form>
      {r.rows.length === 0 ? (
        <EmptyState title="ไม่พบข้อสอบตามเงื่อนไข" action={<LinkButton href={`/teacher/questions/new?week=${week}`}>เพิ่มข้อสอบ</LinkButton>}>
          ถ้าสัปดาห์นี้ยังไม่มีข้อสอบเลย ให้ผู้ดูแลระบบรัน <code>npm run db:seed</code> หลังจากเนื้อหาสัปดาห์นั้นเสร็จ
        </EmptyState>
      ) : (
        <DataTable caption="รายการข้อสอบ">
          <thead><tr><Th>รหัส</Th><Th>โจทย์</Th><Th>ชนิด</Th><Th>ระดับ</Th><Th>สถานะ</Th><Th></Th></tr></thead>
          <tbody>
            {r.rows.map((q) => (
              <tr key={q.id}>
                <Td className="readout whitespace-nowrap">{q.id}</Td>
                <Td className="max-w-xl">{plain(q.stem, 160)}</Td>
                <Td>{TYPE[q.type]}</Td>
                <Td>{bloomLabel[q.bloom]}</Td>
                <Td className="space-x-1 whitespace-nowrap">
                  {q.active ? <Badge tone="ok">ใช้งาน</Badge> : <Badge>ปิดใช้</Badge>}
                  {q.source === "teacher" ? <Badge tone="cobalt">ครูเพิ่ม</Badge> : q.editedAt ? <Badge tone="copper">แก้ไขแล้ว</Badge> : null}
                </Td>
                <Td><Link className="font-semibold text-cobalt hover:underline" href={`/teacher/questions/${encodeURIComponent(q.id)}`}>แก้ไข</Link></Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
