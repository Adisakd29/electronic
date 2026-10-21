import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { Badge, DataTable, EmptyState, LinkButton, PageHeader, Panel, PanelHeader, Td, Th } from "@/components/ui";
import { ClassBar, NoClass, PageSkeleton, teacherPage, WeekFilter, type SP } from "@/components/staff/context";
import { bloomLabel, pct, plain } from "@/components/staff/format";
import { itemAnalysis } from "@/server/core/staff";
import { weekTitle } from "@/server/content";

export const metadata: Metadata = { title: "คำถามที่นักเรียนตอบผิดบ่อย" };

export default function ItemsPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

const clip = (s: string, n = 140) => plain(s, n);

async function Body({ searchParams }: { searchParams: SP }) {
  const { me, classes, current, one } = await teacherPage(searchParams);
  if (!current) return (<><PageHeader title="คำถามที่นักเรียนตอบผิดบ่อย" /><NoClass isAdmin={me.role === "admin"} /></>);
  const week = Math.min(18, Math.max(1, Number(one("week") ?? 1) || 1));
  const a = await itemAnalysis(db, current.id, week);
  const asked = a.questions.filter((q) => q.attempts > 0);
  const tried = a.interactions.filter((i) => i.attempts > 0);
  return (
    <>
      <PageHeader
        title="คำถามที่นักเรียนตอบผิดบ่อย"
        description={`สัปดาห์ที่ ${week}: ${weekTitle(week)} — เรียงจากข้อที่ยากที่สุด`}
        actions={<LinkButton variant="secondary" prefetch={false} href={`/api/export/items?class=${current.id}&format=xlsx`}>ส่งออก Excel (ทุกสัปดาห์)</LinkButton>}
      />
      <ClassBar classes={classes} current={current}>
        <WeekFilter classId={current.id} week={week} />
      </ClassBar>
      <div className="space-y-6">
        <Panel>
          <PanelHeader title="ข้อสอบ" description="% ตอบถูก จากทุกครั้งที่นักเรียนในห้องตอบข้อนั้น (ก่อนเรียน หลังเรียน และภารกิจท้าทาย)" />
          <div className="p-4">
            {asked.length === 0 ? <EmptyState title="ยังไม่มีนักเรียนทำแบบทดสอบสัปดาห์นี้" /> : (
              <DataTable caption="สถิติรายข้อ">
                <thead><tr><Th>รหัส</Th><Th>โจทย์</Th><Th>ระดับ</Th><Th>ตอบ (ครั้ง)</Th><Th>% ถูก</Th><Th>คำตอบผิดที่พบบ่อย</Th></tr></thead>
                <tbody>
                  {asked.map((q) => (
                    <tr key={q.id}>
                      <Td className="readout whitespace-nowrap">{q.id}{!q.active ? <Badge className="ml-1">ปิดใช้</Badge> : null}</Td>
                      <Td className="max-w-md">{clip(q.stem)}</Td>
                      <Td>{bloomLabel[q.bloom]}</Td>
                      <Td>{q.attempts}</Td>
                      <Td><Badge tone={(q.percentCorrect ?? 0) < 50 ? "danger" : (q.percentCorrect ?? 0) < 70 ? "warn" : "ok"}>{pct(q.percentCorrect)}</Badge></Td>
                      <Td>{q.commonWrong ? `${clip(q.commonWrong, 80)} (${q.commonWrongCount})` : "–"}</Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="กิจกรรมโต้ตอบในบทเรียน" description="% ของครั้งที่ตรวจคำตอบแล้วผิด และคำตอบผิดล่าสุด" />
          <div className="p-4">
            {tried.length === 0 ? <EmptyState title="ยังไม่มีนักเรียนทำกิจกรรมสัปดาห์นี้" /> : (
              <DataTable caption="สถิติกิจกรรมโต้ตอบ">
                <thead><tr><Th>รหัส</Th><Th>คำสั่ง</Th><Th>นักเรียน</Th><Th>% ผิด</Th><Th>ถูกตั้งแต่ครั้งแรก</Th><Th>คำตอบผิดล่าสุด</Th></tr></thead>
                <tbody>
                  {tried.map((i) => (
                    <tr key={i.id}>
                      <Td className="readout whitespace-nowrap">{i.id}</Td>
                      <Td className="max-w-md">{clip(i.prompt)}</Td>
                      <Td>{i.learners}</Td>
                      <Td><Badge tone={(i.percentWrong ?? 0) > 50 ? "danger" : (i.percentWrong ?? 0) > 30 ? "warn" : "ok"}>{pct(i.percentWrong)}</Badge></Td>
                      <Td>{pct(i.firstTryRate)}</Td>
                      <Td className="readout">{i.lastWrong.join(" · ") || "–"}</Td>
                    </tr>
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
